import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { getPrismaErrorCode } from '../utils/prisma-error';
import {
  applyModerationInTransaction,
  getOpportunityContentHash,
} from './opportunities.helpers';
import { PRISMA_ERROR_CODE } from '../constants/prisma';
import { persistOpportunityApplication } from './opportunity-application.persistence';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  ApplyOpportunityDto,
  ModerateOpportunityDto,
  FindOpportunitiesDto,
} from './dto';
import {
  Opportunity,
  OpportunityApplication,
  OpportunityLifecycleState,
  OpportunityStatus,
  ApplicationStatus,
  Prisma,
  Role,
} from '@universe/database';
import {
  MAX_APPLICATION_WITHDRAWALS,
  OPPORTUNITY_MODERATE_ACTION,
  OPPORTUNITY_VIEW,
  OPPORTUNITY_VIEW_PARAM,
  OPPORTUNITY_ERROR,
} from '@universe/core/constants/opportunities';
import { OPPORTUNITIES_ROUTE } from '@universe/core/constants/routes';
import {
  hasOpportunityContentChanged,
  hasReachedApplicationWithdrawalLimit,
  isWithdrawableApplicationStatus,
  isRecruitmentPhase,
} from '@universe/core/utils/opportunities';
import {
  NOTIFICATION_TYPE,
  OPPORTUNITY_NOTIFICATION_KEY,
} from '@universe/core/constants/notifications';

const OPPORTUNITY_INCLUDE = {
  owner: { select: { id: true, name: true, email: true } },
} satisfies Prisma.OpportunityInclude;

export type OpportunityWithOwner = Prisma.OpportunityGetPayload<{
  include: typeof OPPORTUNITY_INCLUDE;
}> & {
  canResubmit?: boolean;
};

export type ApplicationWithApplicant = OpportunityApplication & {
  applicant: { name: string | null; email: string };
};

export type ApplicationWithOpportunity = OpportunityApplication & {
  opportunity: OpportunityWithOwner;
  applicant: ApplicationWithApplicant['applicant'];
};

export type UpdateApplicationStatusParams = {
  userId: string;
  applicationId: string;
  status: ApplicationStatus;
  ownerComment?: string;
};

