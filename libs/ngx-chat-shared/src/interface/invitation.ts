// SPDX-License-Identifier: AGPL-3.0-or-later
import type { JID } from '../jid';

export interface Invitation {
  type: 'invite' | 'decline';
  roomJid: JID;
  roomPassword?: string;
  password?: string;
  from: JID;
  message?: string;
  reason?: string;
}
