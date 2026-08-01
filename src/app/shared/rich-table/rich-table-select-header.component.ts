import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  injectFlexRenderContext,
  type HeaderContext,
} from '@tanstack/angular-table';
import { HlmCheckboxImports } from 'spartan/checkbox';
import { RICH_TABLE_SELECTION } from './rich-table-selection';

@Component({
  selector: 'app-rich-table-select-header',
  imports: [...HlmCheckboxImports],
  template: `
    <hlm-checkbox
      [checked]="checked()"
      [indeterminate]="indeterminate()"
      (checkedChange)="onCheckedChange($event)"
      aria-label="Select all rows on this page"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTableSelectHeaderComponent {
  private readonly ctx = injectFlexRenderContext<HeaderContext<object, unknown>>();
  private readonly selection = inject(RICH_TABLE_SELECTION);

  private readonly pageRowIds = computed(() =>
    this.ctx.table.getRowModel().rows.map((row) => row.id),
  );

  readonly checked = computed(() => {
    const selected = this.selection();
    const ids = this.pageRowIds();
    return ids.length > 0 && ids.every((id) => selected.has(id));
  });

  readonly indeterminate = computed(() => {
    const selected = this.selection();
    const ids = this.pageRowIds();
    const count = ids.filter((id) => selected.has(id)).length;
    return count > 0 && count < ids.length;
  });

  onCheckedChange(checked: boolean): void {
    this.ctx.table.toggleAllRowsSelected(checked);
  }
}
