import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { uk } from '@uni-hub/i18n/locales/uk';
import { DeanTopicChips, DEAN_TOPIC_KEYS } from './DeanTopicChips';

describe('DeanTopicChips component', () => {
  it('should render topic chips with accessible roles and labels', () => {
    render(<DeanTopicChips selectedTopic="" onSelectTopic={vi.fn()} />);

    const group = screen.getByRole('radiogroup', { name: uk['dean.sectionLabel'] });
    const chips = screen.getAllByRole('radio');

    expect(group).toBeInTheDocument();
    expect(chips).toHaveLength(DEAN_TOPIC_KEYS.length);

    for (const key of DEAN_TOPIC_KEYS) {
      expect(screen.getByRole('radio', { name: uk[key] })).toBeInTheDocument();
    }
  });

  it('should trigger onSelectTopic when a chip is clicked', async () => {
    const handleSelectTopic = vi.fn();
    const user = userEvent.setup();

    render(<DeanTopicChips selectedTopic="" onSelectTopic={handleSelectTopic} />);

    const targetChip = screen.getByRole('radio', { name: uk['dean.topic.transcript'] });

    await user.click(targetChip);

    expect(handleSelectTopic).toHaveBeenCalledTimes(1);
    expect(handleSelectTopic).toHaveBeenCalledWith(uk['dean.topic.transcript']);
  });

  it('should reflect selected/active state on chosen chip', () => {
    const selectedTopic = uk['dean.topic.certificate'];

    render(<DeanTopicChips selectedTopic={selectedTopic} onSelectTopic={vi.fn()} />);

    const activeChip = screen.getByRole('radio', { name: selectedTopic });
    const inactiveChip = screen.getByRole('radio', { name: uk['dean.topic.session'] });

    expect(activeChip).toHaveAttribute('aria-checked', 'true');
    expect(activeChip).toHaveAttribute('tabindex', '0');
    expect(inactiveChip).toHaveAttribute('aria-checked', 'false');
    expect(inactiveChip).toHaveAttribute('tabindex', '-1');
  });
});
