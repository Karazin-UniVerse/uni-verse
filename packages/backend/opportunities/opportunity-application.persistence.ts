import { ConflictException } from '@nestjs/common';
import {
  ApplicationStatus,
  type OpportunityApplication,
  type Prisma,
} from '@universe/database';
import { OPPORTUNITY_ERROR } from '@universe/core/constants/opportunities';
import { normalizeContactPhone } from '@universe/core/utils/contacts';
import type { ApplyOpportunityDto } from './dto/apply-opportunity.dto';
import type { PrismaService } from '../prisma/prisma.service';
import { PRISMA_ERROR_CODE } from '../constants/prisma';
import { getPrismaErrorCode } from '../utils/prisma-error';

interface ApplicationWrite {
  prisma: PrismaService;
  userId: string;
  opportunityId: string;
  request: ApplyOpportunityDto;
}

async function claimPhone(
  tx: Prisma.TransactionClient,
  userId: string,
  phoneNumber: string,
): Promise<void> {
  let claimed;

  try {
    claimed = await tx.userPhone.upsert({
      where: { userId },
      create: { userId, phoneNumber },
      update: {},
      select: { phoneNumber: true },
    });
  } catch (error) {
    if (getPrismaErrorCode(error) === PRISMA_ERROR_CODE.UNIQUE_CONSTRAINT) {
      throw new ConflictException(OPPORTUNITY_ERROR.PHONE_UNAVAILABLE);
    }

    throw error;
  }

  if (claimed.phoneNumber !== phoneNumber) {
    throw new ConflictException(OPPORTUNITY_ERROR.PHONE_ALREADY_SET);
  }
}

export async function persistOpportunityApplication({
  prisma,
  userId,
  opportunityId,
  request,
}: ApplicationWrite): Promise<OpportunityApplication> {
  const existing = await prisma.opportunityApplication.findFirst({
    where: { applicantId: userId, opportunityId },
  });

  if (existing && existing.status !== ApplicationStatus.WITHDRAWN) {
    throw new ConflictException(OPPORTUNITY_ERROR.ALREADY_APPLIED);
  }

  const contactInfo = request.contactInfo?.trim() ?? '';

  const writeApplication = (
    tx: Prisma.TransactionClient,
  ): Promise<OpportunityApplication> => {
    if (existing) {
      return tx.opportunityApplication.update({
        where: { id: existing.id, status: ApplicationStatus.WITHDRAWN },
        data: {
          applicantName: request.applicantName,
          contactInfo,
          briefDescription: request.briefDescription ?? null,
          motivation: request.motivation ?? null,
          answers: request.answers ?? null,
          status: ApplicationStatus.SUBMITTED,
          ownerComment: null,
        },
      });
    }

    return tx.opportunityApplication.create({
      data: {
        ...request,
        contactInfo,
        applicantId: userId,
        opportunityId,
        status: ApplicationStatus.SUBMITTED,
      },
    });
  };
  const phoneNumber = normalizeContactPhone(contactInfo);

  try {
    if (phoneNumber) {
      return await prisma.$transaction(async (tx) => {
        await claimPhone(tx, userId, phoneNumber);

        return writeApplication(tx);
      });
    }

    return await writeApplication(prisma);
  } catch (error) {
    const errorCode = getPrismaErrorCode(error);

    if (existing && errorCode === PRISMA_ERROR_CODE.RECORD_NOT_FOUND) {
      throw new ConflictException('Application is no longer withdrawn');
    }

    if (!existing && errorCode === PRISMA_ERROR_CODE.UNIQUE_CONSTRAINT) {
      throw new ConflictException(OPPORTUNITY_ERROR.ALREADY_APPLIED);
    }

    throw error;
  }
}
