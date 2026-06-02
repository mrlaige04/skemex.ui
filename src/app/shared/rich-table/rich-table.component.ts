import type { NumberInput } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
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
import { createPageArray } from 'spartan/pagination';
import { HlmButtonImports } from 'spartan/button';
import { HlmDropdownMenuImports } from 'spartan/dropdown-menu';
import { HlmIconImports } from 'spartan/icon';
import { HlmPaginationImports } from 'spartan/pagination';
import { HlmSelectImports } from 'spartan/select';
import { HlmTableImports } from 'spartan/table';
import type { RichTableColumn, RichTablePaginationChange } from './rich-table.models';

type PageToken = number | '...';

@Component({
  selector: 'app-rich-table',
  imports: [
    FlexRenderDirective,
    FormsModule,
    NgIcon,
    ...HlmButtonImports,
    ...HlmDropdownMenuImports,
    ...HlmIconImports,
    ...HlmPaginationImports,
    ...HlmSelectImports,
    ...HlmTableImports,
  ],
  providers: [provideIcons({ lucideChevronDown })],
  host: {
    class: 'block w-full',
  },
  template: `
    @if (showColumnToggle() && hidableColumns().length > 0) {
      <div class="mb-2 flex justify-end">
        <button hlmBtn variant="outline" align="end" [hlmDropdownMenuTrigger]="columnMenu">
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
                        <div [innerHTML]="cellContent"></div>
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
      <div
        class="border-border mt-3 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-muted-foreground text-sm">
          @if (totalItems() > 0) {
            {{ rangeLabel() }}
          } @else {
            No results
          }
        </p>

        @if (totalItems() > 0) {
          <nav hlmPagination>
            <ul hlmPaginationContent>
              @if (!isFirstPage()) {
                <li hlmPaginationItem (click)="goToPrevious()">
                  <hlm-pagination-previous />
                </li>
              }

              @for (token of pageTokens(); track token) {
                <li hlmPaginationItem>
                  @if (token === '...') {
                    <hlm-pagination-ellipsis />
                  } @else {
                    <a
                      hlmPaginationLink
                      [isActive]="pageNumber() === token"
                      (click)="goToPage(token)"
                    >
                      {{ token }}
                    </a>
                  }
                </li>
              }

              @if (!isLastPage()) {
                <li hlmPaginationItem (click)="goToNext()">
                  <hlm-pagination-next />
                </li>
              }
            </ul>
          </nav>
        }

        <hlm-select
          class="w-fit sm:ml-auto"
          [value]="page().toString()"
          (valueChange)="onPageSizeSelect($event)"
        >
          <hlm-select-trigger class="w-[5.5rem]">
            <hlm-select-value />
          </hlm-select-trigger>
          <hlm-select-content *hlmSelectPortal>
            <hlm-select-group>
              @for (size of pageSizeOptions(); track size) {
                <hlm-select-item [value]="size.toString()">{{ size }} / page</hlm-select-item>
              }
            </hlm-select-group>
          </hlm-select-content>
        </hlm-select>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTableComponent<T extends object> {
  readonly data = input<T[]>([]);
  readonly columns = input.required<RichTableColumn<T>[]>();

  readonly showPagination = input(false);
  readonly pageNumber = input(1, { transform: numberAttribute });
  readonly page = input(10, { transform: numberAttribute });
  readonly totalItems = input(0, { transform: numberAttribute });
  readonly pageSizeOptions = input<number[]>([10, 20, 50, 100]);
  readonly paginationMaxSize = input<number, NumberInput>(7, { transform: numberAttribute });

  readonly loading = input(false);
  readonly emptyMessage = input('No results.');
  readonly showColumnToggle = input(true);

  readonly paginationChange = output<RichTablePaginationChange>();

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

  protected readonly lastPageNumber = computed(() => {
    const total = this.totalItems();
    if (total < 1) {
      return 1;
    }
    return Math.ceil(total / this.page());
  });

  protected readonly pageTokens = computed((): PageToken[] => {
    if (!this.showPagination()) {
      return [];
    }

    return createPageArray(
      this.pageNumber(),
      this.page(),
      this.totalItems(),
      this.paginationMaxSize(),
    );
  });

  protected readonly isFirstPage = computed(() => this.pageNumber() <= 1);
  protected readonly isLastPage = computed(() => this.pageNumber() >= this.lastPageNumber());

  protected readonly rangeLabel = computed(() => {
    const total = this.totalItems();
    if (total === 0) {
      return '';
    }
    const start = (this.pageNumber() - 1) * this.page() + 1;
    const end = Math.min(this.pageNumber() * this.page(), total);
    return `${start}–${end} of ${total}`;
  });

  protected goToPage(page: PageToken): void {
    if (page === '...') {
      return;
    }
    this.emitPagination(page, this.page());
  }

  protected goToPrevious(): void {
    if (!this.isFirstPage()) {
      this.emitPagination(this.pageNumber() - 1, this.page());
    }
  }

  protected goToNext(): void {
    if (!this.isLastPage()) {
      this.emitPagination(this.pageNumber() + 1, this.page());
    }
  }

  protected onPageSizeSelect(value: string | null): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return;
    }
    this.emitPagination(1, parsed);
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
