import { describe, it, expect } from 'vitest';
import { NAV_KEY, STUDY_VIEW } from './constants';
import {
  getAssignmentHref,
  getCourseHref,
  getNavHref,
  getNavKeyFromPathname,
  getOpportunityHref,
  getStudyHref,
  NAV_KEY_ROUTE,
  ROUTE,
} from './routes';

describe('dashboard routes', () => {
  describe('getNavKeyFromPathname', () => {
    it('maps top-level paths to nav keys', () => {
      expect(getNavKeyFromPathname('/wall')).toBe(NAV_KEY.Overview);
      expect(getNavKeyFromPathname('/study')).toBe(NAV_KEY.Study);
      expect(getNavKeyFromPathname('/schedule')).toBe(NAV_KEY.Schedule);
      expect(getNavKeyFromPathname('/opportunities')).toBe(NAV_KEY.Opportunities);
      expect(getNavKeyFromPathname('/connect-moodle')).toBe(NAV_KEY.ConnectMoodle);
    });

    it('maps nested paths to the key of their first segment', () => {
      expect(getNavKeyFromPathname('/study/courses/5')).toBe(NAV_KEY.Study);
      expect(getNavKeyFromPathname('/study/assignments/7')).toBe(NAV_KEY.Study);
      expect(getNavKeyFromPathname('/opportunities/abc')).toBe(NAV_KEY.Opportunities);
    });

    it('falls back to overview for unknown paths', () => {
      expect(getNavKeyFromPathname('/unknown')).toBe(NAV_KEY.Overview);
      expect(getNavKeyFromPathname('/')).toBe(NAV_KEY.Overview);
    });

    it('does not match a path that only starts with a route name', () => {
      expect(getNavKeyFromPathname('/studying')).toBe(NAV_KEY.Overview);
    });
  });

  describe('NAV_KEY_ROUTE', () => {
    it('gives every nav key its own route', () => {
      expect(NAV_KEY_ROUTE).toEqual({
        [NAV_KEY.Overview]: ROUTE.Wall,
        [NAV_KEY.Study]: ROUTE.Study,
        [NAV_KEY.Schedule]: ROUTE.Schedule,
        [NAV_KEY.Opportunities]: ROUTE.Opportunities,
        [NAV_KEY.ConnectMoodle]: ROUTE.ConnectMoodle,
      });
    });
  });

  describe('getNavHref', () => {
    it('returns the route of the nav key', () => {
      expect(getNavHref(NAV_KEY.Schedule)).toBe('/schedule');
      expect(getNavHref(NAV_KEY.Study)).toBe('/study');
    });

    it('adds the study view when one is given', () => {
      expect(getNavHref(NAV_KEY.Study, STUDY_VIEW.Grades)).toBe('/study?view=grades');
    });
  });

  describe('href builders', () => {
    it('builds study, course, assignment and opportunity hrefs', () => {
      expect(getStudyHref(STUDY_VIEW.Assignments)).toBe('/study?view=assignments');
      expect(getCourseHref(5)).toBe('/study/courses/5');
      expect(getAssignmentHref(7)).toBe('/study/assignments/7');
      expect(getAssignmentHref(7, 5)).toBe('/study/assignments/7?course=5');
      expect(getOpportunityHref('x1')).toBe('/opportunities/x1');
    });
  });
});
