import type { AcademicGroupResponse, CurriculumPlanResponse } from '@core/types/timetable';

export type CurriculumPlanFieldValues = {
  title: string;
  faculty: string;
  academicYear: string;
  semester: string;
};

export type CurriculumPlanDialogProps = {
  open: boolean;
  academicGroups: AcademicGroupResponse[];
  plans: CurriculumPlanResponse[];
  onClose: () => void;
  onCreated: (plan: CurriculumPlanResponse) => void;
};

export type CurriculumPlanFieldsProps = {
  values: CurriculumPlanFieldValues;
  disabled: boolean;
  onChange: (patch: Partial<CurriculumPlanFieldValues>) => void;
};
