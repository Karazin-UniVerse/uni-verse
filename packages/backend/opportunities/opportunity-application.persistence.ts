import { ConflictException } from '@nestjs/common';
import {
  ApplicationStatus,
  type OpportunityApplication,
  type Prisma,
} from '@universe/database';
import { OPPORTUNITY_ERROR } from '@universe/core/constants/opportunities';
import { NOTIFICATION_TYPE } from '@universe/core/constants/notifications';
import type { ApplyOpportunityDto } from './dto/apply-opportunity.dto';
import type { PrismaService } from '../prisma/prisma.service';
import { PRISMA_ERROR_CODE } from '../constants/prisma';
import { getPrismaErrorCode } from '../utils/prisma-error';

interface ApplicationWrite {
  prisma: PrismaService;
  userId: string;
  opportunityId: string;
  request: ApplyOpportunityDto;
  ownerId?: string;
}

export async function persistOpportunityApplication({
  prisma,
  userId,
  opportunityId,
  request,
  ownerId,
}: ApplicationWrite): Promise<OpportunityApplication> {
  const existing = await prisma.opportunityApplication.findFirst({
    where: { applicantId: userId, opportunityId },
  });

  if (existing && existing.status !== ApplicationStatus.WITHDRAWN) {
    throw new ConflictException(OPPORTUNITY_ERROR.ALREADY_APPLIED);
  }

  const contactInfo = request.contactInfo?.trim() ?? '';

  const writeApplication = async (
    tx: Prisma.TransactionClient,
  ): Promise<OpportunityApplication> => {
    if (existing) {
      const updated = await tx.opportunityApplication.update({
        where: { id: existing.id, status: ApplicationStatus.WITHDRAWN },
        data: {
          applicantName: request.applicantName,
          contactInfo,
          briefDescription: request.briefDescription ?? null,
          motivation: request.motivation ?? null,
          answers: request.answers ?? null,
          status: ApplicationStatus.SUBMITTED,
          ownerComment: null,
          createdAt: new Date(),
        },
      });

      await tx.notification.deleteMany({
        where: {
          ...(ownerId ? { userId: ownerId } : {}),
          type: NOTIFICATION_TYPE.OPPORTUNITY_NEW_APPLICATION,
          link: { contains: opportunityId },
          message: { contains: `"applicationId":"${existing.id}"` },
        },
      });

      return updated;
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

  try {
    if (existing) {
      return await prisma.$transaction((tx) => writeApplication(tx));
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
