import clsx from 'clsx';
import { SlidersHorizontal } from 'lucide-react';
import React, { useId, useRef, useState } from 'react';
import type { OpportunityPaymentType } from '@core/constants/opportunities';
import { Button } from '../../una/Button';
import { Popover } from '../../una/Popover';
import { Select } from '../../una/Select';
import { CheckBox } from '../../una/inputs/CheckBox';
import { MultiSelect } from '../../una/inputs/MultiSelect';
import type {
  OpportunityFilterPanelProps,
  OpportunityFilterValue,
} from './OpportunityFilterPanel.types';
import styles from './OpportunityFilterPanel.module.scss';

const PANEL_WIDTH = 360;

const getActiveFilterCount = ({
  paymentType,
  isRecruiting,
  tags,
}: OpportunityFilterValue): number =>
  Number(paymentType !== '') + Number(isRecruiting) + Number(tags.length > 0);

export const OpportunityFilterPanel: React.FC<OpportunityFilterPanelProps> = ({
  value,
  onApply,
  labels,
  tagGroups,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<OpportunityFilterValue>(value);

  const anchorRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const paymentId = useId();
  const recruitingId = useId();
  const tagsId = useId();
  const activeCount = getActiveFilterCount(value);

  const handleToggle = (): void => {
    if (!isOpen) {
      setDraft(value);
    }

    setIsOpen(!isOpen);
  };

  const handleApply = (event: React.SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onApply(draft);
    setIsOpen(false);
  };

  return (
    <div ref={anchorRef} className={clsx(styles.root, className)}>
      <Button
        type="button"
        variant="secondary"
        onClick={handleToggle}
        aria-label={labels.open}
        title={labels.open}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        className={styles.trigger}
      >
        <SlidersHorizontal size={18} aria-hidden />
        {activeCount > 0 && <span className={styles.badge}>{activeCount}</span>}
      </Button>

      <Popover
        open={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={anchorRef}
        placement="bottom-end"
        width={PANEL_WIDTH}
        title={labels.title}
        closeLabel={labels.close}
        className={styles.popover}
      >
        <form id={panelId} onSubmit={handleApply} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor={paymentId} className={styles.label}>
              {labels.paymentType}
            </label>
            <Select
              id={paymentId}
              aria-label={labels.paymentType}
              value={draft.paymentType}
              onChange={(paymentType) =>
                setDraft((previous) => ({
                  ...previous,
                  paymentType: paymentType as OpportunityPaymentType | '',
                }))
              }
              options={[
                { value: '', label: labels.paymentAll },
                { value: 'PAID', label: labels.paymentPaid },
                { value: 'UNPAID', label: labels.paymentUnpaid },
              ]}
            />
          </div>

          <label htmlFor={recruitingId} className={styles.checkboxRow}>
            <CheckBox
              id={recruitingId}
              variant="primary"
              checked={draft.isRecruiting}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, isRecruiting: event.target.checked }))
              }
            />
            <span>{labels.recruiting}</span>
          </label>

          <div className={styles.field}>
            <label htmlFor={tagsId} className={styles.label}>
              {labels.tags}
            </label>
            <MultiSelect
              id={tagsId}
              groups={tagGroups}
              value={draft.tags}
              onChange={(tags) => setDraft((previous) => ({ ...previous, tags }))}
              placeholder={labels.tagsPlaceholder}
              removeLabel={labels.removeTag}
            />
          </div>

          <Button type="submit" variant="primary" className={styles.apply}>
            {labels.apply}
          </Button>
        </form>
      </Popover>
    </div>
  );
};

export default OpportunityFilterPanel;
