import { xml } from '@xmpp/client';
import { Element } from 'ltx';

import { Message, MessageWithBodyStanza } from '../../../../core';
import { id } from '../../../../core/id-generator';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';

/**
 * https://xmpp.org/extensions/xep-0359.html
 */
export class MessageUuidPlugin extends AbstractXmppPlugin {

    public static extractIdFromStanza(messageStanza: Element) {
        const originIdElement = messageStanza.getChild('origin-id');
        const stanzaIdElement = messageStanza.getChild('stanza-id');
        return messageStanza.attrs.id || (originIdElement && originIdElement.attrs.id) || (stanzaIdElement && stanzaIdElement.attrs.id);
    }

    beforeSendMessage(messageStanza: Element, message: Message): void {
        const generatedId = id();
        messageStanza.children.push(xml('origin-id', {xmlns: 'urn:xmpp:sid:0', id: generatedId}));
        if (message) {
            message.id = generatedId;
        }
    }

    afterSendMessage(message: Message, messageStanza: Element): void {
        message.id = MessageUuidPlugin.extractIdFromStanza(messageStanza);
    }

    afterReceiveMessage(message: Message, messageStanza: MessageWithBodyStanza) {
        message.id = MessageUuidPlugin.extractIdFromStanza(messageStanza);
    }

}
