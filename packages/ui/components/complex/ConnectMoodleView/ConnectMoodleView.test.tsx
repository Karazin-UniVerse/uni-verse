import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectMoodleView } from './ConnectMoodleView';
import type { ConnectMoodleFeatureItem } from './ConnectMoodleView';

describe('ConnectMoodleView Component', () => {
  const defaultProps = {
    title: 'Підключення акаунту Moodle LMS',
    subtitle: 'Отримайте повну синхронізацію навчального процесу в один клік.',
    connectCtaLabel: 'Підключити Moodle зараз',
    openMoodleLabel: 'Відкрити Moodle LMS',
    onConnect: vi.fn(),
  };

  it('should render moodle connect view with accessible title and instructions', () => {
    render(<ConnectMoodleView {...defaultProps} />);

    const heading = screen.getByRole('heading', {
      level: 3,
      name: 'Підключення акаунту Moodle LMS',
    });

    expect(heading).toBeInTheDocument();

    const description = screen.getByText(
      'Отримайте повну синхронізацію навчального процесу в один клік.',
    );

    expect(description).toBeInTheDocument();

    const connectButton = screen.getByRole('button', {
      name: /підключити moodle зараз/i,
    });

    expect(connectButton).toBeInTheDocument();

    const openLink = screen.getByRole('link', {
      name: /відкрити moodle lms/i,
    });

    expect(openLink).toBeInTheDocument();
  });

  it('should handle credential input and submit action', async () => {
    const handleConnect = vi.fn();
    const user = userEvent.setup();

    render(
      <ConnectMoodleView
        title="Connect Moodle Account"
        subtitle={
          <span>
            <label htmlFor="moodle-token-input">Moodle Web Service Token</label>
            <input
              id="moodle-token-input"
              type="password"
              placeholder="Enter your Moodle token"
              defaultValue=""
            />
          </span>
        }
        connectCtaLabel="Submit Credentials"
        openMoodleLabel="Open Moodle"
        onConnect={handleConnect}
      />,
    );

    const input = screen.getByLabelText(/moodle web service token/i);

    expect(input).toBeInTheDocument();

    await user.type(input, 'test-token-value-123');
    expect(input).toHaveValue('test-token-value-123');

    const submitBtn = screen.getByRole('button', { name: /submit credentials/i });

    await user.click(submitBtn);

    expect(handleConnect).toHaveBeenCalledTimes(1);
  });

  it('should display error state if connection fails or validation fails', () => {
    render(
      <ConnectMoodleView
        title="Connection Failed"
        subtitle={
          <span role="alert">Invalid credentials: unable to authenticate with Moodle server.</span>
        }
        connectCtaLabel="Retry Connection"
        openMoodleLabel="Open Moodle Portal"
        onConnect={vi.fn()}
      />,
    );

    const errorHeading = screen.getByRole('heading', {
      level: 3,
      name: 'Connection Failed',
    });

    expect(errorHeading).toBeInTheDocument();

    const alertElement = screen.getByRole('alert');

    expect(alertElement).toHaveTextContent(
      'Invalid credentials: unable to authenticate with Moodle server.',
    );

    const retryButton = screen.getByRole('button', { name: /retry connection/i });

    expect(retryButton).toBeInTheDocument();
  });

  it('should show loading state during connection attempt', () => {
    render(
      <ConnectMoodleView
        title="Connecting to Moodle..."
        subtitle="Verifying credentials and synchronizing courses..."
        connectCtaLabel={<span data-testid="connect-spinner">Connecting...</span>}
        openMoodleLabel="Open Moodle"
        onConnect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 3, name: 'Connecting to Moodle...' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('connect-spinner')).toBeInTheDocument();
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('should render external moodle link with default URL and security attributes', () => {
    render(<ConnectMoodleView {...defaultProps} />);

    const link = screen.getByRole('link', { name: /відкрити moodle lms/i });

    expect(link).toHaveAttribute('href', 'https://moodle.universemvp.tech');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render external moodle link with custom moodleUrl', () => {
    const customUrl = 'https://custom-moodle.university.edu';

    render(<ConnectMoodleView {...defaultProps} moodleUrl={customUrl} />);

    const link = screen.getByRole('link', { name: /відкрити moodle lms/i });

    expect(link).toHaveAttribute('href', customUrl);
  });

  it('should trigger onConnect callback when connect button is clicked', async () => {
    const handleConnect = vi.fn();
    const user = userEvent.setup();

    render(<ConnectMoodleView {...defaultProps} onConnect={handleConnect} />);

    const connectButton = screen.getByRole('button', {
      name: /підключити moodle зараз/i,
    });

    await user.click(connectButton);

    expect(handleConnect).toHaveBeenCalledTimes(1);
  });

  it('should render feature items with icons, titles, and descriptions', () => {
    const features: ConnectMoodleFeatureItem[] = [
      {
        id: 'grades',
        icon: <span data-testid="icon-grades">IconGrades</span>,
        title: 'Синхронізація оцінок',
        description: 'Ваша заліковка завжди під рукою з автоматичним розрахунком ECTS.',
      },
      {
        id: 'deadlines',
        icon: <span data-testid="icon-deadlines">IconDeadlines</span>,
        title: 'Дедлайни та завдання',
        description: 'Слідкуйте за дедлайнами лабораторних та практичних робіт.',
      },
      {
        id: 'no-icon-feat',
        title: 'Без іконки',
        description: 'Опис без іконки.',
      },
    ];

    render(<ConnectMoodleView {...defaultProps} features={features} />);

    const articles = screen.getAllByRole('article');

    expect(articles).toHaveLength(3);

    expect(screen.getByTestId('icon-grades')).toBeInTheDocument();
    expect(screen.getByTestId('icon-deadlines')).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { level: 4, name: 'Синхронізація оцінок' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Ваша заліковка завжди під рукою з автоматичним розрахунком ECTS.'),
    ).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 4, name: 'Без іконки' })).toBeInTheDocument();
  });

  it('should resolve fallback keys when feature IDs are not provided', () => {
    const featuresWithoutId: ConnectMoodleFeatureItem[] = [
      {
        title: 'Feature With String Title',
        description: 'Description 1',
      },
      {
        title: <span data-testid="node-title">Custom Node Title</span>,
        description: 'Feature With String Description Only',
      },
      {
        title: <span data-testid="node-title-2">Node Title</span>,
        description: <span data-testid="node-desc">Node Description</span>,
      },
    ];

    render(<ConnectMoodleView {...defaultProps} features={featuresWithoutId} />);

    const articles = screen.getAllByRole('article');

    expect(articles).toHaveLength(3);

    expect(screen.getByText('Feature With String Title')).toBeInTheDocument();
    expect(screen.getByText('Feature With String Description Only')).toBeInTheDocument();
    expect(screen.getByTestId('node-desc')).toBeInTheDocument();
  });

  it('should apply custom className to the container element', () => {
    const { container } = render(
      <ConnectMoodleView {...defaultProps} className="custom-moodle-class" />,
    );

    expect(container.firstElementChild).toHaveClass('custom-moodle-class');
  });

  it('should not render features grid when features list is empty or omitted', () => {
    const { rerender } = render(<ConnectMoodleView {...defaultProps} features={[]} />);

    expect(screen.queryByRole('article')).not.toBeInTheDocument();

    rerender(<ConnectMoodleView {...defaultProps} />);
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
});
