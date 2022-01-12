import { JID } from '@xmpp/jid';

export interface Invitation {
    type: 'invite' | 'decline';
    roomJid: JID;
    roomPassword?: string;
    from: JID;
    message?: string;
}
