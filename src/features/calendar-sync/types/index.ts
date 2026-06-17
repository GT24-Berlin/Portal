export type CalendarProvider = 'GOOGLE' | 'MICROSOFT' | 'APPLE';

export type CalendarConnectionRow = {
  id: string;
  provider: CalendarProvider;
  accountEmail: string | null;
  isActive: boolean;
  lastSyncedAt: string | null;
  calendarId: string | null;
};

export type CalendarEventInput = {
  appointmentRequestId: string;
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
  location?: string;
};
