import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { normalizeRichHtml } from './rich-text.util';

/** Trust normalized Quill HTML for `[innerHTML]` (same source as task descriptions). */
@Pipe({ name: 'richHtml', pure: true })
export class RichHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(normalizeRichHtml(value));
  }
}
