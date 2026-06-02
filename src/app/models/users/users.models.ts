export interface TenantUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  roles: string[];
}

export interface TenantRoleDto {
  id: string;
  name: string;
}

export interface CreateTenantUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleName: string;
}

export interface UpdateTenantUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  roleName?: string;
}
