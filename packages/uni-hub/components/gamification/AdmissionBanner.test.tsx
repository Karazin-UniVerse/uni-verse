import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { AdmissionBanner } from './AdmissionBanner';

const renderAdmissionBanner = (isAdmitted: boolean, semesterScore: number) =>
  render(withLanguage(<AdmissionBanner isAdmitted={isAdmitted} semesterScore={semesterScore} />));

describe('AdmissionBanner component', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'uk');
    window.dispatchEvent(new Event('language-change'));
  });

  afterEach(() => {
    localStorage.removeItem('universe-lang');
    window.dispatchEvent(new Event('language-change'));
  });

  it.each([45, 30, 60])(
    'should render admitted state with success tone at semester score %i',
    (score) => {
      renderAdmissionBanner(true, score);

      const banner = screen.getByRole('status');

      expect(banner).toBeInTheDocument();
      expect(banner.className).toMatch(/bannerSuccess/);
      expect(banner.className).not.toMatch(/bannerDanger/);
      expect(screen.getByText('🟢')).toBeInTheDocument();
      expect(banner).toHaveTextContent(
        `Допущено до іспиту (${score} / 60 б. — поріг допуску 30 б. досягнуто)`,
      );
    },
  );

  it.each([
    { score: 18, remaining: 12 },
    { score: 0, remaining: 30 },
    { score: 29, remaining: 1 },
  ])(
    'should render not admitted state with danger tone at score $score requiring $remaining pts',
    ({ score, remaining }) => {
      renderAdmissionBanner(false, score);

      const banner = screen.getByRole('status');

      expect(banner).toBeInTheDocument();
      expect(banner.className).toMatch(/bannerDanger/);
      expect(banner.className).not.toMatch(/bannerSuccess/);
      expect(screen.getByText('🔴')).toBeInTheDocument();
      expect(banner).toHaveTextContent(
        `Не допущено до іспиту (${score} / 60 б. — бракує ${remaining} б. для допуску)`,
      );
    },
  );

  it('should localize messages correctly in ukrainian and english', () => {
    const { unmount } = renderAdmissionBanner(true, 35);

    const ukBanner = screen.getByRole('status');

    expect(ukBanner).toHaveTextContent(
      'Допущено до іспиту (35 / 60 б. — поріг допуску 30 б. досягнуто)',
    );

    unmount();

    localStorage.setItem('universe-lang', 'en');
    window.dispatchEvent(new Event('language-change'));

    renderAdmissionBanner(true, 35);

    const enBanner = screen.getByRole('status');

    expect(enBanner).toHaveTextContent(
      'Admitted to the exam (35 / 60 pts — threshold of 30 pts reached)',
    );
  });

  it('should localize not admitted message correctly in english with remaining points', () => {
    localStorage.setItem('universe-lang', 'en');
    window.dispatchEvent(new Event('language-change'));

    renderAdmissionBanner(false, 22);

    const banner = screen.getByRole('status');

    expect(banner).toBeInTheDocument();
    expect(banner.className).toMatch(/bannerDanger/);
    expect(screen.getByText('🔴')).toBeInTheDocument();
    expect(banner).toHaveTextContent(
      'Not admitted to the exam (22 / 60 pts — 8 pts needed to qualify)',
    );
  });

  it('should update localized text reactively when language changes', () => {
    renderAdmissionBanner(false, 25);

    const banner = screen.getByRole('status');

    expect(banner).toHaveTextContent(
      'Не допущено до іспиту (25 / 60 б. — бракує 5 б. для допуску)',
    );

    act(() => {
      localStorage.setItem('universe-lang', 'en');
      window.dispatchEvent(new Event('language-change'));
    });

    expect(banner).toHaveTextContent(
      'Not admitted to the exam (25 / 60 pts — 5 pts needed to qualify)',
    );
  });
});
