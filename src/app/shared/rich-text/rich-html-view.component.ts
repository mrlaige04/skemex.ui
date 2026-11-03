import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { RichHtmlPipe } from './rich-html.pipe';

/** Read-only Quill HTML with visible semantic list markers. */
@Component({
  selector: 'app-rich-html-view',
  imports: [RichHtmlPipe],
  template: `<div class="rich-html-view" [innerHTML]="html() | richHtml"></div>`,
  styleUrl: './rich-html-view.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
})
export class RichHtmlViewComponent {
  readonly html = input<string | null | undefined>('');
}
