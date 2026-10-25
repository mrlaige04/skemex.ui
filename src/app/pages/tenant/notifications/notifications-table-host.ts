import { InjectionToken, type Signal } from '@angular/core';
import type { NotificationDto } from '../../../models/notifications/notifications.models';

export interface NotificationsTableHost {
  markingId: Signal<string | null>;
  markRead(item: NotificationDto): void;
  openItem(item: NotificationDto): void;
}

export const NOTIFICATIONS_TABLE_HOST = new InjectionToken<NotificationsTableHost>(
  'NOTIFICATIONS_TABLE_HOST',
);
