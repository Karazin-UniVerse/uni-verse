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
  buildOpportunityUpdateData,
  getOpportunityContentHash,
  getSubscriberUpdateMeta,
  resolveModerationTargetStatus,
  unavailableOpportunity,
} from './opportunities.helpers';
import type {
  UnavailableOpportunity,
  OpportunityFavoriteState,
} from '@universe/core/types/opportunities';
import { PRISMA_ERROR_CODE } from '../constants/prisma';
import { PROMISE_STATUS } from '@universe/core/constants/promises';
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
  OPPORTUNITY_VIEW,
  OPPORTUNITY_VIEW_PARAM,
  OPPORTUNITY_ERROR,
  OWNER_TRACKED_WITHDRAWAL_STATUSES,
} from '@universe/core/constants/opportunities';
import { OPPORTUNITIES_ROUTE } from '@universe/core/constants/routes';
import {
  hasOpportunityContentChanged,
  canChangeApplicationStatus,
  isOwnerTrackedWithdrawalStatus,
  isWithdrawableApplicationStatus,
  isRecruitmentPhase,
  isUnavailableOpportunity,
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
  applicant: ApplicationWithApplicant['applicant'];
  opportunity?: OpportunityWithOwner | UnavailableOpportunity;
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

function rethrowAsStatusConflict(error: unknown): never {
  if (getPrismaErrorCode(error) === PRISMA_ERROR_CODE.RECORD_NOT_FOUND) {
    throw new ConflictException(OPPORTUNITY_ERROR.INVALID_STATUS_TRANSITION);
  }

  throw error;
}

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Saves a published opportunity for update notifications. */
  async addFavorite(
    userId: string,
    opportunityId: string,
  ): Promise<OpportunityFavoriteState> {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
    });

    if (opportunity?.ownerId === userId) {
      throw new BadRequestException('Cannot save your own opportunity');
    }

    if (opportunity?.status !== OpportunityStatus.PUBLISHED) {
      throw new NotFoundException('Opportunity not found');
    }

    await this.prisma.opportunityFavorite.createMany({
      data: {
        userId,
        opportunityId,
      },
      skipDuplicates: true,
    });

    return { saved: true };
  }

  /** Removes a saved opportunity even after it becomes unavailable. */
  async removeFavorite(
    userId: string,
    opportunityId: string,
  ): Promise<OpportunityFavoriteState> {
    await this.prisma.opportunityFavorite.deleteMany({
      where: { userId, opportunityId },
    });

    return { saved: false };
  }

  /** Lists saved opportunities, with last-published summaries for unavailable entries. */
  async getFavorites(
    userId: string,
    userRoles: string[] = [],
  ): Promise<(OpportunityWithOwner | UnavailableOpportunity)[]> {
    const isModerator =
      userRoles.includes(Role.OPPORTUNITIES_MODERATOR) &&
      (await this.hasCurrentModeratorRole(userId));
    const favorites = await this.prisma.opportunityFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        opportunity: {
          include: OPPORTUNITY_INCLUDE,
        },
      },
    });

    return favorites.map(({ opportunity }) =>
      opportunity.status === OpportunityStatus.PUBLISHED || isModerator
        ? opportunity
        : unavailableOpportunity(opportunity),
    );
  }

  /** Checks the persisted role before exposing unpublished content. */
  private async hasCurrentModeratorRole(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    return user?.roles.includes(Role.OPPORTUNITIES_MODERATOR) ?? false;
  }

  /** Delivers published updates to saved recipients in a single batch insert. */
  private async notifySubscribers(
    opportunity: Opportunity,
    hasLifecycleChanged = false,
  ): Promise<void> {
    if (opportunity.status !== OpportunityStatus.PUBLISHED) {
      return;
    }

    try {
      const favorites = await this.prisma.opportunityFavorite.findMany({
        where: { opportunityId: opportunity.id },
        select: { userId: true },
      });

      if (favorites.length === 0) {
        return;
      }

      const message = JSON.stringify({
        opportunityTitle: opportunity.title,
        ...(hasLifecycleChanged && {
          lifecycleState: opportunity.lifecycleState,
        }),
      });

      await this.notificationsService.createNotifications(
        favorites.map(({ userId }) => ({
          userId,
          type: NOTIFICATION_TYPE.OPPORTUNITY_UPDATED,
          title: OPPORTUNITY_NOTIFICATION_KEY.UPDATED_TITLE,
          message,
          link: `${OPPORTUNITIES_ROUTE}/${opportunity.id}`,
        })),
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify subscribers for opportunity ${opportunity.id}`,
        error,
      );
    }
  }

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
        if (delivery.status === PROMISE_STATUS.REJECTED) {
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
    userId?: string,
    userRoles: string[] = [],
  ): Promise<OpportunityWithOwner[]> {
    const { paymentType, ownerId, search, status, tags, isRecruiting } = query;
    const where: Prisma.OpportunityWhereInput = {};

    if (status && status !== OpportunityStatus.PUBLISHED) {
      if (
        !userId ||
        !userRoles.includes(Role.OPPORTUNITIES_MODERATOR) ||
        !(await this.hasCurrentModeratorRole(userId))
      ) {
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

  private async loadOpportunity(id: string): Promise<OpportunityWithOwner> {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      include: OPPORTUNITY_INCLUDE,
    });

    if (!opportunity) throw new NotFoundException('Opportunity not found');

    return opportunity;
  }

  async findOne(
    id: string,
    userId?: string,
    userRoles: string[] = [],
  ): Promise<OpportunityWithOwner> {
    const opportunity = await this.getDetails(id, userId, userRoles);

    if (isUnavailableOpportunity(opportunity)) {
      throw new NotFoundException('Opportunity not found');
    }

    return opportunity;
  }

  /** Returns full details to authorized viewers and a published summary otherwise. */
  async getDetails(
    id: string,
    userId?: string,
    userRoles: string[] = [],
  ): Promise<OpportunityWithOwner | UnavailableOpportunity> {
    const opportunity = await this.loadOpportunity(id);
    const isUnpublishedForNonOwner =
      opportunity.status !== OpportunityStatus.PUBLISHED &&
      opportunity.ownerId !== userId;

    if (isUnpublishedForNonOwner) {
      const isCurrentModerator =
        userId &&
        userRoles.includes(Role.OPPORTUNITIES_MODERATOR) &&
        (await this.hasCurrentModeratorRole(userId));

      if (!isCurrentModerator) {
        if (!opportunity.publishedAt) {
          throw new NotFoundException('Opportunity not found');
        }

        return unavailableOpportunity(opportunity);
      }
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
   * Content edits return published opportunities to review. Public metadata changes notify favorites.
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
    const data = buildOpportunityUpdateData(
      opportunity,
      dto,
      hasContentChanges,
    );

    let updated: Opportunity;

    try {
      updated = await this.prisma.opportunity.update({
        where: {
          id,
          status: opportunity.status,
          updatedAt: opportunity.updatedAt,
          ...(data.acceptsApplications !== undefined
            ? { acceptsApplications: opportunity.acceptsApplications }
            : {}),
          ...(data.acceptsApplications !== undefined ||
          dto.lifecycleState !== undefined
            ? { lifecycleState: opportunity.lifecycleState }
            : {}),
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

    const { shouldNotify, hasLifecycleChanged } = getSubscriberUpdateMeta({
      opportunity,
      dto,
      data,
      hasContentChanges,
    });

    if (shouldNotify) {
      await this.notifySubscribers(updated, hasLifecycleChanged);
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

    let updated: Opportunity;

    try {
      updated = await this.prisma.opportunity.update({
        where: {
          id,
          status: opportunity.status,
          updatedAt: opportunity.updatedAt,
          lifecycleState: opportunity.lifecycleState,
          ...(!isRecruitmentPhase(lifecycleState)
            ? { acceptsApplications: opportunity.acceptsApplications }
            : {}),
        },
        data: {
          lifecycleState,
          ...(!isRecruitmentPhase(lifecycleState)
            ? { acceptsApplications: false }
            : {}),
        },
      });
    } catch (error) {
      if (getPrismaErrorCode(error) === PRISMA_ERROR_CODE.RECORD_NOT_FOUND) {
        throw new ConflictException(
          'Opportunity was modified. Reload and retry.',
        );
      }

      throw error;
    }

    const hasLifecycleChanged = lifecycleState !== opportunity.lifecycleState;

    if (
      opportunity.status === OpportunityStatus.PUBLISHED &&
      (hasLifecycleChanged ||
        updated.acceptsApplications !== opportunity.acceptsApplications)
    ) {
      await this.notifySubscribers(updated, hasLifecycleChanged);
    }

    return updated;
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
        OR: [
          { status: { not: ApplicationStatus.WITHDRAWN } },
          {
            withdrawnFromStatus: { in: [...OWNER_TRACKED_WITHDRAWAL_STATUSES] },
          },
        ],
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

    if (!canChangeApplicationStatus(app.status, status)) {
      throw new ConflictException(OPPORTUNITY_ERROR.INVALID_STATUS_TRANSITION);
    }

    return this.prisma.$transaction(async (tx) => {
      // reapplyCount identifies the attempt: a withdraw and reapply in between is a 409
      const updated = await tx.opportunityApplication
        .update({
          where: {
            id: applicationId,
            status: app.status,
            reapplyCount: app.reapplyCount,
          },
          data: { status, ownerComment },
        })
        .catch(rethrowAsStatusConflict);

      await this.notificationsService.createNotification(
        {
          userId: app.applicantId,
          type: NOTIFICATION_TYPE.OPPORTUNITY_APPLICATION_STATUS,
          title: OPPORTUNITY_NOTIFICATION_KEY.APPLICATION_STATUS_TITLE,
          message: JSON.stringify({
            opportunityTitle: app.opportunity.title,
            status,
            comment: ownerComment || null,
          }),
          link: `${OPPORTUNITIES_ROUTE}/${app.opportunityId}`,
        },
        tx,
      );

      return updated;
    });
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

    return this.prisma.$transaction(async (tx) => {
      const opportunityApplication = await persistOpportunityApplication({
        tx,
        userId,
        opportunityId: id,
        request: dto,
        ownerId: opportunity.ownerId,
      });

      await this.notificationsService.createNotification(
        {
          userId: opportunity.ownerId,
          type: NOTIFICATION_TYPE.OPPORTUNITY_NEW_APPLICATION,
          title: OPPORTUNITY_NOTIFICATION_KEY.NEW_APPLICATION_TITLE,
          message: JSON.stringify({
            opportunityTitle: opportunity.title,
            applicantName: dto.applicantName,
            applicationId: opportunityApplication.id,
          }),
          link: `${OPPORTUNITIES_ROUTE}/${id}?${OPPORTUNITY_VIEW_PARAM}=${OPPORTUNITY_VIEW.APPLICANTS}`,
        },
        tx,
      );

      return opportunityApplication;
    });
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

    return this.prisma.$transaction(async (tx) => {
      // reapplyCount identifies the attempt: a stale request cannot withdraw a later one
      const withdrawn = await tx.opportunityApplication
        .update({
          where: {
            id: applicationId,
            status: app.status,
            reapplyCount: app.reapplyCount,
          },
          data: {
            status: ApplicationStatus.WITHDRAWN,
            withdrawnFromStatus: app.status,
          },
        })
        .catch(rethrowAsStatusConflict);

      await tx.notification.deleteMany({
        where: {
          userId: app.opportunity.ownerId,
          type: NOTIFICATION_TYPE.OPPORTUNITY_NEW_APPLICATION,
          link: { contains: app.opportunityId },
          message: { contains: `"applicationId":"${applicationId}"` },
        },
      });

      if (isOwnerTrackedWithdrawalStatus(app.status)) {
        await this.notificationsService.createNotification(
          {
            userId: app.opportunity.ownerId,
            type: NOTIFICATION_TYPE.OPPORTUNITY_APPLICATION_WITHDRAWN,
            title: OPPORTUNITY_NOTIFICATION_KEY.APPLICATION_WITHDRAWN_TITLE,
            message: JSON.stringify({
              opportunityTitle: app.opportunity.title,
              applicantName: app.applicantName,
              applicationId,
            }),
            link: `${OPPORTUNITIES_ROUTE}/${app.opportunityId}?${OPPORTUNITY_VIEW_PARAM}=${OPPORTUNITY_VIEW.APPLICANTS}`,
          },
          tx,
        );
      }

      return withdrawn;
    });
  }

  /**
   * Retrieve all applications submitted by a user.
   */
  async getMyApplications(
    userId: string,
    userRoles: string[] = [],
  ): Promise<ApplicationWithOpportunity[]> {
    const isModerator =
      userRoles.includes(Role.OPPORTUNITIES_MODERATOR) &&
      (await this.hasCurrentModeratorRole(userId));
    const applications = await this.prisma.opportunityApplication.findMany({
      where: { applicantId: userId },
      include: {
        applicant: { select: { name: true, email: true } },
        opportunity: { include: OPPORTUNITY_INCLUDE },
      },
      orderBy: { createdAt: 'desc' },
    });

    return (applications ?? []).map(({ opportunity, ...application }) => {
      if (!opportunity) {
        return { ...application, opportunity: undefined };
      }

      return {
        ...application,
        opportunity:
          opportunity.status === OpportunityStatus.PUBLISHED ||
          opportunity.ownerId === userId ||
          isModerator
            ? opportunity
            : unavailableOpportunity(opportunity),
      };
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
    if (!(await this.hasCurrentModeratorRole(userId))) {
      throw new ForbiddenException(
        'Only OPPORTUNITIES_MODERATOR can moderate opportunities',
      );
    }

    const opportunityToModerate = await this.loadOpportunity(id);

    if (opportunityToModerate.ownerId === userId) {
      throw new ForbiddenException('You cannot moderate your own opportunity');
    }

    if (opportunityToModerate.status !== OpportunityStatus.READY_FOR_REVIEW) {
      throw new BadRequestException(
        'Only opportunities in READY_FOR_REVIEW can be moderated',
      );
    }

    const newStatus = resolveModerationTargetStatus(dto);

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

    try {
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
    } catch (error: unknown) {
      this.logger.error(
        `Failed to deliver moderation notification for opportunity ${opp.id}`,
        error instanceof Error ? error.stack : error,
      );
    }

    if (newStatus === OpportunityStatus.PUBLISHED) {
      await this.notifySubscribers(opp);
    }

    return opp;
  }
}
