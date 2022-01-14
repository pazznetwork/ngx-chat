import { JID } from '@xmpp/jid';

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
