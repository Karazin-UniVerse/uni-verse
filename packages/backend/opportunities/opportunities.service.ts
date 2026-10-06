import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  ApplyOpportunityDto,
  ModerateOpportunityDto,
  ModerateAction,
  FindOpportunitiesDto,
} from './dto';
import {
  OpportunityLifecycleState,
  ApplicationStatus,
  OpportunityStatus,
} from '@universe/database';

@Injectable()
export class OpportunitiesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateOpportunityDto) {
    return this.prisma.opportunity.create({
      data: {
        ...dto,
        ownerId: userId,
        status: 'DRAFT', // initial status
      },
    });
  }

  async findAll(query: FindOpportunitiesDto, userRole?: string) {
    const { paymentType, ownerId, search, status } = query;
    const where: Record<string, unknown> = {};

    if (
      status &&
      status !== 'PUBLISHED' &&
      (userRole === 'MODERATOR' || userRole === 'ADMIN')
    ) {
      where.status = status;
    } else {
      where.status = 'PUBLISHED';
    }

    if (paymentType) where.paymentType = paymentType;

    if (ownerId) where.ownerId = ownerId;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.opportunity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    if (!opportunity) throw new NotFoundException('Opportunity not found');

    return opportunity;
  }

  async update(userId: string, id: string, dto: UpdateOpportunityDto) {
    const opportunity = await this.findOne(id);

    if (opportunity.ownerId !== userId) {
      throw new ForbiddenException(
        'You can only update your own opportunities',
      );
    }

    return this.prisma.opportunity.update({
      where: { id },
      data: dto,
    });
  }

  async changeStatus(userId: string, id: string, status: 'READY_FOR_REVIEW') {
    const opportunity = await this.findOne(id);

    if (opportunity.ownerId !== userId)
      throw new ForbiddenException('Not your opportunity');

    return this.prisma.opportunity.update({
      where: { id },
      data: { status },
    });
  }

  async changeLifecycleState(
    userId: string,
    id: string,
    lifecycleState: OpportunityLifecycleState,
  ) {
    const opportunity = await this.findOne(id);

    if (opportunity.ownerId !== userId)
      throw new ForbiddenException('Not your opportunity');

    return this.prisma.opportunity.update({
      where: { id },
      data: { lifecycleState },
    });
  }

  async getOpportunityApplications(userId: string, id: string) {
    const opportunity = await this.findOne(id);

    if (opportunity.ownerId !== userId)
      throw new ForbiddenException('Only the owner can view applications');

    return this.prisma.opportunityApplication.findMany({
      where: { opportunityId: id },
      include: { applicant: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateApplicationStatus(
    userId: string,
    applicationId: string,
    status: ApplicationStatus,
    ownerComment?: string,
  ) {
    const app = await this.prisma.opportunityApplication.findUnique({
      where: { id: applicationId },
      include: { opportunity: true },
    });

    if (!app) throw new NotFoundException('Application not found');

    if (app.opportunity.ownerId !== userId)
      throw new ForbiddenException('Only the owner can manage this');

    const updated = await this.prisma.opportunityApplication.update({
      where: { id: applicationId },
      data: { status, ownerComment },
    });

    let statusText: string = status;

    if (status === 'ACCEPTED') statusText = 'принят';

    if (status === 'REJECTED') statusText = 'отклонен';

    if (status === 'UNDER_REVIEW') statusText = 'на рассмотрении';

    await this.notificationsService.createNotification(
      app.applicantId,
      'Статус отклика изменен',
      `Ваш отклик на "${app.opportunity.title}" теперь ${statusText}.${ownerComment ? ` Комментарий: ${ownerComment}` : ''}`,
      `/my-applications`,
    );

    return updated;
  }

  async apply(userId: string, id: string, dto: ApplyOpportunityDto) {
    const opportunity = await this.findOne(id);

    if (opportunity.status !== 'PUBLISHED') {
      throw new BadRequestException(
        'Cannot apply to an unpublished opportunity',
      );
    }

    if (opportunity.lifecycleState !== 'ACTIVE') {
      throw new BadRequestException(
        'Cannot apply to an opportunity that is not active',
      );
    }

    const existing = await this.prisma.opportunityApplication.findFirst({
      where: { applicantId: userId, opportunityId: id },
    });

    if (existing) {
      throw new BadRequestException('Already applied to this opportunity');
    }

    const app = await this.prisma.opportunityApplication.create({
      data: {
        ...dto,
        applicantId: userId,
        opportunityId: id,
        status: 'SUBMITTED',
      },
    });

    await this.notificationsService.createNotification(
      opportunity.ownerId,
      'Новый отклик!',
      `Пользователь ${dto.applicantName} откликнулся на вашу возможность "${opportunity.title}".`,
      `/my-opportunities/${id}`,
    );

    return app;
  }

  async withdrawApplication(userId: string, applicationId: string) {
    const app = await this.prisma.opportunityApplication.findUnique({
      where: { id: applicationId },
    });

    if (!app) throw new NotFoundException('Application not found');

    if (app.applicantId !== userId)
      throw new ForbiddenException('Only the applicant can withdraw');

    if (app.status === 'ACCEPTED' || app.status === 'REJECTED')
      throw new BadRequestException('Cannot withdraw completed application');

    return this.prisma.opportunityApplication.update({
      where: { id: applicationId },
      data: { status: 'WITHDRAWN' },
    });
  }

  async getMyApplications(userId: string) {
    return this.prisma.opportunityApplication.findMany({
      where: { applicantId: userId },
      include: { opportunity: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyOpportunities(userId: string) {
    return this.prisma.opportunity.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async moderate(id: string, dto: ModerateOpportunityDto) {
    let newStatus: OpportunityStatus = 'DRAFT';
    let actionText = '';

    if (dto.action === ModerateAction.APPROVE) {
      newStatus = 'PUBLISHED';
      actionText = 'одобрена';
    } else if (dto.action === ModerateAction.REJECT) {
      newStatus = 'REJECTED';
      actionText = 'отклонена';
    } else if (dto.action === ModerateAction.REQUIRE_CHANGES) {
      newStatus = 'REQUIRES_CHANGES';
      actionText = 'возвращена на правки';
    }

    const opp = await this.prisma.opportunity.update({
      where: { id },
      data: {
        status: newStatus,
        moderationComment: dto.comment,
      },
    });

    await this.notificationsService.createNotification(
      opp.ownerId,
      `Возможность ${actionText}`,
      `Ваша возможность "${opp.title}" была ${actionText} модератором.${dto.comment ? ` Комментарий: ${dto.comment}` : ''}`,
      `/my-opportunities`,
    );

    return opp;
  }
}
