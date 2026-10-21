import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectMoodleTab } from './ConnectMoodleTab';

describe('ConnectMoodleTab component', () => {
  it('should render hero title and feature cards', () => {
    render(<ConnectMoodleTab onConnect={vi.fn()} />);

    expect(screen.getByText('Підключення акаунту Moodle LMS')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /підключити moodle зараз/i })).toBeInTheDocument();
    expect(screen.getByText('Синхронізація оцінок')).toBeInTheDocument();
    expect(screen.getByText('Дедлайни та завдання')).toBeInTheDocument();
    expect(screen.getByText('Матеріали та курси')).toBeInTheDocument();
  });

  it('should trigger onConnect when connect button is clicked', async () => {
    const handleConnect = vi.fn();
    const user = userEvent.setup();

    render(<ConnectMoodleTab onConnect={handleConnect} />);

    await user.click(screen.getByRole('button', { name: /підключити moodle зараз/i }));
    expect(handleConnect).toHaveBeenCalledTimes(1);
  });
});
