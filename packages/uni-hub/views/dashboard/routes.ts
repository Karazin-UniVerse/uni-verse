import { OPPORTUNITIES_ROUTE } from '@core/constants/routes';
import { NAV_KEY, type NavKey, type StudyView } from './constants';

export const ROUTE = {
  Wall: '/wall',
  Study: '/study',
  Schedule: '/schedule',
  Opportunities: OPPORTUNITIES_ROUTE,
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

export const getNavHref = (navKey: NavKey, studyView?: StudyView): string =>
  studyView ? getStudyHref(studyView) : NAV_KEY_ROUTE[navKey];

export const getCourseHref = (courseId: number): string => `${ROUTE.Study}/courses/${courseId}`;

export const getAssignmentHref = (assignmentId: number, courseId?: number): string => {
  const href = `${ROUTE.Study}/assignments/${assignmentId}`;

  return courseId === undefined ? href : `${href}?course=${courseId}`;
};

export const getOpportunityHref = (opportunityId: string): string =>
  `${ROUTE.Opportunities}/${opportunityId}`;
