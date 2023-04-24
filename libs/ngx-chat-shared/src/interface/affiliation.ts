// SPDX-License-Identifier: AGPL-3.0-or-later
import type { JID } from '../jid';

export enum Affiliation {
  none = 'none',
  outcast = 'outcast',
  member = 'member',
  admin = 'admin',
  owner = 'owner',
}

export interface AffiliationModification {
  userJid: JID;
  affiliation: Affiliation;
  reason?: string;
}
