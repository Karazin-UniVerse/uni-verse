import { PartialType } from '@nestjs/swagger';
import type { UpdateOpportunityRequest } from '@universe/core/types/opportunities';
import { CreateOpportunityDto } from './create-opportunity.dto';

export class UpdateOpportunityDto
  extends PartialType(CreateOpportunityDto)
  implements UpdateOpportunityRequest {}
