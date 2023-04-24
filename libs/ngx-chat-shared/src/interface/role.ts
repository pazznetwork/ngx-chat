// SPDX-License-Identifier: AGPL-3.0-or-later
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
