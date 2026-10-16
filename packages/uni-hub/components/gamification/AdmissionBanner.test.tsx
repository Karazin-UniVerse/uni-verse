import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { AdmissionBanner } from './AdmissionBanner';

describe('AdmissionBanner component', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'uk');
    window.dispatchEvent(new Event('language-change'));
  });

  afterEach(() => {
    localStorage.removeItem('universe-lang');
    window.dispatchEvent(new Event('language-change'));
  });

  it('should render admitted state with success tone and score', () => {
    render(
      <LanguageProvider>
        <AdmissionBanner isAdmitted={true} semesterScore={45} />
      </LanguageProvider>,
    );

    const banner = screen.getByRole('status');

    expect(banner).toBeInTheDocument();
    expect(banner.className).toMatch(/bannerSuccess/);
    expect(banner.className).not.toMatch(/bannerDanger/);
    expect(screen.getByText('🟢')).toBeInTheDocument();
    expect(banner).toHaveTextContent(
      'Допущено до іспиту (45 / 60 б. — поріг допуску 30 б. досягнуто)',
    );
  });

  it('should render admitted state at threshold boundary score of 30', () => {
    render(
      <LanguageProvider>
        <AdmissionBanner isAdmitted={true} semesterScore={30} />
      </LanguageProvider>,
    );

    const banner = screen.getByRole('status');

    expect(banner).toBeInTheDocument();
    expect(banner.className).toMatch(/bannerSuccess/);
    expect(screen.getByText('🟢')).toBeInTheDocument();
    expect(banner).toHaveTextContent(
      'Допущено до іспиту (30 / 60 б. — поріг допуску 30 б. досягнуто)',
    );
  });

  it('should render admitted state at maximum semester score of 60', () => {
    render(
      <LanguageProvider>
        <AdmissionBanner isAdmitted={true} semesterScore={60} />
      </LanguageProvider>,
    );

    const banner = screen.getByRole('status');

    expect(banner).toBeInTheDocument();
    expect(banner.className).toMatch(/bannerSuccess/);
    expect(screen.getByText('🟢')).toBeInTheDocument();
    expect(banner).toHaveTextContent(
      'Допущено до іспиту (60 / 60 б. — поріг допуску 30 б. досягнуто)',
    );
  });

  it('should render not admitted state with warning/danger tone, current score and remaining points', () => {
    render(
      <LanguageProvider>
        <AdmissionBanner isAdmitted={false} semesterScore={18} />
      </LanguageProvider>,
    );

    const banner = screen.getByRole('status');

    expect(banner).toBeInTheDocument();
    expect(banner.className).toMatch(/bannerDanger/);
    expect(banner.className).not.toMatch(/bannerSuccess/);
    expect(screen.getByText('🔴')).toBeInTheDocument();
    expect(banner).toHaveTextContent(
      'Не допущено до іспиту (18 / 60 б. — бракує 12 б. для допуску)',
    );
  });

  it('should render not admitted state when semester score is 0 with full 30 remaining points', () => {
    render(
      <LanguageProvider>
        <AdmissionBanner isAdmitted={false} semesterScore={0} />
      </LanguageProvider>,
    );

    const banner = screen.getByRole('status');

    expect(banner).toBeInTheDocument();
    expect(banner.className).toMatch(/bannerDanger/);
    expect(screen.getByText('🔴')).toBeInTheDocument();
    expect(banner).toHaveTextContent(
      'Не допущено до іспиту (0 / 60 б. — бракує 30 б. для допуску)',
    );
  });

  it('should render not admitted state just below threshold at 29 points', () => {
    render(
      <LanguageProvider>
        <AdmissionBanner isAdmitted={false} semesterScore={29} />
      </LanguageProvider>,
    );

    const banner = screen.getByRole('status');

    expect(banner).toBeInTheDocument();
    expect(banner.className).toMatch(/bannerDanger/);
    expect(screen.getByText('🔴')).toBeInTheDocument();
    expect(banner).toHaveTextContent(
      'Не допущено до іспиту (29 / 60 б. — бракує 1 б. для допуску)',
    );
  });

  it('should localize messages correctly in ukrainian and english', () => {
    const { unmount } = render(
      <LanguageProvider>
        <AdmissionBanner isAdmitted={true} semesterScore={35} />
      </LanguageProvider>,
    );

    const ukBanner = screen.getByRole('status');

    expect(ukBanner).toHaveTextContent(
      'Допущено до іспиту (35 / 60 б. — поріг допуску 30 б. досягнуто)',
    );

    unmount();

    localStorage.setItem('universe-lang', 'en');
    window.dispatchEvent(new Event('language-change'));

    render(
      <LanguageProvider>
        <AdmissionBanner isAdmitted={true} semesterScore={35} />
      </LanguageProvider>,
    );

    const enBanner = screen.getByRole('status');

    expect(enBanner).toHaveTextContent(
      'Admitted to the exam (35 / 60 pts — threshold of 30 pts reached)',
    );
  });

  it('should localize not admitted message correctly in english with remaining points', () => {
    localStorage.setItem('universe-lang', 'en');
    window.dispatchEvent(new Event('language-change'));

    render(
      <LanguageProvider>
        <AdmissionBanner isAdmitted={false} semesterScore={22} />
      </LanguageProvider>,
    );

    const banner = screen.getByRole('status');

    expect(banner).toBeInTheDocument();
    expect(banner.className).toMatch(/bannerDanger/);
    expect(screen.getByText('🔴')).toBeInTheDocument();
    expect(banner).toHaveTextContent(
      'Not admitted to the exam (22 / 60 pts — 8 pts needed to qualify)',
    );
  });

  it('should update localized text reactively when language changes', () => {
    render(
      <LanguageProvider>
        <AdmissionBanner isAdmitted={false} semesterScore={25} />
      </LanguageProvider>,
    );

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
