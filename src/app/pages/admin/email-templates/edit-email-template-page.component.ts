import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideMail } from '@ng-icons/lucide';
import { HlmButtonImports } from 'spartan/button';
import { HlmCardImports } from 'spartan/card';
import { HlmIconImports } from 'spartan/icon';
import { HlmInputGroupImports } from 'spartan/input-group';
import { HlmInputImports } from 'spartan/input';
import { HlmLabelImports } from 'spartan/label';
import { problemDetailMessage } from '../../../http/problem-details';
import { adminAbsolutePath } from '../../../routing/app-paths';
import { SaEmailTemplatesService } from '../../../services/admin/sa-email-templates.service';
import { HtmlEditorComponent } from '../../../shared/html-editor/html-editor.component';
import { formatTemplateType } from './email-templates-page.utils';

@Component({
  selector: 'app-edit-email-template-page',
  imports: [
    RouterLink,
    FormField,
    NgIcon,
    HtmlEditorComponent,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmIconImports,
    ...HlmInputImports,
    ...HlmInputGroupImports,
    ...HlmLabelImports,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucideMail })],
  templateUrl: './edit-email-template-page.component.html',
  styleUrl: './edit-email-template-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditEmailTemplatePageComponent implements OnInit {
  private readonly templatesService = inject(SaEmailTemplatesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly bodyError = signal<string | null>(null);
  readonly templatesListLink = adminAbsolutePath('email-templates');
  readonly pageTitle = signal('Edit email template');
  readonly templateType = signal('');
  readonly bodyHtml = signal('');

  private readonly templateId = this.route.snapshot.paramMap.get('templateId') ?? '';

  readonly model = signal({
    title: '',
    subject: '',
  });

  readonly templateForm = form(this.model, (f) => {
    required(f.title);
    maxLength(f.title, 256);
    required(f.subject);
    maxLength(f.subject, 512);
  });

  ngOnInit(): void {
    if (!this.templateId) {
      this.loadError.set('Template id is missing.');
      this.loading.set(false);
      return;
    }

    void this.loadTemplate();
  }

  onBodyChange(value: string): void {
    this.bodyHtml.set(value);
    if (value.trim().length > 0) {
      this.bodyError.set(null);
    }
  }

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.commit();
  }

  private async loadTemplate(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const template = await this.templatesService.get(this.templateId);
      this.pageTitle.set(template.title);
      this.templateType.set(formatTemplateType(template.type));
      this.bodyHtml.set(template.body);
      this.model.set({
        title: template.title,
        subject: template.subject,
      });
    } catch (err) {
      this.loadError.set(problemDetailMessage(err as HttpErrorResponse));
    } finally {
      this.loading.set(false);
    }
  }

  private async commit(): Promise<void> {
    if (this.saving() || !this.templateId) {
      return;
    }

    const body = this.bodyHtml().trim();
    if (!body) {
      this.bodyError.set('Email body is required.');
      return;
    }

    this.saving.set(true);
    try {
      await submit(this.templateForm, async (field) => {
        try {
          const m = field().value();
          await this.templatesService.update(this.templateId, {
            title: m.title.trim(),
            subject: m.subject.trim(),
            body,
          });
          await this.router.navigate(this.templatesListLink);
          return;
        } catch (err) {
          const message =
            err instanceof HttpErrorResponse ? problemDetailMessage(err) : 'Could not update email template.';
          return [{ fieldTree: field, kind: 'server', message }];
        }
      });
    } finally {
      this.saving.set(false);
    }
  }
}
