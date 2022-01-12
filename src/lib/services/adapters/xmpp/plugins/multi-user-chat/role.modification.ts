import { Role } from './role';

export interface RoleModification {
    nick: string;
    role: Role;
    reason?: string;
}
