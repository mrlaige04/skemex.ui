import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  injectFlexRenderContext,
  type CellContext,
} from '@tanstack/angular-table';
import { HlmButtonImports } from 'spartan/button';
import type { NotificationDto } from '../../../models/notifications/notifications.models';
import { NOTIFICATIONS_TABLE_HOST } from './notifications-table-host';

@Component({
  selector: 'app-notifications-actions-cell',
  imports: [...HlmButtonImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex justify-end">
      @if (!item().isRead) {
        <button
          type="button"
          hlmBtn
          variant="ghost"
          size="sm"
          [disabled]="isMarking()"
          (click)="onMarkRead()"
        >
          Mark read
        </button>
      } @else {
        <span class="text-muted-foreground text-xs">Read</span>
      }
    </div>
  `,
})
export class NotificationsActionsCellComponent {
  private readonly host = inject(NOTIFICATIONS_TABLE_HOST);
  private readonly ctx = injectFlexRenderContext<CellContext<NotificationDto, unknown>>();

  readonly item = computed(() => this.ctx.row.original);
  readonly isMarking = computed(() => this.host.markingId() === this.item().id);

  onMarkRead(): void {
    void this.host.markRead(this.item());
  }
}
