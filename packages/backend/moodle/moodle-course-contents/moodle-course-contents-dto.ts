import { ApiProperty } from '@nestjs/swagger';
import type { CourseModule, CourseSection } from '@universe/core/types/moodle';

export class CourseModuleDto implements CourseModule {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  url?: string;

  @ApiProperty()
  modname: string;
}

export class CourseContentDto implements CourseSection {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  summary: string;

  @ApiProperty({ type: [CourseModuleDto] })
  modules: CourseModuleDto[];
}
