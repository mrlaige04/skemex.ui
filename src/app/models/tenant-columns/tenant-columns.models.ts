export interface TenantColumnDto {
  id: string;
  key: string;
  title: string;
  description?: string | null;
  sortOrder: number;
  isRequired: boolean;
  isSortOrderForced: boolean;
}

export interface CreateTenantColumnRequest {
  key: string;
  title: string;
  description?: string | null;
  isRequired?: boolean;
  isSortOrderForced?: boolean;
}

export interface UpdateTenantColumnRequest {
  title?: string | null;
  description?: string | null;
  isRequired?: boolean | null;
  isSortOrderForced?: boolean | null;
}

export interface ReorderTenantColumnsRequest {
  columnIds: string[];
}
