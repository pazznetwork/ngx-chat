// SPDX-License-Identifier: MIT
import type { Message } from '@pazznetwork/ngx-chat-shared';
import { id } from '@pazznetwork/ngx-chat-shared';
import type { ChatPlugin, MessageWithBodyStanza } from '../core';

const nsSID = 'urn:xmpp:sid:0';

/**
 * https://xmpp.org/extensions/xep-0359.html
 */
export class MessageUuidPlugin implements ChatPlugin {
  readonly nameSpace = nsSID;

  static extractIdFromStanza(messageStanza: Element): string {
    const originIdElement = messageStanza.querySelector('origin-id');
    const stanzaIdElement = messageStanza.querySelector('stanza-id');
    return (
      (messageStanza.getAttribute('id') ||
        (originIdElement && originIdElement.getAttribute('id')) ||
        (stanzaIdElement && stanzaIdElement.getAttribute('id'))) ??
      'invalidID'
    );
  }

  beforeSendMessage(messageStanza: Element, message: Message): void {
    const generatedId = id();
    const element = document.createElement('origin-id');
    element.setAttribute('xmlns', this.nameSpace);
    element.setAttribute('id', generatedId);
    messageStanza.append(element);
    if (message) {
      message.id = generatedId;
    }
  }

  afterSendMessage(message: Message, messageStanza: Element): void {
    message.id = MessageUuidPlugin.extractIdFromStanza(messageStanza);
  }

  afterReceiveMessage(message: Message, messageStanza: MessageWithBodyStanza): void {
    message.id = MessageUuidPlugin.extractIdFromStanza(messageStanza);
  }
}
