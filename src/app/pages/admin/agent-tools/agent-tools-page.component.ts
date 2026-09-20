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
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucideSearch, lucideWrench } from '@ng-icons/lucide';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { problemDetailMessage } from '../../../http/problem-details';
import type { SaAgentToolSummaryDto } from '../../../models/admin/agent-tools.models';
import { adminAbsolutePath } from '../../../routing/app-paths';
import { SaAgentToolsService } from '../../../services/admin/sa-agent-tools.service';

@Component({
  selector: 'app-agent-tools-page',
  imports: [
    RouterLink,
    NgIcon,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputGroupImports,
  ],
  providers: [provideIcons({ lucideWrench, lucidePencil, lucideSearch })],
  templateUrl: './agent-tools-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentToolsPageComponent implements OnInit {
  private readonly toolsService = inject(SaAgentToolsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  readonly loading = signal(true);
  readonly listError = signal<string | null>(null);
  readonly tools = signal<SaAgentToolSummaryDto[]>([]);
  readonly searchInput = signal('');

  ngOnInit(): void {
    void this.refreshList();

    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.refreshList();
      });
  }

  editLink(toolId: string): string[] {
    return adminAbsolutePath('agent-tools', toolId, 'edit');
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchInput.set(value);
    this.search$.next(value);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleString();
  }

  private async refreshList(): Promise<void> {
    this.loading.set(true);
    this.listError.set(null);
    try {
      this.tools.set(await this.toolsService.list(this.searchInput()));
    } catch (err) {
      this.listError.set(problemDetailMessage(err as HttpErrorResponse));
      this.tools.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
