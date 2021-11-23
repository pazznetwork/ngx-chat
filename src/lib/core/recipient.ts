import { JID } from '@xmpp/jid';
import { Room } from '../services/adapters/xmpp/plugins/multi-user-chat.plugin';
import { Contact } from './contact';

export type Recipient = Contact | Room;

export function isJid(o: any): o is JID {
    // due to unknown reasons, `o instanceof JID` does not work when
    // JID is instantiated by an application instead of ngx-chat
    return !!o.bare;
}
