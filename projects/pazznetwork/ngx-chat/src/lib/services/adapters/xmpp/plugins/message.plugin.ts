import { xml } from '@xmpp/client';
import { Contact } from '../../../../core/contact';
import { Direction, Message } from '../../../../core/message';
import { MessageWithBodyStanza, Stanza } from '../../../../core/stanza';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';

export class MessageReceivedEvent {
    discard = false;
}

export class MessagePlugin extends AbstractXmppPlugin {

    constructor(
        private xmppChatAdapter: XmppChatAdapter,
        private logService: LogService,
    ) {
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
        return stanza.name === 'message'
            && stanza.attrs.type !== 'groupchat'
            && stanza.attrs.type !== 'error'
            && !!stanza.getChildText('body')?.trim();
    }

    private handleMessageStanza(messageStanza: MessageWithBodyStanza) {
        this.logService.debug('message received <=', messageStanza.getChildText('body'));

        const message = {
            body: messageStanza.getChildText('body').trim(),
            direction: Direction.in,
            datetime: new Date(), // TODO: replace with entity time plugin
            delayed: !!messageStanza.getChild('delay'),
        };

        const messageReceivedEvent = new MessageReceivedEvent();
        this.xmppChatAdapter.plugins.forEach(plugin => plugin.afterReceiveMessage(message, messageStanza, messageReceivedEvent));
        if (!messageReceivedEvent.discard) {
            const contact = this.xmppChatAdapter.getOrCreateContactById(messageStanza.attrs.from);
            contact.addMessage(message);
            this.xmppChatAdapter.message$.next(contact);
        }
    }

    sendMessage(contact: Contact, body: string) {
        const messageStanza = xml('message', {
                to: contact.jidBare.toString(),
                from: this.xmppChatAdapter.chatConnectionService.userJid.toString(),
                type: 'chat',
            },
            xml('body', {}, body),
        );

        const message: Message = {
            direction: Direction.out,
            body,
            datetime: new Date(), // TODO: replace with entity time plugin
            delayed: false,
        };
        this.xmppChatAdapter.plugins.forEach(plugin => plugin.beforeSendMessage(messageStanza, message));
        contact.addMessage(message);
        // TODO: on rejection mark message that it was not sent successfully
        this.xmppChatAdapter.chatConnectionService.send(messageStanza).then(() => {
            this.xmppChatAdapter.plugins.forEach(plugin => plugin.afterSendMessage(message, messageStanza));
        }, (rej) => {
            this.logService.error('rejected message ' + message.id, rej);
        });
    }

}
