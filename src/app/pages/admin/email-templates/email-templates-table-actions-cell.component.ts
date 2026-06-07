import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucideTrash2 } from '@ng-icons/lucide';
import { injectFlexRenderContext, type CellContext } from '@tanstack/angular-table';
import { HlmButtonImports } from 'spartan/button';
import { HlmIconImports } from 'spartan/icon';
import type { SaEmailTemplateSummaryDto } from '../../../models/admin/email-templates.models';
import { EMAIL_TEMPLATES_TABLE_HOST } from './email-templates-table-host';

@Component({
  selector: 'app-email-templates-table-actions-cell',
  imports: [RouterLink, NgIcon, ...HlmButtonImports, ...HlmIconImports],
  providers: [provideIcons({ lucidePencil, lucideTrash2 })],
  template: `
    <div class="flex justify-end gap-0.5">
      <a
        hlmBtn
        variant="ghost"
        size="icon"
        [routerLink]="editLink()"
        [attr.aria-label]="'Edit ' + ariaName()"
      >
        <ng-icon hlm name="lucidePencil" size="sm" />
      </a>
      @if (showDelete()) {
        <button
          type="button"
          hlmBtn
          variant="ghost"
          size="icon"
          class="text-destructive hover:text-destructive"
          [attr.aria-label]="'Delete ' + ariaName()"
          [disabled]="isDeleting()"
          (click)="onDelete()"
        >
          <ng-icon hlm name="lucideTrash2" size="sm" />
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailTemplatesTableActionsCellComponent {
  private readonly host = inject(EMAIL_TEMPLATES_TABLE_HOST);
  private readonly ctx = injectFlexRenderContext<CellContext<SaEmailTemplateSummaryDto, unknown>>();

  readonly template = computed(() => this.ctx.row.original);
  readonly editLink = computed(() => this.host.editLink(this.template().id));
  readonly ariaName = computed(() => this.host.displayName(this.template()));
  readonly showDelete = computed(() => this.host.canDelete(this.template()));
  readonly isDeleting = computed(() => this.host.deletingId() === this.template().id);

  onDelete(): void {
    this.host.deleteTemplate(this.template());
  }
}
