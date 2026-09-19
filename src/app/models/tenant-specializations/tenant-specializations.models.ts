export interface TenantSpecializationDto {
  id: string;
  title: string;
  description?: string | null;
  defaultSkills: string[];
  createdAt?: string;
  updatedAt?: string | null;
}

export interface TenantSpecializationSummaryDto {
  id: string;
  title: string;
  description?: string | null;
}

export interface CreateTenantSpecializationRequest {
  title: string;
  description?: string | null;
  defaultSkills?: string[];
}

export interface UpdateTenantSpecializationRequest {
  title?: string | null;
  description?: string | null;
  defaultSkills?: string[] | null;
}
