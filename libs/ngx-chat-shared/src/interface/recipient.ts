// SPDX-License-Identifier: AGPL-3.0-or-later
import type { JID } from '../jid';
import type { MessageStore } from './message-store';

export interface Recipient {
  recipientType: 'contact' | 'room';
  avatar: string;
  name?: string;
  readonly jid: JID;
  readonly messageStore: MessageStore;

  equalsJid(other: Recipient | JID): boolean;
}

export function isJid(o: any): o is JID {
  // due to unknown reasons, `o instanceof JID` does not work when
  // JID is instantiated by an application instead of ngx-chat
  return !!o.bare;
}
