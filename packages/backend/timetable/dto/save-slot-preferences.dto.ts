import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  FIRST_PAIR,
  LAST_PAIR,
  MAX_SLOT_PREFERENCES,
  SLOT_PREFERENCE,
  TIMETABLE_WEEKDAY,
  type SlotPreference,
} from '@universe/core/constants/timetable';
import type {
  SaveTeacherSlotPreferencesRequest,
  SlotPreferenceItem,
} from '@universe/core/types/timetable';

class SlotPreferenceDto implements SlotPreferenceItem {
  @ApiProperty({
    minimum: TIMETABLE_WEEKDAY.MONDAY,
    maximum: TIMETABLE_WEEKDAY.SATURDAY,
  })
  @IsInt()
  @Min(TIMETABLE_WEEKDAY.MONDAY)
  @Max(TIMETABLE_WEEKDAY.SATURDAY)
  weekday: number;

  @ApiProperty({ minimum: FIRST_PAIR, maximum: LAST_PAIR })
  @IsInt()
  @Min(FIRST_PAIR)
  @Max(LAST_PAIR)
  pair: number;

  @ApiProperty({ enum: Object.values(SLOT_PREFERENCE) })
  @IsIn(Object.values(SLOT_PREFERENCE))
  preference: SlotPreference;
}

export class SaveSlotPreferencesDto implements SaveTeacherSlotPreferencesRequest {
  @ApiProperty({ type: [SlotPreferenceDto], maxItems: MAX_SLOT_PREFERENCES })
  @IsArray()
  @ArrayMaxSize(MAX_SLOT_PREFERENCES)
  @ArrayUnique(
    (slot: SlotPreferenceDto): string => `${slot.weekday}:${slot.pair}`,
  )
  @ValidateNested({ each: true })
  @Type(() => SlotPreferenceDto)
  slots: SlotPreferenceDto[];
}
