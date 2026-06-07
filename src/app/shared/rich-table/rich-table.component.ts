import { NgTemplateOutlet } from '@angular/common';
import type { NumberInput } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  numberAttribute,
  output,
  signal,
  TemplateRef,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import {
  type ColumnDef,
  createAngularTable,
  FlexRenderDirective,
  flexRenderComponent,
  getCoreRowModel,
  type VisibilityState,
} from '@tanstack/angular-table';
import { HlmButtonImports } from 'spartan/button';
import { HlmDropdownMenuImports } from 'spartan/dropdown-menu';
import { HlmIconImports } from 'spartan/icon';
import { HlmNumberedPagination } from 'spartan/pagination';
import { HlmTableImports } from 'spartan/table';
import type { RichTableColumn, RichTablePaginationChange } from './rich-table.models';

@Component({
  selector: 'app-rich-table',
  imports: [
    FlexRenderDirective,
    NgIcon,
    NgTemplateOutlet,
    HlmNumberedPagination,
    ...HlmButtonImports,
    ...HlmDropdownMenuImports,
    ...HlmIconImports,
    ...HlmTableImports,
  ],
  providers: [provideIcons({ lucideChevronDown })],
  host: {
    class: 'block w-full',
  },
  template: `
    @if (captionStartTemplate() || (showColumnsSelection() && hidableColumns().length > 0)) {
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <div class="flex min-w-0 flex-1 items-center gap-2">
          @if (captionStartTemplate(); as tpl) {
            <ng-container *ngTemplateOutlet="tpl" />
          }
        </div>

        @if (showColumnsSelection() && hidableColumns().length > 0) {
          <div class="ms-auto shrink-0">
            <button hlmBtn variant="outline" size="sm" align="end" [hlmDropdownMenuTrigger]="columnMenu">
              Columns
              <ng-icon hlm name="lucideChevronDown" class="ml-2" size="sm" />
            </button>
            <ng-template #columnMenu>
              <hlm-dropdown-menu class="w-36">
                @for (column of hidableColumns(); track column.id) {
                  <button
                    hlmDropdownMenuCheckbox
                    class="capitalize"
                    [checked]="column.getIsVisible()"
                    (triggered)="column.toggleVisibility()"
                  >
                    <hlm-dropdown-menu-checkbox-indicator />
                    {{ column.id }}
                  </button>
                }
              </hlm-dropdown-menu>
            </ng-template>
          </div>
        }
      </div>
    }

    <div class="overflow-hidden">
      @defer {
        <div hlmTableContainer>
          <table hlmTable>
            <thead hlmTHead>
              @for (headerGroup of table().getHeaderGroups(); track headerGroup.id) {
                <tr hlmTr>
                  @for (header of headerGroup.headers; track header.id) {
                    <th hlmTh [attr.colSpan]="header.colSpan">
                      @if (!header.isPlaceholder) {
                        <ng-container
                          *flexRender="
                            header.column.columnDef.header;
                            props: header.getContext();
                            let headerText
                          "
                        >
                          <div [innerHTML]="headerText"></div>
                        </ng-container>
                      }
                    </th>
                  }
                </tr>
              }
            </thead>
            <tbody hlmTBody>
              @for (row of table().getRowModel().rows; track row.id) {
                <tr hlmTr [attr.data-state]="row.getIsSelected() && 'selected'">
                  @for (cell of row.getVisibleCells(); track cell.id) {
                    <td hlmTd>
                      <ng-container
                        *flexRender="cell.column.columnDef.cell; props: cell.getContext(); let cellContent"
                      >
                        @if (cellContent) {
                          <div [innerHTML]="cellContent"></div>
                        }
                      </ng-container>
                    </td>
                  }
                </tr>
              } @empty {
                @if (!loading()) {
                  <tr hlmTr>
                    <td hlmTd class="h-24 text-center" [attr.colspan]="table().getAllLeafColumns().length">
                      <span class="text-muted-foreground text-sm">{{ emptyMessage() }}</span>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (showPagination()) {
      <hlm-numbered-pagination
        class="border-border mt-0 border-t"
        [currentPage]="pageNumber()"
        (currentPageChange)="onCurrentPageChange($event)"
        [itemsPerPage]="page()"
        (itemsPerPageChange)="onItemsPerPageChange($event)"
        [totalItems]="totalItems()"
        [pageSizes]="pageSizeOptions()"
        [maxSize]="paginationMaxSize()"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTableComponent<T extends object> {
  readonly data = input<T[]>([]);
  readonly columns = input<RichTableColumn<T>[]>([]);

  readonly showPagination = input(false);
  readonly pageNumber = input(1, { transform: numberAttribute });
  readonly page = input(10, { transform: numberAttribute });
  readonly totalItems = input(0, { transform: numberAttribute });
  readonly pageSizeOptions = input<number[]>([10, 20, 50, 100]);
  readonly paginationMaxSize = input<number, NumberInput>(7, { transform: numberAttribute });

  readonly loading = input(false);
  readonly emptyMessage = input('No results.');
  readonly showColumnsSelection = input(true);

  readonly paginationChange = output<RichTablePaginationChange>();

  readonly captionStartTemplate = contentChild<TemplateRef<void>>('captionStartTemplate');

  private readonly columnVisibility = signal<VisibilityState>({});

  private readonly columnDefs = computed(() =>
    this.columns().map((col) => this.toColumnDef(col)),
  );

  protected readonly table = createAngularTable<T>(() => ({
    data: this.data(),
    columns: this.columnDefs(),
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(this.columnVisibility()) : updater;
      this.columnVisibility.set(next);
    },
    state: {
      columnVisibility: this.columnVisibility(),
    },
  }));

  protected readonly hidableColumns = computed(() =>
    this.table().getAllColumns().filter((column) => column.getCanHide()),
  );

  protected onCurrentPageChange(page: number): void {
    this.emitPagination(page, this.page());
  }

  protected onItemsPerPageChange(size: number): void {
    this.emitPagination(1, size);
  }

  private emitPagination(pageNumber: number, page: number): void {
    this.paginationChange.emit({ pageNumber, page });
  }

  private toColumnDef(col: RichTableColumn<T>): ColumnDef<T> {
    const def = {
      id: col.key,
      header: col.header ?? col.label,
      enableSorting: col.enableSorting ?? false,
      enableHiding: col.enableHiding ?? col.key !== 'actions',
      ...(col.accessorFn
        ? { accessorFn: col.accessorFn }
        : col.component
          ? {}
          : { accessorKey: col.key }),
      ...(col.component
        ? { cell: () => flexRenderComponent(col.component!) }
        : col.render
          ? { cell: (info: { row: { original: T } }) => col.render!(info.row.original) ?? '' }
          : {}),
    } as ColumnDef<T>;

    return def;
  }
}
