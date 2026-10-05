export interface MoodleNotification {
  id: number;
  useridfrom: number;
  useridto: number;
  subject: string;
  shortenedsubject?: string;
  text?: string;
  fullmessage?: string;
  fullmessageformat?: number;
  fullmessagehtml?: string;
  smallmessage?: string;
  contexturl?: string;
  contexturlname?: string;
  timecreated: number;
  timecreatedpretty?: string;
  timeread?: number | false;
  read: boolean;
  deleted?: boolean;
  iconurl?: string;
  component?: string;
  eventtype?: string;
  customdata?: string;
}

export interface MoodleNotificationsResponse {
  notifications: MoodleNotification[];
  unreadcount: number;
}
