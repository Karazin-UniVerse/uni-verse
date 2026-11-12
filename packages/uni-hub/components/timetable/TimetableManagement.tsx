import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, Play, Plus, Save, Trash2 } from 'lucide-react';
import { Button, CheckBox, Select, Spinner, Tag, TextInput } from '@una';
import type {
  CreateTeachingAssignmentRequest,
  GenerateTimetableDraftResult,
} from '@core/types/timetable';
import { useLanguage, type FormatMessage } from '@uni-hub/i18n/LanguageContext';
import { timetableApi } from '@uni-hub/services/api.timetable';
import styles from './TimetableManagement.module.scss';

export interface WorkloadRow {
  id: string;
  disciplineTitle: string;
  teachingType: 'LECTURE' | 'PRACTICE' | 'SEMINAR' | 'LAB';
  academicHours: number;
  teacherId: string;
  isSaturdayOnly: boolean;
  hasLateSlotAuthorization: boolean;
}

const toUiTeachingType = (type: string): WorkloadRow['teachingType'] => {
  switch (type) {
    case 'PRACTICAL':
    case 'PRACTICE':
      return 'PRACTICE';
    case 'LABORATORY':
    case 'LAB':
      return 'LAB';
    case 'SEMINAR':
      return 'SEMINAR';
    default:
      return 'LECTURE';
  }
};

const toApiTeachingType = (
  type: WorkloadRow['teachingType'],
): CreateTeachingAssignmentRequest['teachingType'] => {
  switch (type) {
    case 'PRACTICE':
      return 'PRACTICAL';
    case 'LAB':
      return 'LABORATORY';
    case 'SEMINAR':
      return 'SEMINAR';
    default:
      return 'LECTURE';
  }
};

const createDefaultWorkload = (formatMessage: FormatMessage): WorkloadRow[] => [
  {
    id: 'row-1',
    disciplineTitle: formatMessage('timetable.defaultDiscipline1'),
    teachingType: 'LECTURE',
    academicHours: 32,
    teacherId: 'teacher-1',
    isSaturdayOnly: false,
    hasLateSlotAuthorization: false,
  },
  {
    id: 'row-2',
    disciplineTitle: formatMessage('timetable.defaultDiscipline2'),
    teachingType: 'PRACTICE',
    academicHours: 32,
    teacherId: 'teacher-2',
    isSaturdayOnly: false,
    hasLateSlotAuthorization: false,
  },
  {
    id: 'row-3',
    disciplineTitle: formatMessage('timetable.defaultDiscipline3'),
    teachingType: 'LAB',
    academicHours: 32,
    teacherId: 'teacher-3',
    isSaturdayOnly: false,
    hasLateSlotAuthorization: true,
  },
];

export interface TimetableManagementProps {
  initialPlanId?: string;
  initialWorkload?: WorkloadRow[];
}

