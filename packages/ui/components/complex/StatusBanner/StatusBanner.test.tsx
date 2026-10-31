import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusBanner } from './StatusBanner';
import styles from './StatusBanner.module.scss';
import type { StatusBannerTone } from './StatusBanner.types';

describe('StatusBanner Component', () => {
  it('should render status banner with accessible status role', () => {
    render(<StatusBanner tone="info">System operational</StatusBanner>);

    const banner = screen.getByRole('status');

    expect(banner).toBeInTheDocument();
    expect(screen.getByText('System operational')).toBeInTheDocument();
    expect(banner).toHaveClass(styles.statusBanner);
    expect(banner).toHaveClass(styles.bannerInfo);
  });

  it.each<{ tone: StatusBannerTone; expectedClass: string }>([
    { tone: 'success', expectedClass: styles.bannerSuccess },
    { tone: 'danger', expectedClass: styles.bannerDanger },
    { tone: 'warning', expectedClass: styles.bannerWarning },
    { tone: 'info', expectedClass: styles.bannerInfo },
  ])('should render $tone variant styling and icon', ({ tone, expectedClass }) => {
    render(
      <StatusBanner tone={tone} icon={<span data-testid={`icon-${tone}`}>{tone}</span>}>
        Message for {tone}
      </StatusBanner>,
    );

    const banner = screen.getByRole('status');
    const icon = screen.getByTestId(`icon-${tone}`);

    expect(banner).toHaveClass(expectedClass);
    expect(icon).toBeInTheDocument();
    expect(icon.parentElement).toHaveClass(styles.bannerIcon);
    expect(screen.getByText(`Message for ${tone}`)).toBeInTheDocument();
  });

  it('should render without icon container when icon prop is omitted', () => {
    render(<StatusBanner tone="info">No icon message</StatusBanner>);

    const banner = screen.getByRole('status');

    expect(banner.querySelector(`.${styles.bannerIcon}`)).not.toBeInTheDocument();
  });

  it('should fallback to info tone styling when tone is unrecognized', () => {
    render(
      <StatusBanner tone={'unknown' as unknown as StatusBannerTone}>Fallback message</StatusBanner>,
    );

    const banner = screen.getByRole('status');

    expect(banner).toHaveClass(styles.bannerInfo);
  });

  it('should render interactive children', async () => {
    const handleAction = vi.fn();
    const user = userEvent.setup();

    render(
      <StatusBanner tone="info">
        <span>Settings updated</span>
        <button type="button" onClick={handleAction}>
          Undo change
        </button>
      </StatusBanner>,
    );

    const actionButton = screen.getByRole('button', { name: 'Undo change' });

    await user.click(actionButton);

    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('should apply custom className', () => {
    render(
      <StatusBanner tone="success" className="custom-status-banner">
        Custom class message
      </StatusBanner>,
    );

    const banner = screen.getByRole('status');

    expect(banner).toHaveClass('custom-status-banner');
    expect(banner).toHaveClass(styles.statusBanner);
    expect(banner).toHaveClass(styles.bannerSuccess);
  });
});
