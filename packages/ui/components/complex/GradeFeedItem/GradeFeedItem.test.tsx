import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GradeFeedItem } from './GradeFeedItem';
import styles from './GradeFeedItem.module.scss';

describe('GradeFeedItem Component', () => {
  const defaultProps = {
    title: 'Lab 3: Normalization',
    courseName: 'Databases',
    dateText: 'Sep 12, 2026',
    score: '85 / 100',
  };

  it('should render grade item with course title, score, and accessible text', () => {
    render(<GradeFeedItem {...defaultProps} />);

    const button = screen.getByRole('button', { name: /lab 3: normalization/i });
    const scoreBadge = screen.getByText('85 / 100');

    expect(button).toBeInTheDocument();
    expect(screen.getByText('Lab 3: Normalization')).toBeInTheDocument();
    expect(screen.getByText('Databases')).toBeInTheDocument();
    expect(screen.getByText('Sep 12, 2026')).toBeInTheDocument();
    expect(scoreBadge).toBeInTheDocument();
    expect(scoreBadge).toHaveClass(styles.scoreBadge);
    expect(scoreBadge).toHaveClass(styles.toneDefault);
  });

  it('should render grade status or percentage indicator correctly', () => {
    const { rerender } = render(
      <GradeFeedItem {...defaultProps} score="95%" scoreTone="success" />,
    );

    const successBadge = screen.getByText('95%');

    expect(successBadge).toHaveClass(styles.toneSuccess);

    rerender(<GradeFeedItem {...defaultProps} score="Needs Review" scoreTone="warning" />);

    const warningBadge = screen.getByText('Needs Review');

    expect(warningBadge).toHaveClass(styles.toneWarning);

    rerender(<GradeFeedItem {...defaultProps} score="Failed" scoreTone="danger" />);

    const dangerBadge = screen.getByText('Failed');

    expect(dangerBadge).toHaveClass(styles.toneDanger);

    rerender(<GradeFeedItem {...defaultProps} score="Submitted" scoreTone="info" />);

    const infoBadge = screen.getByText('Submitted');

    expect(infoBadge).toHaveClass(styles.toneInfo);

    rerender(
      <GradeFeedItem {...defaultProps} score={100} scoreBadgeClassName="custom-score-badge" />,
    );

    const customBadge = screen.getByText('100');

    expect(customBadge).toHaveClass('custom-score-badge');
  });

  it('should render feedback or date if provided', () => {
    const { rerender } = render(
      <GradeFeedItem
        {...defaultProps}
        titleTooltip="Great work on normalization schema"
        dateText="Yesterday at 14:00"
      />,
    );

    const buttonWithTooltip = screen.getByRole('button');

    expect(buttonWithTooltip).toHaveAttribute('title', 'Great work on normalization schema');
    expect(screen.getByText('Yesterday at 14:00')).toBeInTheDocument();

    rerender(<GradeFeedItem {...defaultProps} titleTooltip={undefined} />);

    const buttonWithoutTooltip = screen.getByRole('button');

    expect(buttonWithoutTooltip).not.toHaveAttribute('title');
  });

  it('should call onClick callback when item is interactive/clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<GradeFeedItem {...defaultProps} onClick={handleClick} />);

    const button = screen.getByRole('button');

    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should apply custom className', () => {
    render(
      <GradeFeedItem {...defaultProps} className="custom-feed-item-class" animationDelayMs={120} />,
    );

    const button = screen.getByRole('button');

    expect(button).toHaveClass('custom-feed-item-class');
    expect(button).toHaveStyle({ animationDelay: '120ms' });
  });
});
