import React, { useCallback, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Button, Tag, TextInput } from '@una';
import type { AcademicStreamResponse, SafeTeacherResponse } from '@core/types/timetable';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { groupWorkloadByTitle } from './workload';
import { WorkloadTableRow, type WorkloadRowOptions } from './WorkloadTableRow';
import type { WorkloadEditor } from './useWorkloadEditor';
import styles from './TimetableManagement.module.scss';

type WorkloadTableProps = {
  editor: WorkloadEditor;
  teachers: SafeTeacherResponse[];
  streams: AcademicStreamResponse[];
  disabled: boolean;
};

/** The workload of a plan, grouped by discipline with a collapsible block for each. */
export const WorkloadTable: React.FC<WorkloadTableProps> = ({
  editor,
  teachers,
  streams,
  disabled,
}) => {
  const { formatMessage } = useLanguage();
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(() => new Set());
  const { workload, academicGroups } = editor;
  const workloadGroups = useMemo(() => groupWorkloadByTitle(workload), [workload]);

  const options = useMemo<WorkloadRowOptions>(() => {
    const teacherOptions = teachers.map((teacher) => ({
      value: teacher.id,
      label: teacher.name ?? teacher.id,
    }));

    return {
      teachingType: [
        { value: 'LECTURE', label: formatMessage('timetable.typeLecture') },
        { value: 'PRACTICE', label: formatMessage('timetable.typePractical') },
        { value: 'SEMINAR', label: formatMessage('timetable.typeSeminar') },
        { value: 'LAB', label: formatMessage('timetable.typeLaboratory') },
      ],
      groupOrStream: [
        ...academicGroups.map((group) => ({ value: group.id, label: group.code })),
        ...streams.map((stream) => ({ value: stream.id, label: stream.name })),
      ],
      teacher: [
        {
          value: '',
          label: formatMessage(
            teacherOptions.length === 0 ? 'timetable.noTeachers' : 'timetable.selectTeacher',
          ),
        },
        ...teacherOptions,
      ],
    };
  }, [academicGroups, formatMessage, streams, teachers]);

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((previous) => {
      const next = new Set(previous);

      if (!next.delete(key)) {
        next.add(key);
      }

      return next;
    });
  }, []);

  return (
    <fieldset
      className={styles.tableContainer}
      aria-label={formatMessage('timetable.workloadTitle')}
      disabled={disabled}
      tabIndex={0}
    >
      <div className={styles.tableInner}>
        <div className={styles.tableHead}>
          <table className={styles.workloadTable}>
            <thead>
              <tr>
                <th>{formatMessage('timetable.teachingType')}</th>
                <th>{formatMessage('timetable.groupOrStream')}</th>
                <th>{formatMessage('timetable.subgroup')}</th>
                <th>{formatMessage('timetable.hours')}</th>
                <th>{formatMessage('timetable.teacher')}</th>
                <th>{formatMessage('timetable.saturdayOnly')}</th>
                <th>{formatMessage('timetable.lateSlotAuth')}</th>
                <th>{formatMessage('timetable.actions')}</th>
              </tr>
            </thead>
          </table>
        </div>
        {workloadGroups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.key);
          const label = group.title || formatMessage('timetable.disciplineTitle');

          return (
            <section key={group.key} className={styles.workloadGroup}>
              <div className={styles.groupHeader}>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  aria-expanded={!isCollapsed}
                  aria-label={formatMessage(
                    isCollapsed ? 'timetable.expandDiscipline' : 'timetable.collapseDiscipline',
                    { discipline: label },
                  )}
                  onClick={() => toggleGroup(group.key)}
                >
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </Button>
                <TextInput
                  value={group.title}
                  onChange={(event) =>
                    editor.renameDiscipline(
                      group.rows.map((row) => row.id),
                      event.target.value,
                    )
                  }
                  placeholder={formatMessage('timetable.disciplineTitle')}
                  aria-label={formatMessage('timetable.disciplineTitle')}
                />
                <Tag>{group.rows.length}</Tag>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  disabled={!editor.canAddRow}
                  onClick={() => editor.addRow(group.title)}
                  aria-label={formatMessage('timetable.addWorkloadToDiscipline', {
                    discipline: label,
                  })}
                >
                  <Plus size={14} />
                </Button>
              </div>
              {!isCollapsed && (
                <table className={styles.workloadTable}>
                  <tbody>
                    {group.rows.map((row) => (
                      <WorkloadTableRow
                        key={row.id}
                        row={row}
                        options={options}
                        academicGroups={academicGroups}
                        onUpdate={editor.updateRow}
                        onGroupOrStreamChange={editor.changeGroupOrStream}
                        onRemove={editor.removeRow}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          );
        })}
      </div>
    </fieldset>
  );
};
