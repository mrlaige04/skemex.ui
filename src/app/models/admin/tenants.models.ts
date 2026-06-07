export interface SaTenantDto {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  logoUrl?: string | null;
  memberCount: number;
}

export interface CreateSaTenantRequest {
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateSaTenantRequest {
  name?: string;
  email?: string;
}
