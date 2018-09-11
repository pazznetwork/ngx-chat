import { x as xml } from '@xmpp/xml';
import { Direction, MessageWithBodyStanza, Stanza } from '../../../../core';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';

export class MessagePlugin extends AbstractXmppPlugin {

    constructor(private xmppChatAdapter: XmppChatAdapter,
                private logService: LogService) {
        super();
    }

    handleStanza(stanza: Stanza) {
        if (this.isMessageStanza(stanza)) {
            this.handleMessageStanza(stanza);
            return true;
        }
        return false;
    }

    private isMessageStanza(stanza: Stanza): stanza is MessageWithBodyStanza {
        return stanza.name === 'message' && stanza.attrs.type !== 'groupchat' && !!stanza.getChildText('body');
    }

    private handleMessageStanza(messageStanza: MessageWithBodyStanza) {
        this.logService.debug('message received <=', messageStanza.getChildText('body'));
        const contact = this.xmppChatAdapter.getOrCreateContactById(messageStanza.attrs.from);

        const message = {
            body: messageStanza.getChildText('body'),
            direction: Direction.in,
            datetime: new Date(),
            delayed: !!messageStanza.getChild('delay')
        };

        this.xmppChatAdapter.plugins.forEach(plugin => plugin.afterReceiveMessage(message, messageStanza));

        contact.addMessage(message);
        this.xmppChatAdapter.message$.next(contact);
    }

    sendMessage(jid: string, body: string) {
        const messageStanza = xml('message', {to: jid, from: this.xmppChatAdapter.chatConnectionService.userJid.toString(), type: 'chat'},
            xml('body', {}, body)
        );

        this.xmppChatAdapter.plugins.forEach(plugin => plugin.beforeSendMessage(messageStanza));
        this.xmppChatAdapter.chatConnectionService.send(messageStanza).then(() => {
            const contact = this.xmppChatAdapter.getOrCreateContactById(jid);
            const message = {
                direction: Direction.out,
                body,
                datetime: new Date(),
                delayed: false
            };

            this.xmppChatAdapter.plugins.forEach(plugin => plugin.afterSendMessage(message, messageStanza));
            contact.addMessage(message);
            this.xmppChatAdapter.message$.next(contact);
        }, (rej) => {
            this.logService.error('rejected', rej);
        });
    }

}
