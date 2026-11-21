import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button, CheckBox, Select, TextInput } from '@una';
import type { AcademicGroupResponse } from '@core/types/timetable';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { getSelectedGroupOrStream, type WorkloadRow } from './workload';
import styles from './TimetableManagement.module.scss';

type Option = { value: string; label: string };

export type WorkloadRowOptions = {
  teachingType: Option[];
  groupOrStream: Option[];
  teacher: Option[];
};

type WorkloadTableRowProps = {
  row: WorkloadRow;
  options: WorkloadRowOptions;
  academicGroups: AcademicGroupResponse[];
  onUpdate: <K extends keyof WorkloadRow>(id: string, key: K, value: WorkloadRow[K]) => void;
  onGroupOrStreamChange: (id: string, value: string) => void;
  onRemove: (id: string) => void;
};

/** One editable assignment of a discipline: type, participants, hours, teacher and flags. */
export const WorkloadTableRow: React.FC<WorkloadTableRowProps> = ({
  row,
  options,
  academicGroups,
  onUpdate,
  onGroupOrStreamChange,
  onRemove,
}) => {
  const { formatMessage } = useLanguage();
  const selectedGroup = academicGroups.find(
    (group) => group.id === row.groupId || group.code === row.groupId,
  );
  const subgroups = selectedGroup?.subgroups ?? [];
  const discipline = row.disciplineTitle || formatMessage('timetable.disciplineTitle');

  return (
    <tr>
      <td data-label={formatMessage('timetable.teachingType')}>
        <Select
          value={row.teachingType}
          options={options.teachingType}
          onChange={(value) =>
            onUpdate(row.id, 'teachingType', value as WorkloadRow['teachingType'])
          }
          aria-label={formatMessage('timetable.teachingType')}
        />
      </td>
      <td data-label={formatMessage('timetable.groupOrStream')}>
        <div className={styles.groupCell}>
          <Select
            value={getSelectedGroupOrStream(row, academicGroups)}
            options={options.groupOrStream}
            onChange={(value) => onGroupOrStreamChange(row.id, value)}
            aria-label={formatMessage('timetable.groupOrStream')}
          />
        </div>
      </td>
      <td data-label={formatMessage('timetable.subgroup')}>
        <div className={styles.subgroupCell}>
          <Select
            value={row.subgroupId ?? ''}
            options={[
              { value: '', label: formatMessage('timetable.subgroupAll') },
              ...subgroups.map(({ id, name }) => ({ value: id, label: name })),
            ]}
            onChange={(value) => onUpdate(row.id, 'subgroupId', value || undefined)}
            disabled={Boolean(row.streamId) || subgroups.length === 0}
            aria-label={formatMessage('timetable.subgroup')}
          />
        </div>
      </td>
      <td data-label={formatMessage('timetable.hours')}>
        <TextInput
          type="number"
          value={row.academicHours}
          onChange={(event) => onUpdate(row.id, 'academicHours', Number(event.target.value) || 0)}
          className={styles.hoursInput}
          aria-label={formatMessage('timetable.hours')}
        />
      </td>
      <td
        data-label={formatMessage('timetable.teacher')}
        className={row.teacherId ? undefined : styles.missingTeacher}
        title={row.teacherId ? undefined : formatMessage('timetable.teacherMissing')}
      >
        <Select
          value={row.teacherId ?? ''}
          options={options.teacher}
          onChange={(value) => onUpdate(row.id, 'teacherId', value)}
          aria-label={formatMessage('timetable.teacher')}
        />
      </td>
      <td className={styles.checkCell} data-label={formatMessage('timetable.saturdayOnly')}>
        <CheckBox
          variant="primary"
          checked={row.isSaturdayOnly}
          onChange={(event) => onUpdate(row.id, 'isSaturdayOnly', event.target.checked)}
          aria-label={formatMessage('timetable.saturdayOnlyRow', { discipline })}
        />
      </td>
      <td className={styles.checkCell} data-label={formatMessage('timetable.lateSlotAuth')}>
        <CheckBox
          variant="primary"
          checked={row.hasLateSlotAuthorization}
          onChange={(event) => onUpdate(row.id, 'hasLateSlotAuthorization', event.target.checked)}
          aria-label={formatMessage('timetable.lateSlotAuthRow', { discipline })}
        />
      </td>
      <td data-label={formatMessage('timetable.actions')}>
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={() => onRemove(row.id)}
          aria-label={formatMessage('timetable.deleteRow', { discipline })}
        >
          <Trash2 size={14} />
        </Button>
      </td>
    </tr>
  );
};
