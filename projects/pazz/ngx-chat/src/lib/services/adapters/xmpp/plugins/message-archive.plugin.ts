import { x as xml } from '@xmpp/xml';
import { filter } from 'rxjs/operators';

import { Direction, Stanza } from '../../../../core';
import { ChatService } from '../../../chat.service';
import { XmppChatConnectionService } from '../xmpp-chat-connection.service';
import { AbstractPlugin } from './abstract.plugin';
import { StanzaUuidPlugin } from './stanza-uuid.plugin';

/**
 * https://xmpp.org/extensions/xep-0313.html
 * Message Archive Management
 */
export class MessageArchivePlugin extends AbstractPlugin {

    private messagesWithPendingContact: Stanza[] = [];

    constructor(private chatService: ChatService) {
        super();

        this.chatService.state$.pipe(filter(newState => newState === 'online'))
            .subscribe(() => {
                this.requestAllArchivedMessages(chatService.chatConnectionService);
            });

        this.chatService.state$.pipe(filter(newState => newState === 'disconnected'))
            .subscribe(() => {
                this.messagesWithPendingContact = [];
            });

        this.chatService.contacts$.subscribe(() => {
            this.messagesWithPendingContact.forEach((messageStanza) => this.handleArchivedMessageStanza(messageStanza));
        });

    }

    private requestAllArchivedMessages(chatService: XmppChatConnectionService) {
        this.chatService.chatConnectionService.send(
            xml('iq', {type: 'set', id: chatService.getNextIqId()},
                xml('query', {xmlns: 'urn:xmpp:mam:2'},
                    xml('set', {xmlns: 'http://jabber.org/protocol/rsm'},
                        xml('max', {}, 20),
                        xml('before')
                    )
                )
            )
        );
    }

    canHandleStanza(stanza: Stanza): any {
        const result = stanza.getChild('result');
        return stanza.name === 'message' && result && result.attrs.xmlns === 'urn:xmpp:mam:2';
    }

    handleStanza(stanza: Stanza): void {
        this.handleArchivedMessageStanza(stanza);
    }

    private handleArchivedMessageStanza(stanza: Stanza) {
        const messageElement = stanza.getChild('result').getChild('forwarded').getChild('message');
        const datetime = new Date(
            stanza.getChild('result').getChild('forwarded').getChild('delay').attrs.stamp
        );

        const sender = this.chatService.getContactByJid(messageElement.attrs.from);
        const receiver = this.chatService.getContactByJid(messageElement.attrs.to);
        if (sender) {
            sender.appendMessage({
                direction: Direction.in,
                datetime,
                body: messageElement.getChildText('body'),
                id: StanzaUuidPlugin.extractIdFromStanza(messageElement)
            });
        } else if (receiver) {
            receiver.appendMessage({
                direction: Direction.out,
                datetime,
                body: messageElement.getChildText('body'),
                id: StanzaUuidPlugin.extractIdFromStanza(messageElement)
            });
        } else {
            if (this.messagesWithPendingContact.indexOf(stanza) === -1) {
                this.messagesWithPendingContact.push(stanza);
            }
        }
    }

}
