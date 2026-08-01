import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBot, lucidePencil, lucidePlus, lucideTrash2 } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { problemDetailMessage } from '../../../http/problem-details';
import type { SaAiProviderDto } from '../../../models/admin/ai-providers.models';
import { adminAbsolutePath } from '../../../routing/app-paths';
import { SaAiProvidersService } from '../../../services/admin/sa-ai-providers.service';
import { ConfirmAlertDialogComponent } from '../../../shared/confirm-alert-dialog/confirm-alert-dialog.component';

@Component({
  selector: 'app-ai-providers-page',
  imports: [
    RouterLink,
    NgIcon,
    ConfirmAlertDialogComponent,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
  ],
  providers: [provideIcons({ lucidePlus, lucideBot, lucidePencil, lucideTrash2 })],
  templateUrl: './ai-providers-page.component.html',
  styleUrl: './ai-providers-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiProvidersPageComponent implements OnInit {
  private readonly providersService = inject(SaAiProvidersService);

  readonly loading = signal(true);
  readonly deletingId = signal<string | null>(null);
  readonly listError = signal<string | null>(null);
  readonly providers = signal<SaAiProviderDto[]>([]);
  readonly confirmDialogState = signal<'open' | 'closed'>('closed');
  readonly pendingDelete = signal<SaAiProviderDto | null>(null);
  readonly providersNewLink = adminAbsolutePath('ai-providers', 'new');

  ngOnInit(): void {
    void this.refreshList();
  }

  editLink(id: string): string[] {
    return adminAbsolutePath('ai-providers', id, 'edit');
  }

  deleteProvider(provider: SaAiProviderDto): void {
    this.pendingDelete.set(provider);
    this.confirmDialogState.set('open');
  }

  pendingDeleteName(): string {
    return this.pendingDelete()?.name ?? '';
  }

  async confirmDelete(): Promise<void> {
    const provider = this.pendingDelete();
    this.pendingDelete.set(null);
    if (!provider) {
      return;
    }

    this.deletingId.set(provider.id);
    this.listError.set(null);
    try {
      await this.providersService.delete(provider.id);
      await this.refreshList();
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.deletingId.set(null);
    }
  }

  private async refreshList(): Promise<void> {
    this.loading.set(true);
    this.listError.set(null);
    try {
      this.providers.set(await this.providersService.list());
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
      this.providers.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
