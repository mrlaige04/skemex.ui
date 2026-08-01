import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  injectFlexRenderContext,
  type CellContext,
} from '@tanstack/angular-table';
import { HlmCheckboxImports } from 'spartan/checkbox';
import { RICH_TABLE_SELECTION } from './rich-table-selection';

@Component({
  selector: 'app-rich-table-select-cell',
  imports: [...HlmCheckboxImports],
  template: `
    <hlm-checkbox
      [checked]="checked()"
      (checkedChange)="onCheckedChange($event)"
      [attr.aria-label]="'Select row'"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTableSelectCellComponent {
  private readonly ctx = injectFlexRenderContext<CellContext<object, unknown>>();
  private readonly selection = inject(RICH_TABLE_SELECTION);

  readonly checked = computed(() => this.selection().has(this.ctx.row.id));

  onCheckedChange(checked: boolean): void {
    this.ctx.row.toggleSelected(checked);
  }
}
