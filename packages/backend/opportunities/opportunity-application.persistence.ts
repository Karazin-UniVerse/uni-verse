import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  ApplicationStatus,
  type OpportunityApplication,
  type Prisma,
} from '@universe/database';
import { OPPORTUNITY_ERROR } from '@universe/core/constants/opportunities';
import {
  hasReachedApplicationReapplyLimit,
  isReapplicableApplicationStatus,
} from '@universe/core/utils/opportunities';
import { NOTIFICATION_TYPE } from '@universe/core/constants/notifications';
import type { ApplyOpportunityDto } from './dto/apply-opportunity.dto';
import { PRISMA_ERROR_CODE } from '../constants/prisma';
import { getPrismaErrorCode } from '../utils/prisma-error';

interface ApplicationWrite {
  tx: Prisma.TransactionClient;
  userId: string;
  opportunityId: string;
  request: ApplyOpportunityDto;
  ownerId?: string;
}

interface ApplicationWriteData extends ApplicationWrite {
  contactInfo: string;
}

async function createApplication({
  tx,
  userId,
  opportunityId,
  request,
  contactInfo,
}: ApplicationWriteData): Promise<OpportunityApplication> {
  try {
    return await tx.opportunityApplication.create({
      data: {
        ...request,
        contactInfo,
        applicantId: userId,
        opportunityId,
        status: ApplicationStatus.SUBMITTED,
      },
    });
  } catch (error) {
    if (getPrismaErrorCode(error) === PRISMA_ERROR_CODE.UNIQUE_CONSTRAINT) {
      throw new ConflictException(OPPORTUNITY_ERROR.ALREADY_APPLIED);
    }

    throw error;
  }
}

async function reapplyApplication(
  { tx, opportunityId, request, contactInfo, ownerId }: ApplicationWriteData,
  existing: OpportunityApplication,
): Promise<OpportunityApplication> {
  try {
    const updated = await tx.opportunityApplication.update({
      where: {
        id: existing.id,
        status: existing.status,
        reapplyCount: existing.reapplyCount,
      },
      data: {
        applicantName: request.applicantName,
        contactInfo,
        briefDescription: request.briefDescription ?? null,
        motivation: request.motivation ?? null,
        answers: request.answers ?? null,
        status: ApplicationStatus.SUBMITTED,
        ownerComment: null,
        reapplyCount: { increment: 1 },
        withdrawnFromStatus: null,
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
  } catch (error) {
    if (getPrismaErrorCode(error) !== PRISMA_ERROR_CODE.RECORD_NOT_FOUND) {
      throw error;
    }

    const current = await tx.opportunityApplication.findUnique({
      where: { id: existing.id },
      select: { reapplyCount: true },
    });

    if (hasReachedApplicationReapplyLimit(current?.reapplyCount)) {
      throw new BadRequestException(OPPORTUNITY_ERROR.REAPPLY_LIMIT_REACHED);
    }

    throw new ConflictException(OPPORTUNITY_ERROR.INVALID_STATUS_TRANSITION);
  }
}

export async function persistOpportunityApplication(
  write: ApplicationWrite,
): Promise<OpportunityApplication> {
  const { tx, userId, opportunityId, request } = write;
  const existing = await tx.opportunityApplication.findFirst({
    where: { applicantId: userId, opportunityId },
  });

  if (existing && !isReapplicableApplicationStatus(existing.status)) {
    throw new ConflictException(OPPORTUNITY_ERROR.ALREADY_APPLIED);
  }

  if (existing && hasReachedApplicationReapplyLimit(existing.reapplyCount)) {
    throw new BadRequestException(OPPORTUNITY_ERROR.REAPPLY_LIMIT_REACHED);
  }

  const applicationWrite = {
    ...write,
    contactInfo: request.contactInfo?.trim() ?? '',
  };

  return existing
    ? reapplyApplication(applicationWrite, existing)
    : createApplication(applicationWrite);
}
