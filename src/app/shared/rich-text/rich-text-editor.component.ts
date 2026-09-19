import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { QuillModules } from 'ngx-quill/config';
import { QuillEditorComponent } from 'ngx-quill';

@Component({
  selector: 'app-rich-text-editor',
  imports: [FormsModule, QuillEditorComponent],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full min-w-0' },
})
export class RichTextEditorComponent {
  readonly value = input('');
  readonly placeholder = input('Add a description…');
  readonly disabled = input(false);
  readonly minHeight = input('10rem');

  readonly valueChange = output<string>();
  readonly blurred = output<void>();

  readonly modules: QuillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['blockquote', 'code-block'],
      ['link'],
      ['clean'],
    ],
  };

  onModelChange(next: string | null): void {
    this.valueChange.emit(next ?? '');
  }
}
