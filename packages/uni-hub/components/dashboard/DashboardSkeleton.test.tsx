import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import pageStyles from '@uni-hub/views/DashboardPage.module.scss';
import { DashboardSkeleton } from './DashboardSkeleton';

describe('DashboardSkeleton', () => {
  it('should render dashboard skeleton layout with accessible busy state or skeleton placeholders', () => {
    const { container } = render(<DashboardSkeleton />);
    const root = container.firstElementChild as HTMLElement;
    const skeletonElements = root.querySelectorAll('[aria-hidden="true"]');

    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('aria-busy', 'true');
    expect(root).toHaveAttribute('aria-label', 'Загрузка данных');
    expect(screen.getByLabelText('Загрузка данных')).toBe(root);
    expect(skeletonElements).toHaveLength(44);

    skeletonElements.forEach((skeleton) => {
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('should render header, sidebar/nav, and main grid skeleton blocks', () => {
    const { container } = render(<DashboardSkeleton />);
    const studentCard = container.querySelector(`.${pageStyles.studentCard}`);
    const studentCardTop = container.querySelector(`.${pageStyles.studentCardTop}`);
    const studentIdentity = container.querySelector(`.${pageStyles.studentIdentity}`);
    const studentTags = container.querySelector(`.${pageStyles.studentTags}`);
    const studentFields = container.querySelectorAll(`.${pageStyles.studentField}`);
    const overviewHero = container.querySelector(`.${pageStyles.overviewHero}`);
    const statCards = container.querySelectorAll(`.${pageStyles.statCard}`);
    const splitSection = container.querySelector(`.${pageStyles.split}`);
    const panels = container.querySelectorAll(`.${pageStyles.panel}`);
    const listItems = container.querySelectorAll(`.${pageStyles.listItem}`);

    expect(studentCard).toBeInTheDocument();
    expect(studentCardTop).toBeInTheDocument();
    expect(studentIdentity).toBeInTheDocument();
    expect(studentTags).toBeInTheDocument();
    expect(studentFields).toHaveLength(8);
    expect(overviewHero).toBeInTheDocument();
    expect(statCards).toHaveLength(3);
    expect(splitSection).toBeInTheDocument();
    expect(panels).toHaveLength(2);
    expect(listItems).toHaveLength(7);
  });

  it('should render student avatar skeleton with circular border radius', () => {
    const { container } = render(<DashboardSkeleton />);
    const avatar = container.querySelector(`.${pageStyles.studentIdentity} > div`);

    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveStyle({
      width: '48px',
      height: '48px',
      borderRadius: '50%',
    });
  });
});
