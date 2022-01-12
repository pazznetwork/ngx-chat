import { JID } from '@xmpp/jid';
import { Affiliation } from './affiliation';

export interface AffiliationModification {
    userJid: JID;
    affiliation: Affiliation;
    reason?: string;
}
