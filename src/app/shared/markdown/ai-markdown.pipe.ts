import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { renderAiMarkdown } from './ai-markdown.util';

@Pipe({ name: 'aiMarkdown', pure: true })
export class AiMarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(renderAiMarkdown(value));
  }
}
