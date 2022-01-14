export enum Role {
    none = 'none',
    visitor = 'visitor',
    participant = 'participant',
    moderator = 'moderator',
}

export interface RoleModification {
    nick: string;
    role: Role;
    reason?: string;
}
