import { ApiProperty } from '@nestjs/swagger';

export class CourseModuleDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  url?: string;

  @ApiProperty({ required: false })
  modname?: string;
}

export class CourseContentDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  summary?: string;

  @ApiProperty({ type: [CourseModuleDto], required: false })
  modules?: CourseModuleDto[];
}
