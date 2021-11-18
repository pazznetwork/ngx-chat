import { Stanza } from '../../../../core/stanza';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';

/**
 * see XEP-0115 Entity Capabilities
 * a specification for ensuring compatibility to different jabber node provider versions
 */
export class EntityCapabilitiesPlugin extends AbstractXmppPlugin {

    constructor(private readonly chatAdapter: XmppChatAdapter) {
        super();
    }

    handleStanza(stanza: Stanza): boolean {
        return false;
    }

    private isEntityCapabilityStanze(stanza: Stanza) {
        stanza.name;
    }
}
