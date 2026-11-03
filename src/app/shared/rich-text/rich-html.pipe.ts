import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { prepareQuillHtmlForDisplay } from './rich-text.util';

/** Trust Quill HTML for `[innerHTML]` and restore list marker hooks. */
@Pipe({ name: 'richHtml', pure: true })
export class RichHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(prepareQuillHtmlForDisplay(value));
  }
}
