export type UserRole = "USER" | "ADMIN";

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
}
