import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { PaginatedList } from '../../models/paginated-list';
import type {
  ListNotificationsParams,
  MarkAllNotificationsReadResult,
  NotificationDto,
  UnreadNotificationCountDto,
} from '../../models/notifications/notifications.models';
import { BaseHttp } from '../http/base-http.service';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(BaseHttp);

  /** Shared badge count — updated by the bell poller and mark-read actions. */
  readonly unreadCount = signal(0);

  list(options: ListNotificationsParams = {}): Promise<PaginatedList<NotificationDto>> {
    return firstValueFrom(
      this.api.get<PaginatedList<NotificationDto>>('api/notifications', this.toParams(options)),
    );
  }

  getUnreadCount(): Promise<UnreadNotificationCountDto> {
    return firstValueFrom(
      this.api.get<UnreadNotificationCountDto>('api/notifications/unread-count'),
    );
  }

  async refreshUnreadCount(): Promise<number> {
    const result = await this.getUnreadCount();
    this.unreadCount.set(result.count);
    return result.count;
  }

  getRecent(take = 10): Promise<NotificationDto[]> {
    return firstValueFrom(
      this.api.get<NotificationDto[]>('api/notifications/recent', { take }),
    );
  }

  markRead(id: string): Promise<NotificationDto> {
    return firstValueFrom(
      this.api.post<Record<string, never>, NotificationDto>(`api/notifications/${id}/read`, {}),
    );
  }

  markAllRead(): Promise<MarkAllNotificationsReadResult> {
    return firstValueFrom(
      this.api.post<Record<string, never>, MarkAllNotificationsReadResult>(
        'api/notifications/read-all',
        {},
      ),
    );
  }

  private toParams(options: ListNotificationsParams): Record<string, string | number | boolean> {
    const params: Record<string, string | number | boolean> = {
      page: options.page ?? 1,
      pageSize: options.pageSize ?? 20,
      sort: options.sort ?? 'createdAtDesc',
    };

    const search = options.search?.trim();
    if (search) {
      params['search'] = search;
    }
    if (options.severity) {
      params['severity'] = options.severity;
    }
    if (options.isRead !== undefined) {
      params['isRead'] = options.isRead;
    }

    return params;
  }
}
