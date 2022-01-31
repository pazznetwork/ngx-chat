import { JID } from '@xmpp/jid';
import { Affiliation } from './affiliation';
import { Role } from './role';

export interface RoomUser {
    userIdentifiers: {
        userJid: JID,
        nick?: string
    }[];
    affiliation?: Affiliation;
    role?: Role;
}
