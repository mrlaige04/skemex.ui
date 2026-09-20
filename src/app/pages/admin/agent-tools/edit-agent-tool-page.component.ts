import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideWrench } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputImports } from 'spartan/input';
import { HlmLabelImports } from 'spartan/label';
import { problemDetailMessage } from '../../../http/problem-details';
import { adminAbsolutePath } from '../../../routing/app-paths';
import { SaAgentToolsService } from '../../../services/admin/sa-agent-tools.service';

@Component({
  selector: 'app-edit-agent-tool-page',
  imports: [
    RouterLink,
    FormField,
    NgIcon,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputImports,
    ...HlmLabelImports,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucideWrench })],
  templateUrl: './edit-agent-tool-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditAgentToolPageComponent implements OnInit {
  private readonly toolsService = inject(SaAgentToolsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly toolsListLink = adminAbsolutePath('agent-tools');
  readonly pageTitle = signal('Edit agent tool');
  readonly systemName = signal('');

  private readonly toolId = this.route.snapshot.paramMap.get('toolId') ?? '';

  readonly model = signal({
    description: '',
    systemPrompt: '',
  });

  readonly toolForm = form(this.model, (f) => {
    required(f.description);
    maxLength(f.description, 20_000);
    required(f.systemPrompt);
    maxLength(f.systemPrompt, 100_000);
  });

  ngOnInit(): void {
    if (!this.toolId) {
      this.loadError.set('Tool id is missing.');
      this.loading.set(false);
      return;
    }

    void this.loadTool();
  }

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.commit();
  }

  private async loadTool(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const tool = await this.toolsService.get(this.toolId);
      this.pageTitle.set(tool.systemName);
      this.systemName.set(tool.systemName);
      this.model.set({
        description: tool.description,
        systemPrompt: tool.systemPrompt,
      });
    } catch (err) {
      this.loadError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.loading.set(false);
    }
  }

  private async commit(): Promise<void> {
    if (this.saving() || !this.toolId) {
      return;
    }

    this.saving.set(true);
    try {
      await submit(this.toolForm, async (field) => {
        try {
          const m = field().value();
          await this.toolsService.update(this.toolId, {
            description: m.description.trim(),
            systemPrompt: m.systemPrompt.trim(),
          });
          await this.router.navigate(this.toolsListLink);
          return;
        } catch (err) {
          const message =
            err instanceof HttpErrorResponse
              ? problemDetailMessage(err)
              : 'Could not update agent tool.';
          return [{ fieldTree: field, kind: 'server', message }];
        }
      });
    } finally {
      this.saving.set(false);
    }
  }
}
