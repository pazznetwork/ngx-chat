import { x as xml } from '@xmpp/xml';
import { filter } from 'rxjs/operators';

import { Direction, Stanza } from '../../../../core';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractPlugin } from './abstract.plugin';
import { StanzaUuidPlugin } from './stanza-uuid.plugin';

/**
 * https://xmpp.org/extensions/xep-0313.html
 * Message Archive Management
 */
export class MessageArchivePlugin extends AbstractPlugin {

    private messagesWithPendingContact: Stanza[] = [];

    constructor(private chatService: XmppChatAdapter) {
        super();

        this.chatService.state$.pipe(filter(newState => newState === 'disconnected'))
            .subscribe(() => {
                this.messagesWithPendingContact = [];
            });

        this.chatService.contacts$.subscribe(() => {
            this.messagesWithPendingContact = this.messagesWithPendingContact
                .filter((messageStanza) => !this.consumePendingMessage(messageStanza));
        });

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
            this.consumePendingMessage(stanza);
            return true;
        }
        return false;
    }

    private isMamMessageStanza(stanza: Stanza) {
        const result = stanza.getChild('result');
        return stanza.name === 'message' && result && result.attrs.xmlns === 'urn:xmpp:mam:2';
    }

    private consumePendingMessage(stanza: Stanza) {
        const messageElement = stanza.getChild('result').getChild('forwarded').getChild('message');
        const datetime = new Date(
            stanza.getChild('result').getChild('forwarded').getChild('delay').attrs.stamp
        );

        const sender = this.chatService.getContactById(messageElement.attrs.from);
        const receiver = this.chatService.getContactById(messageElement.attrs.to);
        const contact = sender || receiver;
        const messageBody = messageElement.getChildText('body');
        if (messageBody && messageBody.trim()) {
            if (contact) {
                contact.appendMessage({
                    direction: sender ? Direction.in : Direction.out,
                    datetime,
                    body: messageBody,
                    id: StanzaUuidPlugin.extractIdFromStanza(messageElement)
                });
                return true;
            } else {
                if (this.messagesWithPendingContact.indexOf(stanza) === -1) {
                    this.messagesWithPendingContact.push(stanza);
                }
                return false;
            }
        }
    }

}
