import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  injectFlexRenderContext,
  type CellContext,
} from '@tanstack/angular-table';
import type { NotificationDto } from '../../../models/notifications/notifications.models';
import { NOTIFICATIONS_TABLE_HOST } from './notifications-table-host';

@Component({
  selector: 'app-notifications-title-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="max-w-md text-left" (click)="onOpen()">
      <span
        class="block text-sm"
        [class.font-semibold]="!item().isRead"
        [class.font-medium]="item().isRead"
      >
        {{ item().title }}
      </span>
      @if (item().body; as body) {
        <span class="text-muted-foreground mt-0.5 line-clamp-2 block text-xs">{{ body }}</span>
      }
    </button>
  `,
  styles: `
    button {
      border: 0;
      background: transparent;
      padding: 0;
      cursor: pointer;
    }
    button:hover .block:first-child {
      text-decoration: underline;
    }
  `,
})
export class NotificationsTitleCellComponent {
  private readonly host = inject(NOTIFICATIONS_TABLE_HOST);
  private readonly ctx = injectFlexRenderContext<CellContext<NotificationDto, unknown>>();

  readonly item = computed(() => this.ctx.row.original);

  onOpen(): void {
    void this.host.openItem(this.item());
  }
}
