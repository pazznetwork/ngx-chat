import { x as xml } from '@xmpp/xml';
import { Element } from 'ltx';
import { v4 as uuid } from 'uuid';
import { Message, MessageWithBodyStanza } from '../core/index';
import { AbstractPlugin } from './abstract.plugin';

/**
 * https://xmpp.org/extensions/xep-0359.html
 */
export class StanzaUuidPlugin extends AbstractPlugin {

    public static extractIdFromStanza(messageStanza: Element) {
        const originIdElement = messageStanza.getChild('origin-id');
        const stanzaIdElement = messageStanza.getChild('stanza-id');
        return (originIdElement && originIdElement.attrs.id) || (stanzaIdElement && stanzaIdElement.attrs.id);
    }

    beforeSendMessage(messageStanza: Element): void {
        messageStanza.children.push(xml('origin-id', {xmlns: 'urn:xmpp:sid:0', id: uuid()}));
    }

    afterSendMessage(message: Message, messageStanza: Element): void {
        message.id = StanzaUuidPlugin.extractIdFromStanza(messageStanza);
    }

    afterReceiveMessage(message: Message, messageStanza: MessageWithBodyStanza) {
        message.id = StanzaUuidPlugin.extractIdFromStanza(messageStanza);
    }

}
