import { jid as parseJid } from '@xmpp/jid';
import { x as xml } from '@xmpp/xml';

import { Direction, Stanza } from '../../../../core';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractPlugin } from './abstract.plugin';
import { MessageUuidPlugin } from './message-uuid.plugin';

/**
 * https://xmpp.org/extensions/xep-0313.html
 * Message Archive Management
 */
export class MessageArchivePlugin extends AbstractPlugin {

    constructor(private chatService: XmppChatAdapter) {
        super();
    }

    onBeforeOnline(): PromiseLike<any> {
        return this.requestAllArchivedMessages();
    }

    private requestAllArchivedMessages() {
        return this.chatService.chatConnectionService.sendIq(
            xml('iq', {type: 'set'},
                xml('query', {xmlns: 'urn:xmpp:mam:2'},
                    xml('set', {xmlns: 'http://jabber.org/protocol/rsm'},
                        xml('max', {}, 20),
                        xml('before')
                    )
                )
            )
        );
    }

    handleStanza(stanza: Stanza) {
        if (this.isMamMessageStanza(stanza)) {
            this.handleMamMessageStanza(stanza);
            return true;
        }
        return false;
    }

    private isMamMessageStanza(stanza: Stanza) {
        const result = stanza.getChild('result');
        return stanza.name === 'message' && result && result.attrs.xmlns === 'urn:xmpp:mam:2';
    }

    private handleMamMessageStanza(stanza: Stanza) {
        const messageElement = stanza.getChild('result').getChild('forwarded').getChild('message');
        const isAddressedToMe = this.chatService.chatConnectionService.userJid.bare()
            .equals(parseJid(messageElement.attrs.to).bare());

        const messageBody = messageElement.getChildText('body');
        if (messageBody && messageBody.trim()) {
            const contactJid = isAddressedToMe ? messageElement.attrs.from : messageElement.attrs.to;
            const contact = this.chatService.getOrCreateContactById(contactJid);
            const datetime = new Date(
                stanza.getChild('result').getChild('forwarded').getChild('delay').attrs.stamp
            );

            contact.appendMessage({
                direction: isAddressedToMe ? Direction.in : Direction.out,
                datetime,
                body: messageBody,
                id: MessageUuidPlugin.extractIdFromStanza(messageElement)
            });
        }
    }

}
