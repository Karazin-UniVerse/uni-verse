import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { LiveCountdown } from './LiveCountdown';
import styles from './LiveCountdown.module.scss';

describe('LiveCountdown component', () => {
  const BASE_TIMESTAMP_MS = 1_776_337_200_000;
  const BASE_UNIX_SEC = Math.floor(BASE_TIMESTAMP_MS / 1000);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIMESTAMP_MS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render remaining time formatted as HH:MM:SS when deadline is in the future', () => {
    const offsetSec = 10 * 3600 + 15 * 60 + 30;
    const targetUnixSec = BASE_UNIX_SEC + offsetSec;

    render(<LiveCountdown targetUnixSec={targetUnixSec} />);

    const countdown = screen.getByTitle('До дедлайна');

    expect(countdown).toBeInTheDocument();
    expect(countdown).toHaveTextContent('10:15:30');
    expect(countdown).toHaveClass(styles.countdown);
    expect(countdown).toHaveClass(styles.ok);
    expect(countdown).not.toHaveClass(styles.warning);
    expect(countdown).not.toHaveClass(styles.danger);
  });

  it('should apply ok tone when deadline is greater than or equal to 6 hours', () => {
    const sixHoursSec = 6 * 3600;
    const targetUnixSec = BASE_UNIX_SEC + sixHoursSec;

    render(<LiveCountdown targetUnixSec={targetUnixSec} />);

    const countdown = screen.getByTitle('До дедлайна');

    expect(countdown).toBeInTheDocument();
    expect(countdown).toHaveTextContent('06:00:00');
    expect(countdown).toHaveClass(styles.countdown);
    expect(countdown).toHaveClass(styles.ok);
    expect(countdown).not.toHaveClass(styles.warning);
    expect(countdown).not.toHaveClass(styles.danger);
  });

  it('should apply warning tone class when deadline is within 6 hours', () => {
    const offsetSec = 6 * 3600 - 1;
    const targetUnixSec = BASE_UNIX_SEC + offsetSec;

    render(<LiveCountdown targetUnixSec={targetUnixSec} />);

    const countdown = screen.getByTitle('До дедлайна');

    expect(countdown).toBeInTheDocument();
    expect(countdown).toHaveTextContent('05:59:59');
    expect(countdown).toHaveClass(styles.countdown);
    expect(countdown).toHaveClass(styles.warning);
    expect(countdown).not.toHaveClass(styles.ok);
    expect(countdown).not.toHaveClass(styles.danger);
  });

  it('should render "Термін сплив" with danger tone when deadline has passed (diff <= 0)', () => {
    const targetUnixSec = BASE_UNIX_SEC - 45;

    render(<LiveCountdown targetUnixSec={targetUnixSec} />);

    const countdown = screen.getByTitle('Термін сплив');

    expect(countdown).toBeInTheDocument();
    expect(countdown).toHaveTextContent('Термін сплив');
    expect(countdown).toHaveClass(styles.countdown);
    expect(countdown).toHaveClass(styles.danger);
    expect(countdown).not.toHaveClass(styles.ok);
    expect(countdown).not.toHaveClass(styles.warning);
  });

  it('should render "Термін сплив" with danger tone when deadline is exactly now (diff === 0)', () => {
    const targetUnixSec = BASE_UNIX_SEC;

    render(<LiveCountdown targetUnixSec={targetUnixSec} />);

    const countdown = screen.getByTitle('Термін сплив');

    expect(countdown).toBeInTheDocument();
    expect(countdown).toHaveTextContent('Термін сплив');
    expect(countdown).toHaveClass(styles.countdown);
    expect(countdown).toHaveClass(styles.danger);
    expect(countdown).not.toHaveClass(styles.ok);
    expect(countdown).not.toHaveClass(styles.warning);
  });

  it('should apply custom className when provided to active countdown', () => {
    const targetUnixSec = BASE_UNIX_SEC + 3600;
    const customClass = 'test-custom-class';

    render(<LiveCountdown className={customClass} targetUnixSec={targetUnixSec} />);

    const countdown = screen.getByTitle('До дедлайна');

    expect(countdown).toHaveClass(customClass);
    expect(countdown).toHaveClass(styles.countdown);
  });

  it('should apply custom className when provided to expired countdown', () => {
    const targetUnixSec = BASE_UNIX_SEC - 3600;
    const customClass = 'test-expired-class';

    render(<LiveCountdown className={customClass} targetUnixSec={targetUnixSec} />);

    const countdown = screen.getByTitle('Термін сплив');

    expect(countdown).toHaveClass(customClass);
    expect(countdown).toHaveClass(styles.countdown);
  });

  it('should update remaining time countdown on interval tick', () => {
    const targetUnixSec = BASE_UNIX_SEC + 5;

    render(<LiveCountdown targetUnixSec={targetUnixSec} />);

    const countdown = screen.getByTitle('До дедлайна');

    expect(countdown).toHaveTextContent('00:00:05');

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(countdown).toHaveTextContent('00:00:03');

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(countdown).toHaveTextContent('00:00:01');
  });

  it('should transition to expired state when timer advances past deadline', () => {
    const targetUnixSec = BASE_UNIX_SEC + 2;

    render(<LiveCountdown targetUnixSec={targetUnixSec} />);

    const countdown = screen.getByTitle('До дедлайна');

    expect(countdown).toHaveTextContent('00:00:02');
    expect(countdown).toHaveClass(styles.warning);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const expiredCountdown = screen.getByTitle('Термін сплив');

    expect(expiredCountdown).toHaveTextContent('Термін сплив');
    expect(expiredCountdown).toHaveClass(styles.danger);
    expect(expiredCountdown).not.toHaveClass(styles.warning);
  });

  it('should transition tone from ok to warning when time crosses within 6 hours', () => {
    const targetUnixSec = BASE_UNIX_SEC + 6 * 3600 + 2;

    render(<LiveCountdown targetUnixSec={targetUnixSec} />);

    const countdown = screen.getByTitle('До дедлайна');

    expect(countdown).toHaveClass(styles.ok);
    expect(countdown).not.toHaveClass(styles.warning);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(countdown).toHaveClass(styles.warning);
    expect(countdown).not.toHaveClass(styles.ok);
  });
});
