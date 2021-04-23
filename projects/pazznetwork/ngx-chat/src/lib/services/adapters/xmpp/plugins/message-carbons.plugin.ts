import { xml } from '@xmpp/client';
import { Element } from 'ltx';
import { Direction } from '../../../../core/message';
import { Stanza } from '../../../../core/stanza';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { MessageReceivedEvent } from './message.plugin';

/**
 * XEP-0280 Message Carbons
 */
export class MessageCarbonsPlugin extends AbstractXmppPlugin {

    constructor(private xmppChatAdapter: XmppChatAdapter) {
        super();
    }

    onBeforeOnline(): PromiseLike<any> {
        return this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'set'},
                xml('enable', {xmlns: 'urn:xmpp:carbons:2'})
            )
        );
    }

    handleStanza(stanza: Stanza) {
        const receivedOrSentElement = stanza.getChildByAttr('xmlns', 'urn:xmpp:carbons:2');
        const forwarded = receivedOrSentElement && receivedOrSentElement.getChild('forwarded', 'urn:xmpp:forward:0');
        const messageElement = forwarded && forwarded.getChild('message', 'jabber:client');
        const carbonFrom = stanza.attrs.from;
        const userJid = this.xmppChatAdapter.chatConnectionService.userJid;
        if (stanza.is('message') && receivedOrSentElement && forwarded && messageElement && userJid
            && userJid.bare().toString() === carbonFrom) {
            return this.handleCarbonMessageStanza(messageElement, receivedOrSentElement);
        }
        return false;
    }

    private handleCarbonMessageStanza(messageElement: Element, receivedOrSent: Element) {
        const direction = receivedOrSent.is('received') ? Direction.in : Direction.out;

        const message = {
            body: messageElement.getChildText('body').trim(),
            direction,
            datetime: new Date(), // TODO: replace with entity time plugin
            delayed: false,
        };

        const messageReceivedEvent = new MessageReceivedEvent();
        this.xmppChatAdapter.plugins.forEach(plugin => plugin.afterReceiveMessage(message, messageElement, messageReceivedEvent));
        if (!messageReceivedEvent.discard) {
            const {from, to} = messageElement.attrs;
            const contactJid = direction === Direction.in ? from : to;
            const contact = this.xmppChatAdapter.getOrCreateContactById(contactJid);
            contact.addMessage(message);

            if (direction === Direction.in) {
                this.xmppChatAdapter.message$.next(contact);
            }
        }

        return true;
    }

}
