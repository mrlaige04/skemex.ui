/** Mirrors {@link Skemex.Domain.Abstractions.PaginatedList} from the API. */
export interface PaginatedList<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
}
