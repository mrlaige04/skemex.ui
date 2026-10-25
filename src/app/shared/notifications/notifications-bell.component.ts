import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { fromEvent, interval, merge, of, switchMap } from 'rxjs';
import { filter } from 'rxjs/operators';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import { HlmPopoverImports } from 'spartan/popover';
import type { NotificationDto } from '../../models/notifications/notifications.models';
import { APP_PATHS } from '../../routing/app-paths';
import { AuthService } from '../../services/auth/auth.service';
import { NotificationsService } from '../../services/notifications/notifications.service';
import { playNotificationSound } from './notification-sound.util';
import { severityTintClass } from './notification-severity.util';
import { formatRelativeTime } from './relative-time.util';

const POLL_MS = 60_000;

@Component({
  selector: 'app-notifications-bell',
  imports: [RouterLink, NgIcon, ...HlmButtonImports, ...HlmIconImports, ...HlmPopoverImports],
  providers: [provideIcons({ lucideBell })],
  templateUrl: './notifications-bell.component.html',
  styleUrl: './notifications-bell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
})
export class NotificationsBellComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly unreadCount = this.notifications.unreadCount;
  readonly recent = signal<NotificationDto[]>([]);
  readonly recentLoading = signal(false);
  readonly popoverState = signal<BrnDialogState>('closed');
  readonly seeAllLink = APP_PATHS.notifications;

  /** Baseline for detecting newly arrived unread items (set after first successful poll). */
  private previousUnreadCount: number | null = null;

  ngOnInit(): void {
    merge(
      interval(POLL_MS),
      fromEvent(document, 'visibilitychange').pipe(
        filter(() => document.visibilityState === 'visible'),
      ),
      of(0),
    )
      .pipe(
        filter(() => document.visibilityState === 'visible' && !!this.auth.accessToken()),
        switchMap(() => this.pollUnreadCount()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private async pollUnreadCount(): Promise<void> {
    try {
      const count = await this.notifications.refreshUnreadCount();
      if (this.previousUnreadCount !== null && count > this.previousUnreadCount) {
        playNotificationSound();
      }
      this.previousUnreadCount = count;
    } catch {
      // Keep previous baseline; next successful poll can still detect growth.
    }
  }

  onPopoverStateChanged(state: BrnDialogState): void {
    this.popoverState.set(state);
    if (state === 'open') {
      void this.loadRecent();
    }
  }

  relativeTime(iso: string): string {
    return formatRelativeTime(iso);
  }

  severityClass(severity: string): string {
    return severityTintClass(severity);
  }

  async onItemClick(item: NotificationDto): Promise<void> {
    this.popoverState.set('closed');
    if (!item.isRead) {
      try {
        await this.notifications.markRead(item.id);
        const count = this.notifications.unreadCount();
        this.notifications.unreadCount.set(Math.max(0, count - 1));
      } catch {
        // Navigation still proceeds; badge refreshes on next poll.
      }
    }
    const href = item.href?.trim();
    if (href) {
      await this.router.navigateByUrl(href.startsWith('/') ? href : `/${href}`);
    }
  }

  private async loadRecent(): Promise<void> {
    this.recentLoading.set(true);
    try {
      const items = await this.notifications.getRecent(10);
      this.recent.set(items);
      void this.notifications.refreshUnreadCount().catch(() => undefined);
    } catch {
      this.recent.set([]);
    } finally {
      this.recentLoading.set(false);
    }
  }
}
