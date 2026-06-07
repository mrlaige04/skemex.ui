export interface SaUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  avatarUrl?: string | null;
  workspaceCount: number;
}

export interface CreateSaUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
}

export interface UpdateSaUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
}
