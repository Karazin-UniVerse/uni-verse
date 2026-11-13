import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@universe/database';
import type {
  ReschedulePreviewResponse,
  RescheduleRequestPage,
  RescheduleRequestResponse,
} from '@universe/core/types/timetable';
import { AtGuard } from '../auth/guards/at.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import {
  ListRescheduleRequestsDto,
  RejectRescheduleRequestDto,
  RescheduleRequestDto,
} from './dto/reschedule-request.dto';
import { RescheduleEventDto } from './dto/reschedule-event.dto';
import { TimetableRescheduleRequestsService } from './timetable-reschedule-requests.service';
import { TimetableReschedulingService } from './timetable-rescheduling.service';
import { assertAdmin } from './timetable.helpers';

@ApiTags('Timetable')
@ApiBearerAuth()
@Controller('timetable')
@UseGuards(AtGuard)
export class TimetableRescheduleRequestsController {
  constructor(
    private readonly requests: TimetableRescheduleRequestsService,
    private readonly rescheduling: TimetableReschedulingService,
  ) {}

  @Patch('events/:id/reschedule')
  @ApiOperation({
    summary: 'Directly reschedule published occurrences as administrator',
  })
  reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleEventDto,
    @GetUser('sub') userId: string,
    @GetUser('roles') roles?: string[],
  ): Promise<ReschedulePreviewResponse> {
    assertAdmin(roles);

    return this.rescheduling.reschedule({ ...dto, eventId: id }, userId);
  }

  @Post('reschedule-preview')
  @ApiOperation({
    summary: 'Preview an instructor request or administrator move',
  })
  preview(
    @Body() dto: RescheduleRequestDto,
    @GetUser('sub') userId: string,
    @GetUser('roles') roles?: string[],
  ): Promise<ReschedulePreviewResponse> {
    return this.rescheduling.preview(
      dto,
      userId,
      roles?.includes(Role.ADMIN) ? 'ADMIN' : 'INSTRUCTOR',
    );
  }

  @Post('my/reschedule-requests')
  @ApiOperation({ summary: 'Request rescheduling of own published classes' })
  create(
    @Body() dto: RescheduleRequestDto,
    @GetUser('sub') userId: string,
  ): Promise<RescheduleRequestResponse> {
    return this.requests.create(userId, dto);
  }

  @Get('my/reschedule-requests')
  @ApiOperation({ summary: 'List own rescheduling requests' })
  listMine(
    @Query() query: ListRescheduleRequestsDto,
    @GetUser('sub') userId: string,
  ): Promise<RescheduleRequestPage> {
    return this.requests.listMine(userId, query);
  }

  @Get('reschedule-requests')
  @ApiOperation({ summary: 'List requests for dean review' })
  list(
    @Query() query: ListRescheduleRequestsDto,
    @GetUser('roles') roles?: string[],
  ): Promise<RescheduleRequestPage> {
    assertAdmin(roles);

    return this.requests.listForReview(query);
  }

  @Post('reschedule-requests/:id/approve')
  @ApiOperation({
    summary: 'Approve and atomically apply a rescheduling request',
  })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('sub') userId: string,
    @GetUser('roles') roles?: string[],
  ): Promise<RescheduleRequestResponse> {
    assertAdmin(roles);

    return this.requests.approve(id, userId);
  }

  @Post('reschedule-requests/:id/reject')
  @ApiOperation({
    summary: 'Reject a rescheduling request with an explanation',
  })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectRescheduleRequestDto,
    @GetUser('sub') userId: string,
    @GetUser('roles') roles?: string[],
  ): Promise<RescheduleRequestResponse> {
    assertAdmin(roles);

    return this.requests.reject(id, userId, dto.explanation);
  }
}
