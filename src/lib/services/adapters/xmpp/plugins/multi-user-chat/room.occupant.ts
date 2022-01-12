import { JID } from '@xmpp/jid';
import { Affiliation } from './affiliation';
import { Role } from './role';

export interface RoomOccupant {
    occupantJid: JID;
    affiliation: Affiliation;
    nick: string;
    role: Role;
}