export const TimetableManagement: React.FC<TimetableManagementProps> = ({
  initialWorkload,
  initialPlanId = 'plan-cs-2026',
}) => {
  const { formatMessage } = useLanguage();
  const baseId = useId();

  const [planId, setPlanId] = useState(initialPlanId);
  const [workload, setWorkload] = useState<WorkloadRow[]>(
    () => initialWorkload ?? createDefaultWorkload(formatMessage),
  );
  const [dirtyRowIds, setDirtyRowIds] = useState<Set<string>>(() => new Set());
  const [isSavingWorkload, setIsSavingWorkload] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [draftResult, setDraftResult] = useState<GenerateTimetableDraftResult | null>(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialWorkload || !planId.trim()) {
      return;
    }

    let isActive = true;

    Promise.resolve(timetableApi.listTeachingAssignments(planId))
      .then((response) => {
        if (isActive && Array.isArray(response?.data) && response.data.length > 0) {
          setWorkload(
            response.data.map((assignment) => ({
              id: assignment.id,
              disciplineTitle: assignment.disciplineTitle,
              teachingType: toUiTeachingType(assignment.teachingType),
              academicHours: assignment.academicHours,
              teacherId: assignment.teacherId,
              isSaturdayOnly: Boolean(assignment.isSaturdayOnly),
              hasLateSlotAuthorization: Boolean(assignment.hasLateSlotAuthorization),
            })),
          );
          setDirtyRowIds(new Set());
        }
      })
      .catch(() => {
        // Keep current/default rows when offline or unmocked
      });

    return () => {
      isActive = false;
    };
  }, [initialWorkload, planId]);

  const teachingTypeOptions = useMemo(
    () => [
      { value: 'LECTURE', label: formatMessage('timetable.typeLecture') },
      { value: 'PRACTICE', label: formatMessage('timetable.typePractical') },
      { value: 'SEMINAR', label: formatMessage('timetable.typeSeminar') },
      { value: 'LAB', label: formatMessage('timetable.typeLaboratory') },
    ],
    [formatMessage],
  );

  const handleAddRow = useCallback(() => {
    const newId = `row-${Date.now()}`;
    const newRow: WorkloadRow = {
      id: newId,
      disciplineTitle: '',
      teachingType: 'LECTURE',
      academicHours: 32,
      teacherId: '',
      isSaturdayOnly: false,
      hasLateSlotAuthorization: false,
    };

    setWorkload((prev) => [...prev, newRow]);
    setDirtyRowIds((prev) => new Set(prev).add(newId));
  }, []);

  const handleRemoveRow = useCallback((id: string) => {
    setWorkload((prev) => prev.filter((row) => row.id !== id));
    setDirtyRowIds((prev) => {
      const next = new Set(prev);

      next.delete(id);

      return next;
    });
  }, []);

  const handleUpdateRow = useCallback(
    <K extends keyof WorkloadRow>(id: string, key: K, value: WorkloadRow[K]) => {
      setWorkload((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
      setDirtyRowIds((prev) => new Set(prev).add(id));
    },
    [],
  );

  const persistDirtyWorkload = useCallback(async () => {
    const rowsToPersist = workload.filter(
      (row) => dirtyRowIds.has(row.id) && row.disciplineTitle.trim() && row.teacherId.trim(),
    );

    if (rowsToPersist.length === 0) {
      return;
    }

    const updatedIds = new Map<string, string>();

    for (const row of rowsToPersist) {
      const created = await timetableApi.createTeachingAssignment({
        curriculumPlanId: planId,
        disciplineTitle: row.disciplineTitle.trim(),
        teachingType: toApiTeachingType(row.teachingType),
        academicHours: row.academicHours,
        teacherId: row.teacherId.trim(),
        isSaturdayOnly: row.isSaturdayOnly,
        hasLateSlotAuthorization: row.hasLateSlotAuthorization,
      });

      if (created?.data?.id) {
        updatedIds.set(row.id, created.data.id);
      }
    }

    if (updatedIds.size > 0) {
      setWorkload((prev) =>
        prev.map((row) =>
          updatedIds.has(row.id) ? { ...row, id: updatedIds.get(row.id) ?? row.id } : row,
        ),
      );
    }

    setDirtyRowIds((prev) => {
      const next = new Set(prev);

      for (const row of rowsToPersist) {
        next.delete(row.id);
      }

      return next;
    });
  }, [dirtyRowIds, planId, workload]);

  const handleSaveWorkload = useCallback(async () => {
    setIsSavingWorkload(true);
    setError(null);

    try {
      await persistDirtyWorkload();
    } catch {
      setError(formatMessage('timetable.generateError'));
    } finally {
      setIsSavingWorkload(false);
    }
  }, [formatMessage, persistDirtyWorkload]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setIsPublished(false);
    setError(null);

    try {
      await persistDirtyWorkload();

      const response = await timetableApi.generateTimetableDraft(planId, {
        maxCandidates: 3,
        timeoutMs: 5000,
      });

      setDraftResult(response.data);
      setSelectedCandidateIndex(0);
    } catch {
      setDraftResult(null);
      setError(formatMessage('timetable.generateError'));
    } finally {
      setIsGenerating(false);
    }
  }, [formatMessage, persistDirtyWorkload, planId]);

  const handlePublish = useCallback(async () => {
    if (!draftResult) {
      return;
    }

    setIsPublishing(true);
    setError(null);

    const targetVersionId =
      draftResult.candidates[selectedCandidateIndex]?.versionId || draftResult.versionId;

    try {
      await timetableApi.publishTimetableVersion(targetVersionId);
      setIsPublished(true);
    } catch {
      setIsPublished(false);
      setError(formatMessage('timetable.publishError'));
    } finally {
      setIsPublishing(false);
    }
  }, [draftResult, formatMessage, selectedCandidateIndex]);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h2>{formatMessage('timetable.managementTitle')}</h2>
      </header>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Curriculum Plan Selection */}
      <section className={styles.planRow}>
        <label htmlFor={`${baseId}-planId`}>{formatMessage('timetable.planId')}</label>
        <TextInput
          id={`${baseId}-planId`}
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          size="medium"
          aria-label={formatMessage('timetable.planId')}
        />
      </section>

      {/* Workload Table */}
      <section className={styles.section}>
        <h3>{formatMessage('timetable.workloadTitle')}</h3>
        <div className={styles.tableContainer}>
          <table className={styles.workloadTable}>
            <thead>
              <tr>
                <th>{formatMessage('timetable.disciplineTitle')}</th>
                <th>{formatMessage('timetable.teachingType')}</th>
                <th>{formatMessage('timetable.hours')}</th>
                <th>{formatMessage('timetable.teacher')}</th>
                <th>{formatMessage('timetable.saturdayOnly')}</th>
                <th>{formatMessage('timetable.lateSlotAuth')}</th>
                <th>{formatMessage('timetable.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((row) => (
                <tr key={row.id}>
                  <td>
                    <TextInput
                      value={row.disciplineTitle}
                      onChange={(e) => handleUpdateRow(row.id, 'disciplineTitle', e.target.value)}
                      placeholder={formatMessage('timetable.disciplineTitle')}
                      aria-label={formatMessage('timetable.disciplineTitle')}
                    />
                  </td>
                  <td>
                    <Select
                      value={row.teachingType}
                      options={teachingTypeOptions}
                      onChange={(val) =>
                        handleUpdateRow(row.id, 'teachingType', val as WorkloadRow['teachingType'])
                      }
                      aria-label={formatMessage('timetable.teachingType')}
                    />
                  </td>
                  <td>
                    <TextInput
                      type="number"
                      value={row.academicHours}
                      onChange={(e) =>
                        handleUpdateRow(row.id, 'academicHours', Number(e.target.value) || 0)
                      }
                      style={{ width: '80px' }}
                      aria-label={formatMessage('timetable.hours')}
                    />
                  </td>
                  <td>
                    <TextInput
                      value={row.teacherId}
                      onChange={(e) => handleUpdateRow(row.id, 'teacherId', e.target.value)}
                      placeholder={formatMessage('timetable.teacher')}
                      aria-label={formatMessage('timetable.teacher')}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <CheckBox
                      variant="primary"
                      checked={row.isSaturdayOnly}
                      onChange={(e) => handleUpdateRow(row.id, 'isSaturdayOnly', e.target.checked)}
                      aria-label={formatMessage('timetable.saturdayOnlyRow', {
                        discipline:
                          row.disciplineTitle || formatMessage('timetable.disciplineTitle'),
                      })}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <CheckBox
                      variant="primary"
                      checked={row.hasLateSlotAuthorization}
                      onChange={(e) =>
                        handleUpdateRow(row.id, 'hasLateSlotAuthorization', e.target.checked)
                      }
                      aria-label={formatMessage('timetable.lateSlotAuthRow', {
                        discipline:
                          row.disciplineTitle || formatMessage('timetable.disciplineTitle'),
                      })}
                    />
                  </td>
                  <td>
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      onClick={() => handleRemoveRow(row.id)}
                      aria-label={formatMessage('timetable.deleteRow', {
                        discipline:
                          row.disciplineTitle || formatMessage('timetable.disciplineTitle'),
                      })}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.tableActions}>
          <Button type="button" variant="secondary" onClick={handleAddRow}>
            <Plus size={16} /> {formatMessage('timetable.addAssignment')}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handleSaveWorkload}
            disabled={isSavingWorkload}
          >
            <Save size={16} /> {formatMessage('timetable.saveWorkload')}
          </Button>

          <Button type="button" variant="primary" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Spinner size="small" /> {formatMessage('timetable.generating')}
              </>
            ) : (
              <>
                <Play size={16} /> {formatMessage('timetable.generateDraft')}
              </>
            )}
          </Button>
        </div>
      </section>

      {/* Diagnostics and Candidates Display */}
      {draftResult && (
        <section className={styles.section}>
          <h3>{formatMessage('timetable.diagnosticsTitle')}</h3>
          <div className={styles.diagnosticsGrid}>
            <div className={styles.diagCard}>
              <span>{formatMessage('timetable.statesExplored')}</span>
              <strong>{draftResult.diagnostics.statesExplored}</strong>
            </div>
            <div className={styles.diagCard}>
              <span>{formatMessage('timetable.executionTime')}</span>
              <strong>
                {formatMessage('timetable.executionTimeVal', {
                  time: draftResult.diagnostics.timeMs,
                })}
              </strong>
            </div>
            <div className={styles.diagCard}>
              <span>{formatMessage('timetable.candidatesFound')}</span>
              <strong>{draftResult.candidates.length}</strong>
            </div>
          </div>

          <div className={styles.candidatesList}>
            {draftResult.candidates.map((cand, idx) => (
              <div
                key={idx}
                className={`${styles.candidateCard} ${
                  selectedCandidateIndex === idx ? styles.selectedCandidate : ''
                }`}
                onClick={() => setSelectedCandidateIndex(idx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedCandidateIndex(idx);
                  }
                }}
              >
                <div className={styles.candidateHeader}>
                  <span>{formatMessage('timetable.candidateNumbered', { number: idx + 1 })}</span>
                  <Tag tone={cand.penaltyScore === 0 ? 'success' : 'warning'}>
                    {formatMessage('timetable.penaltyScoreVal', { score: cand.penaltyScore })}
                  </Tag>
                </div>
                <div className={styles.penaltyDetails}>
                  {cand.penaltyScore === 0 ? (
                    <span>
                      <Check size={14} /> {formatMessage('timetable.noPenalties')}
                    </span>
                  ) : (
                    <span>
                      {formatMessage('timetable.softPenaltiesVal', { score: cand.penaltyScore })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Publication Action */}
          <div className={styles.publishRow}>
            {isPublished ? (
              <div className={styles.publishedBanner}>
                <CheckCircle2 size={18} /> {formatMessage('timetable.publishedSuccess')}
              </div>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={handlePublish}
                disabled={isPublishing}
              >
                {isPublishing ? (
                  <>
                    <Spinner size="small" /> {formatMessage('timetable.publishing')}
                  </>
                ) : (
                  <>
                    <Check size={16} /> {formatMessage('timetable.publishVersion')}
                  </>
                )}
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default TimetableManagement;
