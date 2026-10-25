export interface RoleDetailDto {
  id: string;
  name: string;
  isSystem: boolean;
  permissionIds: string[];
  permissionNames: string[];
}

export interface PermissionItemDto {
  id: string;
  name: string;
  isSystem: boolean;
}

export interface PermissionGroupDto {
  id: string;
  name: string;
  permissions: PermissionItemDto[];
}

export interface CreateTenantRoleRequest {
  name: string;
  permissionIds: string[];
}

export interface UpdateTenantRoleRequest {
  name: string;
  permissionIds: string[];
}
