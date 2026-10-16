import { NAV_KEY, type NavKey, type StudyView } from './constants';

export const ROUTE = {
  Wall: '/wall',
  Study: '/study',
  Schedule: '/schedule',
  Opportunities: '/opportunities',
  ConnectMoodle: '/connect-moodle',
} as const;

export const NAV_KEY_ROUTE: Record<NavKey, string> = {
  [NAV_KEY.Overview]: ROUTE.Wall,
  [NAV_KEY.Study]: ROUTE.Study,
  [NAV_KEY.Schedule]: ROUTE.Schedule,
  [NAV_KEY.Opportunities]: ROUTE.Opportunities,
  [NAV_KEY.ConnectMoodle]: ROUTE.ConnectMoodle,
};

export function getNavKeyFromPathname(pathname: string): NavKey {
  const navKey = Object.values(NAV_KEY).find((key) => {
    const route = NAV_KEY_ROUTE[key];

    return pathname === route || pathname.startsWith(`${route}/`);
  });

  return navKey ?? NAV_KEY.Overview;
}

export const getStudyHref = (view: StudyView): string => `${ROUTE.Study}?view=${view}`;

export const getCourseHref = (courseId: number): string => `${ROUTE.Study}/courses/${courseId}`;

export const getAssignmentHref = (assignmentId: number): string =>
  `${ROUTE.Study}/assignments/${assignmentId}`;

export const getOpportunityHref = (opportunityId: string): string =>
  `${ROUTE.Opportunities}/${opportunityId}`;
