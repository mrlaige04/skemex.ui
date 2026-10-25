export type NotificationSeverity = 'Info' | 'Success' | 'Warning' | 'Error';

export type NotificationSort = 'createdAtDesc' | 'createdAtAsc';

export interface NotificationDto {
  id: string;
  severity: NotificationSeverity | string;
  title: string;
  body: string | null;
  href: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface UnreadNotificationCountDto {
  count: number;
}

export interface MarkAllNotificationsReadResult {
  updatedCount: number;
}

export interface ListNotificationsParams {
  search?: string;
  severity?: NotificationSeverity | string;
  isRead?: boolean;
  sort?: NotificationSort;
  page?: number;
  pageSize?: number;
}
