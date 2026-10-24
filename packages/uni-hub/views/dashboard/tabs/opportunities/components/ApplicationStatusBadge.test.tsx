import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { withLanguage } from '@uni-hub/utils/test-utils';
import type { OpportunityAppStatus } from '@core/constants/opportunities';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

const renderBadge = (status: OpportunityAppStatus | string) => {
  return render(
    withLanguage(<ApplicationStatusBadge status={status as OpportunityAppStatus} />),
  );
};

describe('ApplicationStatusBadge component', () => {
  beforeEach(() => {
    localStorage.setItem('universe-lang', 'uk');
  });

  it('should render SUBMITTED status badge with Send icon and localized text', () => {
    const { container } = renderBadge('SUBMITTED');
    const badgeText = screen.getByText('Надіслано');
    const icon = container.querySelector('svg.lucide-send');
    const badgeWrapper = container.firstChild as HTMLElement;

    expect(badgeText).toBeInTheDocument();
    expect(icon).toBeInTheDocument();
    expect(badgeWrapper).toContainElement(icon as HTMLElement);
    expect(badgeWrapper).toContainElement(badgeText);
  });

  it('should render UNDER_REVIEW status badge with Clock icon and localized text', () => {
    const { container } = renderBadge('UNDER_REVIEW');
    const badgeText = screen.getByText('На розгляді');
    const icon = container.querySelector('svg.lucide-clock');
    const badgeWrapper = container.firstChild as HTMLElement;

    expect(badgeText).toBeInTheDocument();
    expect(icon).toBeInTheDocument();
    expect(badgeWrapper).toContainElement(icon as HTMLElement);
    expect(badgeWrapper).toContainElement(badgeText);
  });

  it('should render ACCEPTED status badge with CheckCircle2 icon and localized text', () => {
    const { container } = renderBadge('ACCEPTED');
    const badgeText = screen.getByText('Прийнято');
    const icon = container.querySelector('svg.lucide-check-circle-2');
    const badgeWrapper = container.firstChild as HTMLElement;

    expect(badgeText).toBeInTheDocument();
    expect(icon).toBeInTheDocument();
    expect(badgeWrapper).toContainElement(icon as HTMLElement);
    expect(badgeWrapper).toContainElement(badgeText);
  });

  it('should render REJECTED status badge with XCircle icon and localized text', () => {
    const { container } = renderBadge('REJECTED');
    const badgeText = screen.getByText('Відхилено');
    const icon = container.querySelector('svg.lucide-x-circle');
    const badgeWrapper = container.firstChild as HTMLElement;

    expect(badgeText).toBeInTheDocument();
    expect(icon).toBeInTheDocument();
    expect(badgeWrapper).toContainElement(icon as HTMLElement);
    expect(badgeWrapper).toContainElement(badgeText);
  });

  it('should render WITHDRAWN status badge with X icon and localized text', () => {
    const { container } = renderBadge('WITHDRAWN');
    const badgeText = screen.getByText('Відкликано');
    const icon = container.querySelector('svg.lucide-x');
    const badgeWrapper = container.firstChild as HTMLElement;

    expect(badgeText).toBeInTheDocument();
    expect(icon).toBeInTheDocument();
    expect(badgeWrapper).toContainElement(icon as HTMLElement);
    expect(badgeWrapper).toContainElement(badgeText);
  });

  it('should render Tag fallback for unrecognized status', () => {
    const { container } = renderBadge('UNKNOWN_STATUS');
    const tag = screen.getByText('UNKNOWN_STATUS');
    const icon = container.querySelector('svg');

    expect(tag).toBeInTheDocument();
    expect(tag.tagName.toLowerCase()).toBe('span');
    expect(icon).not.toBeInTheDocument();
  });
});
