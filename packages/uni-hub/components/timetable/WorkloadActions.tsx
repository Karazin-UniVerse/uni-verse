import React from 'react';
import { Play, Plus, Save } from 'lucide-react';
import { Button, CheckBox } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import styles from './TimetableManagement.module.scss';

type WorkloadActionsProps = {
  isGenerating: boolean;
  isAddDisabled: boolean;
  isSaveDisabled: boolean;
  isGenerateDisabled: boolean;
  showCompactSaturdays: boolean;
  compactSaturdays: boolean;
  onCompactSaturdaysChange: (checked: boolean) => void;
  onAddDiscipline: () => void;
  onSave: () => void;
  onGenerate: () => void;
};

/** Add a discipline, save the workload, generate drafts; short semesters also offer compact Saturdays. */
export const WorkloadActions: React.FC<WorkloadActionsProps> = ({
  isGenerating,
  isAddDisabled,
  isSaveDisabled,
  isGenerateDisabled,
  showCompactSaturdays,
  compactSaturdays,
  onCompactSaturdaysChange,
  onAddDiscipline,
  onSave,
  onGenerate,
}) => {
  const { formatMessage } = useLanguage();

  return (
    <>
      <div className={styles.tableActions}>
        <Button
          type="button"
          variant="secondary"
          onClick={onAddDiscipline}
          disabled={isAddDisabled}
        >
          <Plus size={16} /> {formatMessage('timetable.addDiscipline')}
        </Button>

        <Button type="button" variant="secondary" onClick={onSave} disabled={isSaveDisabled}>
          <Save size={16} /> {formatMessage('timetable.saveWorkload')}
        </Button>

        <Button type="button" variant="primary" onClick={onGenerate} disabled={isGenerateDisabled}>
          {isGenerating ? (
            <>
              <span className={styles.inlineSpinner} aria-hidden="true" />{' '}
              {formatMessage('timetable.generating')}
            </>
          ) : (
            <>
              <Play size={16} /> {formatMessage('timetable.generateDraft')}
            </>
          )}
        </Button>
      </div>
      {showCompactSaturdays && (
        <label className={styles.generateOption}>
          <CheckBox
            variant="primary"
            checked={compactSaturdays}
            onChange={(event) => onCompactSaturdaysChange(event.target.checked)}
            disabled={isGenerating}
          />
          <span>
            {formatMessage('timetable.compactSaturdays')}
            <small className={styles.summaryHint}>
              {formatMessage('timetable.compactSaturdaysHint')}
            </small>
          </span>
        </label>
      )}
    </>
  );
};
