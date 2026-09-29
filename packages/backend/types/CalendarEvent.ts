export interface MoodleCalendarCourse {
  id: number;
  fullname: string;
  shortname?: string;
  idnumber?: string;
  summary?: string;
  summaryformat?: number;
  startdate?: number;
  enddate?: number;
  visible?: boolean;
  fullnamedisplay?: string;
  viewurl?: string;
  courseimage?: string;
  isfavourite?: boolean;
  hidden?: boolean;
  timeaccess?: number;
  showshortname?: boolean;
  coursecategory?: string;
}

export interface MoodleCalendarEvent {
  id: number;
  name: string;
  description?: string;
  descriptionformat?: number;
  location?: string;
  categoryid?: number | null;
  groupid?: number | null;
  userid?: number | null;
  repeatid?: number | null;
  eventcount?: number | null;
  component?: string | null;
  modulename?: string | null;
  activityname?: string | null;
  activitystr?: string | null;
  instance?: number | null;
  eventtype: string;
  timestart: number;
  timeduration?: number;
  timesort: number;
  timeusermidnight?: number;
  visible?: number;
  timemodified?: number;
  overdue?: boolean;
  url?: string;
  formattedtime?: string;
  course?: MoodleCalendarCourse | false;
  isactionevent?: boolean;
  iscourseevent?: boolean;
  iscategoryevent?: boolean;
  islastday?: boolean;
  popupname?: string;
  mindaytimestamp?: number | null;
  mindayerror?: string | null;
  maxdaytimestamp?: number | null;
  maxdayerror?: string | null;
  draggable?: boolean;
}

export interface MoodleUpcomingEventsResponse {
  events: MoodleCalendarEvent[];
  firstid?: number | null;
  lastid?: number | null;
}
