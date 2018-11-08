import { x as xml } from '@xmpp/xml';
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
        return (originIdElement && originIdElement.attrs.id) || (stanzaIdElement && stanzaIdElement.attrs.id);
    }

    beforeSendMessage(messageStanza: Element): void {
        messageStanza.children.push(xml('origin-id', {xmlns: 'urn:xmpp:sid:0', id: id()}));
    }

    afterSendMessage(message: Message, messageStanza: Element): void {
        message.id = MessageUuidPlugin.extractIdFromStanza(messageStanza);
    }

    afterReceiveMessage(message: Message, messageStanza: MessageWithBodyStanza) {
        message.id = MessageUuidPlugin.extractIdFromStanza(messageStanza);
    }

}
