import { x as xml } from '@xmpp/xml';
import { filter } from 'rxjs/operators';
import { Direction, Stanza } from '../core/index';
import { ChatConnectionService } from '../services/chat-connection.service';
import { ChatService } from '../services/chat.service';
import { AbstractPlugin } from './abstract.plugin';
import { StanzaUuidPlugin } from './stanza-uuid.plugin';

/**
 * https://xmpp.org/extensions/xep-0313.html
 * Message Archive Management
 */
export class MessageArchivePlugin extends AbstractPlugin {

    constructor(private chatService: ChatService) {
        super();
        this.chatService.state$.pipe(filter(newState => newState === 'online'))
            .subscribe(() => {
                this.requestAllArchivedMessages(chatService.chatConnectionService);
            });
    }

    private requestAllArchivedMessages(chatService: ChatConnectionService) {
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
        const messageStanza = stanza.getChild('result').getChild('forwarded').getChild('message');
        const datetime = new Date(
            stanza.getChild('result').getChild('forwarded').getChild('delay').attrs.stamp
        );

        const sender = this.chatService.getContactByJid(messageStanza.attrs.from);
        const receiver = this.chatService.getContactByJid(messageStanza.attrs.to);
        if (sender) {
            sender.appendMessage({
                direction: Direction.in,
                datetime,
                body: messageStanza.getChildText('body'),
                id: StanzaUuidPlugin.extractIdFromStanza(messageStanza)
            });
        } else if (receiver) {
            receiver.appendMessage({
                direction: Direction.out,
                datetime,
                body: messageStanza.getChildText('body'),
                id: StanzaUuidPlugin.extractIdFromStanza(messageStanza)
            });
        } else {
            console.log('no contact found for ', messageStanza.attrs.from);
        }
    }

}
