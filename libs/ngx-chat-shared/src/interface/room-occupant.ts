// SPDX-License-Identifier: AGPL-3.0-or-later
import type { JID } from '../jid';
import type { Role } from './role';
import type { Affiliation } from './affiliation';

export interface RoomOccupant {
  jid: JID;
  affiliation: Affiliation;
  nick: string | undefined;
  role: Role;
}