const RECRUITING_LIFECYCLE_STATES: OpportunityLifecycleState[] = [
  OpportunityLifecycleState.START,
  OpportunityLifecycleState.ACTIVE,
];

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async notifyModerators(
    opportunityId: string,
    opportunityTitle: string,
  ): Promise<void> {
    try {
      const moderators = await this.prisma.user.findMany({
        where: { roles: { has: Role.OPPORTUNITIES_MODERATOR } },
        select: { id: true },
      });

      const deliveries = await Promise.allSettled(
        moderators.map((moderator) =>
          this.notificationsService.createNotification({
            userId: moderator.id,
            type: NOTIFICATION_TYPE.OPPORTUNITY_READY_FOR_REVIEW,
            title: OPPORTUNITY_NOTIFICATION_KEY.READY_FOR_REVIEW_TITLE,
            message: JSON.stringify({
              opportunityTitle,
            }),
            link: `${OPPORTUNITIES_ROUTE}/${opportunityId}`,
          }),
        ),
      );

      for (const [index, delivery] of deliveries.entries()) {
        if (delivery.status === 'rejected') {
          this.logger.error(
            `Failed to deliver moderation notification for opportunity ${opportunityId} to moderator ${moderators[index].id}`,
            delivery.reason instanceof Error
              ? delivery.reason.stack
              : delivery.reason,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to deliver moderation notifications for opportunity ${opportunityId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Create a new opportunity as a draft
   */
  async create(
    userId: string,
    dto: CreateOpportunityDto,
  ): Promise<Opportunity> {
    const acceptsApplications = isRecruitmentPhase(dto.lifecycleState)
      ? dto.acceptsApplications
      : false;

    return this.prisma.opportunity.create({
      data: {
        ...dto,
        ...(acceptsApplications !== undefined ? { acceptsApplications } : {}),
        ownerContactInfo: dto.ownerContactInfo?.trim() ?? '',
        ownerId: userId,
        status: OpportunityStatus.DRAFT,
      },
    });
  }

  /**
   * Find all opportunities matching the query.
   * If user is not moderator, only PUBLISHED opportunities are returned.
   */
  async findAll(
    query: FindOpportunitiesDto,
    userRoles: string[] = [],
  ): Promise<OpportunityWithOwner[]> {
    const { paymentType, ownerId, search, status, tags, isRecruiting } = query;
    const where: Prisma.OpportunityWhereInput = {};

    const isModerator = Boolean(
      userRoles?.includes(Role.OPPORTUNITIES_MODERATOR),
    );

    if (status && status !== OpportunityStatus.PUBLISHED) {
      if (!isModerator) {
        throw new ForbiddenException(
          'Only OPPORTUNITIES_MODERATOR can view opportunities with status other than PUBLISHED',
        );
      }

      where.status = status;
    } else {
      where.status = OpportunityStatus.PUBLISHED;
    }

    if (paymentType) where.paymentType = paymentType;

    if (ownerId) where.ownerId = ownerId;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tags?.length) where.tags = { hasSome: tags };

    if (isRecruiting) {
      where.acceptsApplications = true;
      where.lifecycleState = { in: RECRUITING_LIFECYCLE_STATES };
    }

    return this.prisma.opportunity.findMany({
      where,
      orderBy:
        where.status === OpportunityStatus.PUBLISHED
          ? [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
          : { createdAt: 'desc' },
      include: OPPORTUNITY_INCLUDE,
    });
  }

  /**
   * Retrieve an opportunity by ID.
   * Ensures that unpublished opportunities are only visible to their owners or moderators/admins.
   */
  async findOne(
    id: string,
    userId?: string,
    userRoles: string[] = [],
  ): Promise<OpportunityWithOwner> {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      include: OPPORTUNITY_INCLUDE,
    });

    if (!opportunity) throw new NotFoundException('Opportunity not found');

    const isModerator = Boolean(
      userRoles?.includes(Role.OPPORTUNITIES_MODERATOR),
    );

    if (
      opportunity.status !== OpportunityStatus.PUBLISHED &&
      opportunity.ownerId !== userId &&
      !isModerator
    ) {
      throw new NotFoundException('Opportunity not found');
    }

    if (opportunity.status === OpportunityStatus.REQUIRES_CHANGES) {
      return {
        ...opportunity,
        canResubmit:
          Boolean(opportunity.moderationContentHash) &&
          opportunity.moderationContentHash !==
            getOpportunityContentHash(opportunity),
      };
    }

    return opportunity;
  }

  /**
   * Update an existing opportunity.
   * If it was already published, it is reverted to READY_FOR_REVIEW to prevent bypassing moderation.
   */
  async update(
    userId: string,
    id: string,
    dto: UpdateOpportunityDto,
  ): Promise<Opportunity> {
    const opportunity = await this.findOne(id, userId);

    if (opportunity.ownerId !== userId) {
      throw new ForbiddenException(
        'You can only update your own opportunities',
      );
    }

    const hasContentChanges = hasOpportunityContentChanged(opportunity, dto);

    const data: Prisma.OpportunityUpdateInput = { ...dto };

    const nextLifecycleState = dto.lifecycleState ?? opportunity.lifecycleState;

    if (
      !isRecruitmentPhase(nextLifecycleState) &&
      (dto.lifecycleState !== undefined ||
        dto.acceptsApplications !== undefined)
    ) {
      data.acceptsApplications = false;
    }

    if (dto.ownerContactInfo !== undefined) {
      data.ownerContactInfo = dto.ownerContactInfo.trim();
    }

    if (
      opportunity.status === OpportunityStatus.REQUIRES_CHANGES &&
      !opportunity.moderationContentHash
    ) {
      data.moderationContentHash = getOpportunityContentHash(opportunity);
    }

    if (
      opportunity.status === OpportunityStatus.PUBLISHED &&
      hasContentChanges
    ) {
      data.status = OpportunityStatus.READY_FOR_REVIEW;
      data.moderationComment = null;
    }

    let updated;

    try {
      updated = await this.prisma.opportunity.update({
        where: {
          id,
          status: opportunity.status,
          updatedAt: opportunity.updatedAt,
        },
        data,
      });
    } catch (error) {
      if (getPrismaErrorCode(error) === PRISMA_ERROR_CODE.RECORD_NOT_FOUND) {
        throw new ConflictException(OPPORTUNITY_ERROR.CHANGES_REQUIRED);
      }

      throw error;
    }

    if (
      opportunity.status === OpportunityStatus.PUBLISHED &&
      hasContentChanges
    ) {
      await this.notifyModerators(id, updated.title);
    }

    return updated;
  }

  /**
   * Delete a draft opportunity.
   * Only the owner can delete, and only if the opportunity is in DRAFT status.
   */
  async delete(userId: string, id: string): Promise<Opportunity> {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
    });

    if (opportunity?.ownerId !== userId) {
      throw new NotFoundException('Opportunity not found');
    }

    if (opportunity.status !== OpportunityStatus.DRAFT) {
      throw new BadRequestException(
        'Only opportunities in DRAFT status can be deleted',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.opportunityApplication.deleteMany({
          where: { opportunityId: id },
        });

        return await tx.opportunity.delete({
          where: {
            id,
            ownerId: userId,
            status: OpportunityStatus.DRAFT,
          },
        });
      });
    } catch (error) {
      if (getPrismaErrorCode(error) === 'P2025') {
        throw new BadRequestException(
          'Only opportunities in DRAFT status can be deleted',
        );
      }

      throw error;
    }
  }

  /**
   * Submit an opportunity for moderation.
   */
  async changeStatus(
    userId: string,
    id: string,
    status: OpportunityStatus,
  ): Promise<Opportunity> {
    const opportunity = await this.findOne(id, userId);

    if (opportunity.ownerId !== userId)
      throw new ForbiddenException('Not your opportunity');

    if (status !== OpportunityStatus.READY_FOR_REVIEW) {
      throw new BadRequestException(
        'Can only change status to READY_FOR_REVIEW',
      );
    }

    if (
      opportunity.status !== OpportunityStatus.DRAFT &&
      opportunity.status !== OpportunityStatus.REQUIRES_CHANGES
    ) {
      throw new BadRequestException(
        'Can only submit for review from DRAFT or REQUIRES_CHANGES status',
      );
    }

    if (
      opportunity.status === OpportunityStatus.REQUIRES_CHANGES &&
      !opportunity.canResubmit
    ) {
      throw new BadRequestException(OPPORTUNITY_ERROR.CHANGES_REQUIRED);
    }

    let updatedOpportunity;

    try {
      updatedOpportunity = await this.prisma.opportunity.update({
        where: {
          id,
          ...(opportunity.status === OpportunityStatus.REQUIRES_CHANGES
            ? { status: opportunity.status, updatedAt: opportunity.updatedAt }
            : {}),
        },
        data: {
          status,
          moderationComment: null,
        },
      });
    } catch (error) {
      if (getPrismaErrorCode(error) === PRISMA_ERROR_CODE.RECORD_NOT_FOUND) {
        throw new ConflictException(OPPORTUNITY_ERROR.CHANGES_REQUIRED);
      }

      throw error;
    }

    await this.notifyModerators(id, updatedOpportunity.title);

    return updatedOpportunity;
  }

  /**
   * Update the lifecycle state of an opportunity (e.g., ACTIVE, CLOSED).
   */
  async changeLifecycleState(
    userId: string,
    id: string,
    lifecycleState: OpportunityLifecycleState,
  ): Promise<Opportunity> {
    const opportunity = await this.findOne(id, userId);

    if (opportunity.ownerId !== userId)
      throw new ForbiddenException('Not your opportunity');

    return this.prisma.opportunity.update({
      where: { id },
      data: {
        lifecycleState,
        ...(!isRecruitmentPhase(lifecycleState)
          ? { acceptsApplications: false }
          : {}),
      },
    });
  }

  /**
   * Retrieve all applications for a specific opportunity.
   */
  async getOpportunityApplications(
    userId: string,
    id: string,
  ): Promise<ApplicationWithApplicant[]> {
    const opportunity = await this.findOne(id, userId);

    if (opportunity.ownerId !== userId)
      throw new ForbiddenException('Only the owner can view applications');

    return this.prisma.opportunityApplication.findMany({
      where: {
        opportunityId: id,
        status: { not: ApplicationStatus.WITHDRAWN },
      },
      include: { applicant: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update the status of an application.
   */
  async updateApplicationStatus({
    userId,
    applicationId,
    status,
    ownerComment,
  }: UpdateApplicationStatusParams): Promise<OpportunityApplication> {
    const app = await this.prisma.opportunityApplication.findUnique({
      where: { id: applicationId },
      include: { opportunity: true },
    });

    if (!app) throw new NotFoundException('Application not found');

    if (app.opportunity.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can manage this');
    }

    if (app.status === ApplicationStatus.WITHDRAWN) {
      throw new BadRequestException('Cannot change a withdrawn application');
    }

    const allowedStatuses: ApplicationStatus[] = [
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.ACCEPTED,
      ApplicationStatus.REJECTED,
    ];

    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException('Invalid target status');
    }

    const updated = await this.prisma.opportunityApplication.update({
      where: { id: applicationId },
      data: { status, ownerComment },
    });

    await this.notificationsService.createNotification({
      userId: app.applicantId,
      type: NOTIFICATION_TYPE.OPPORTUNITY_APPLICATION_STATUS,
      title: OPPORTUNITY_NOTIFICATION_KEY.APPLICATION_STATUS_TITLE,
      message: JSON.stringify({
        opportunityTitle: app.opportunity.title,
        status,
        comment: ownerComment || null,
      }),
      link: `${OPPORTUNITIES_ROUTE}/${app.opportunityId}`,
    });

    return updated;
  }

  /**
   * Apply to an opportunity.
   */
  async apply(
    userId: string,
    id: string,
    dto: ApplyOpportunityDto,
  ): Promise<OpportunityApplication> {
    const opportunity = await this.findOne(id, userId);

    if (opportunity.status !== OpportunityStatus.PUBLISHED) {
      throw new BadRequestException(
        'Cannot apply to an unpublished opportunity',
      );
    }

    if (opportunity.ownerId === userId) {
      throw new ForbiddenException('Cannot apply to your own opportunity');
    }

    if (!RECRUITING_LIFECYCLE_STATES.includes(opportunity.lifecycleState)) {
      throw new BadRequestException(
        'Cannot apply to an opportunity in this phase',
      );
    }

    if (!opportunity.acceptsApplications) {
      throw new BadRequestException(
        'This opportunity is not currently accepting applications',
      );
    }

    const opportunityApplication = await persistOpportunityApplication({
      prisma: this.prisma,
      userId,
      opportunityId: id,
      request: dto,
      ownerId: opportunity.ownerId,
    });

    await this.notificationsService.createNotification({
      userId: opportunity.ownerId,
      type: NOTIFICATION_TYPE.OPPORTUNITY_NEW_APPLICATION,
      title: OPPORTUNITY_NOTIFICATION_KEY.NEW_APPLICATION_TITLE,
      message: JSON.stringify({
        opportunityTitle: opportunity.title,
        applicantName: dto.applicantName,
        applicationId: opportunityApplication.id,
      }),
      link: `${OPPORTUNITIES_ROUTE}/${id}?${OPPORTUNITY_VIEW_PARAM}=${OPPORTUNITY_VIEW.APPLICANTS}`,
    });

    return opportunityApplication;
  }

  /**
   * Withdraw an application.
   */
  async withdrawApplication(
    userId: string,
    applicationId: string,
  ): Promise<OpportunityApplication> {
    const app = await this.prisma.opportunityApplication.findUnique({
      where: { id: applicationId },
      include: { opportunity: true },
    });

    if (!app) throw new NotFoundException('Application not found');

    if (app.applicantId !== userId)
      throw new ForbiddenException('Only the applicant can withdraw');

    if (!isWithdrawableApplicationStatus(app.status))
      throw new BadRequestException('Cannot withdraw completed application');

    if (hasReachedApplicationWithdrawalLimit(app.withdrawalCount))
      throw new BadRequestException(OPPORTUNITY_ERROR.WITHDRAWAL_LIMIT_REACHED);

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const withdrawn = await tx.opportunityApplication.update({
          where: {
            id: applicationId,
            status: {
              in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW],
            },
            withdrawalCount: { lt: MAX_APPLICATION_WITHDRAWALS },
          },
          data: {
            status: ApplicationStatus.WITHDRAWN,
            withdrawalCount: { increment: 1 },
          },
        });

        await tx.notification.deleteMany({
          where: {
            userId: app.opportunity.ownerId,
            type: NOTIFICATION_TYPE.OPPORTUNITY_NEW_APPLICATION,
            link: { contains: app.opportunityId },
            message: { contains: `"applicationId":"${applicationId}"` },
          },
        });

        return withdrawn;
      });

      return updated;
    } catch (error) {
      if (getPrismaErrorCode(error) === PRISMA_ERROR_CODE.RECORD_NOT_FOUND) {
        const current = await this.prisma.opportunityApplication.findUnique({
          where: { id: applicationId },
          select: { withdrawalCount: true },
        });

        if (hasReachedApplicationWithdrawalLimit(current?.withdrawalCount))
          throw new BadRequestException(
            OPPORTUNITY_ERROR.WITHDRAWAL_LIMIT_REACHED,
          );

        throw new BadRequestException('Cannot withdraw completed application');
      }

      throw error;
    }
  }

  /**
   * Retrieve all applications submitted by a user.
   */
  async getMyApplications(
    userId: string,
  ): Promise<ApplicationWithOpportunity[]> {
    return this.prisma.opportunityApplication.findMany({
      where: { applicantId: userId },
      include: {
        applicant: { select: { name: true, email: true } },
        opportunity: { include: OPPORTUNITY_INCLUDE },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieve all opportunities owned by a user.
   */
  async getMyOpportunities(userId: string): Promise<OpportunityWithOwner[]> {
    return this.prisma.opportunity.findMany({
      where: { ownerId: userId },
      include: OPPORTUNITY_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Moderate an opportunity. Enforces real-time role check from the database.
   */
  async moderate(
    userId: string,
    id: string,
    dto: ModerateOpportunityDto,
  ): Promise<Opportunity> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.roles?.includes(Role.OPPORTUNITIES_MODERATOR)) {
      throw new ForbiddenException(
        'Only OPPORTUNITIES_MODERATOR can moderate opportunities',
      );
    }

    const opportunityToModerate = await this.findOne(id, userId, [
      Role.OPPORTUNITIES_MODERATOR,
    ]);

    if (opportunityToModerate.ownerId === userId) {
      throw new ForbiddenException('You cannot moderate your own opportunity');
    }

    if (opportunityToModerate.status !== OpportunityStatus.READY_FOR_REVIEW) {
      throw new BadRequestException(
        'Only opportunities in READY_FOR_REVIEW can be moderated',
      );
    }

    let newStatus: OpportunityStatus;

    if (dto.action === OPPORTUNITY_MODERATE_ACTION.APPROVE) {
      newStatus = OpportunityStatus.PUBLISHED;
    } else if (dto.action === OPPORTUNITY_MODERATE_ACTION.REJECT) {
      if (!dto.comment?.trim()) {
        throw new BadRequestException(
          'Comment is required when rejecting an opportunity',
        );
      }

      newStatus = OpportunityStatus.REJECTED;
    } else if (dto.action === OPPORTUNITY_MODERATE_ACTION.REQUIRE_CHANGES) {
      if (!dto.comment?.trim()) {
        throw new BadRequestException(
          'Comment is required when requesting changes',
        );
      }

      newStatus = OpportunityStatus.REQUIRES_CHANGES;
    } else {
      throw new BadRequestException('Unknown moderation action');
    }

    let opp: Opportunity;

    try {
      opp = await this.prisma.$transaction((tx) =>
        applyModerationInTransaction(tx, {
          id,
          opportunity: opportunityToModerate,
          newStatus,
          dto,
        }),
      );
    } catch (error) {
      if (getPrismaErrorCode(error) === PRISMA_ERROR_CODE.RECORD_NOT_FOUND) {
        throw new ConflictException(
          'Opportunity was modified during moderation. Retry the moderation.',
        );
      }

      throw error;
    }

    await this.notificationsService.createNotification({
      userId: opp.ownerId,
      type: NOTIFICATION_TYPE.OPPORTUNITY_MODERATED,
      title: OPPORTUNITY_NOTIFICATION_KEY.MODERATED_TITLE,
      message: JSON.stringify({
        opportunityTitle: opp.title,
        action: dto.action,
        comment: dto.comment || null,
      }),
      link: `${OPPORTUNITIES_ROUTE}/${opp.id}`,
    });

    return opp;
  }
}
