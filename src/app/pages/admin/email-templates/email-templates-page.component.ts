import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMail, lucideSearch } from '@ng-icons/lucide';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { problemDetailMessage } from '../../../http/problem-details';
import type { SaEmailTemplateSummaryDto } from '../../../models/admin/email-templates.models';
import { adminAbsolutePath } from '../../../routing/app-paths';
import { SaEmailTemplatesService } from '../../../services/admin/sa-email-templates.service';
import { ConfirmAlertDialogComponent } from '../../../shared/confirm-alert-dialog/confirm-alert-dialog.component';
import {
  RichTableComponent,
  type RichTableColumn,
} from '../../../shared/rich-table';
import { EmailTemplatesTableActionsCellComponent } from './email-templates-table-actions-cell.component';
import { EMAIL_TEMPLATES_TABLE_HOST, type EmailTemplatesTableHost } from './email-templates-table-host';
import { escapeHtml, formatDate, formatTemplateType } from './email-templates-page.utils';

@Component({
  selector: 'app-email-templates-page',
  imports: [
    NgIcon,
    RichTableComponent,
    ConfirmAlertDialogComponent,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
  ],
  providers: [
    provideIcons({ lucideMail, lucideSearch }),
    { provide: EMAIL_TEMPLATES_TABLE_HOST, useExisting: EmailTemplatesPageComponent },
  ],
  templateUrl: './email-templates-page.component.html',
  styleUrl: './email-templates-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailTemplatesPageComponent implements OnInit, EmailTemplatesTableHost {
  private readonly templatesService = inject(SaEmailTemplatesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  readonly loading = signal(true);
  readonly deletingId = signal<string | null>(null);
  readonly listError = signal<string | null>(null);
  readonly templates = signal<SaEmailTemplateSummaryDto[]>([]);
  readonly searchInput = signal('');
  readonly confirmDialogState = signal<'open' | 'closed'>('closed');
  readonly pendingDeleteTemplate = signal<SaEmailTemplateSummaryDto | null>(null);

  readonly columns: RichTableColumn<SaEmailTemplateSummaryDto>[] = [
    {
      key: 'title',
      label: 'Title',
      accessorFn: (row) => row.title,
      render: (row) => `<span class="font-medium">${escapeHtml(row.title)}</span>`,
      enableHiding: false,
    },
    {
      key: 'scope',
      label: 'Scope',
      accessorFn: (row) => row.scope,
      render: (row) => {
        const isSystem = row.isSystem && !row.tenantId;
        const badgeClass = isSystem
          ? 'bg-primary/10 text-primary'
          : 'bg-muted text-muted-foreground';
        return `<span class="inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${badgeClass}">${escapeHtml(row.scope)}</span>`;
      },
    },
    {
      key: 'type',
      label: 'Type',
      accessorFn: (row) => row.type,
      render: (row) =>
        `<span class="text-muted-foreground text-sm">${escapeHtml(formatTemplateType(row.type))}</span>`,
    },
    {
      key: 'subject',
      label: 'Subject',
      accessorFn: (row) => row.subject,
      render: (row) => `<span class="text-sm">${escapeHtml(row.subject)}</span>`,
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      accessorFn: (row) => row.updatedAt ?? row.createdAt,
      render: (row) =>
        `<span class="text-muted-foreground text-sm">${formatDate(row.updatedAt ?? row.createdAt)}</span>`,
    },
    {
      key: 'actions',
      label: 'Actions',
      header: '<div class="text-right">Actions</div>',
      component: EmailTemplatesTableActionsCellComponent,
      enableHiding: false,
    },
  ];

  ngOnInit(): void {
    void this.refreshList();

    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.refreshList();
      });
  }

  editLink(templateId: string): string[] {
    return adminAbsolutePath('email-templates', templateId, 'edit');
  }

  displayName(template: SaEmailTemplateSummaryDto): string {
    return template.title.trim() || formatTemplateType(template.type);
  }

  canDelete(template: SaEmailTemplateSummaryDto): boolean {
    return !template.isSystem;
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchInput.set(value);
    this.search$.next(value);
  }

  deleteTemplate(template: SaEmailTemplateSummaryDto): void {
    this.pendingDeleteTemplate.set(template);
    this.confirmDialogState.set('open');
  }

  pendingDeleteTemplateName(): string {
    const template = this.pendingDeleteTemplate();
    return template ? this.displayName(template) : '';
  }

  async confirmDeleteTemplate(): Promise<void> {
    const template = this.pendingDeleteTemplate();
    this.pendingDeleteTemplate.set(null);
    if (!template) {
      return;
    }

    this.deletingId.set(template.id);
    this.listError.set(null);
    try {
      await this.templatesService.delete(template.id);
      await this.refreshList();
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.deletingId.set(null);
    }
  }

  private async refreshList(): Promise<void> {    this.loading.set(true);
    this.listError.set(null);
    try {
      const items = await this.templatesService.list(this.searchInput());
      this.templates.set(items);
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
      this.templates.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}

