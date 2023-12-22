// SPDX-License-Identifier: MIT
import type { Contact, Recipient, XmlSchemaForm } from '@pazznetwork/ngx-chat-shared';
import type { ChatPlugin } from '../core';
import { serializeToSubmitForm } from '../core';
import type { XmppService } from '../xmpp.service';
import { nsRSM } from './multi-user-chat';

const nsMAM = 'urn:xmpp:mam:2';

/**
 * https://xmpp.org/extensions/xep-0313.html
 * Message Archive Management
 */
export class MessageArchivePlugin implements ChatPlugin {
  readonly nameSpace = nsMAM;

  constructor(private readonly chatService: XmppService) {}

  async requestNewestMessages(): Promise<void> {
    await this.chatService.chatConnectionService
      .$iq({ type: 'set' })
      .c('query', { xmlns: this.nameSpace })
      .c('set', { xmlns: nsRSM })
      .c('max', {}, '250')
      .up()
      .c('before')
      .send();
  }

  async loadMostRecentUnloadedMessages(recipient: Recipient): Promise<void> {
    // for user-to-user chats no to-attribute is necessary, in case of multi-user-chats it has to be set to the bare room jid
    const to = recipient.recipientType === 'room' ? recipient.jid.toString() : undefined;

    const form: XmlSchemaForm = {
      type: 'submit',
      instructions: [],
      fields: [
        { type: 'hidden', variable: 'FORM_TYPE', value: this.nameSpace },
        ...(recipient.recipientType === 'contact'
          ? ([
              {
                type: 'jid-single',
                variable: 'with',
                value: (recipient as Contact).jid.toString(),
              },
            ] as const)
          : []),
      ],
    };

    await this.chatService.chatConnectionService
      .$iq({ type: 'set', ...(to ? { to } : {}) })
      .c('query', { xmlns: this.nameSpace })
      .cCreateMethod((builder) => serializeToSubmitForm(builder, form))
      .up()
      .c('set', { xmlns: nsRSM })
      .c('max', {}, '100')
      .cCreateMethod((builder) =>
        recipient.messageStore.mostRecentMessage
          ? builder.c('after', {}, recipient.messageStore.mostRecentMessage.id)
          : builder
      )
      .up()
      .send();
  }

  async loadAllMessages(): Promise<void> {
    let lastMamResponse = await this.chatService.chatConnectionService
      .$iq({ type: 'set' })
      .c('query', { xmlns: this.nameSpace })
      .send();

    while (lastMamResponse?.querySelector('fin')?.getAttribute('complete') !== 'true') {
      const lastReceivedMessageId = lastMamResponse
        ?.querySelector('fin')
        ?.querySelector('set')
        ?.querySelector('last')?.textContent;

      if (!lastReceivedMessageId) {
        continue;
      }

      lastMamResponse = await this.chatService.chatConnectionService
        .$iq({ type: 'set' })
        .c('query', { xmlns: this.nameSpace })
        .c('set', { xmlns: nsRSM })
        .c('max', {}, '250')
        .up()
        .c('after', {}, lastReceivedMessageId)
        .send();
    }
  }
}
