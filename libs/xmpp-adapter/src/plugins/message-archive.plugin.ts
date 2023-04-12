// SPDX-License-Identifier: MIT
import { mergeMap, Subject } from 'rxjs';
import type { Contact, Log, Recipient, XmlSchemaForm } from '@pazznetwork/ngx-chat-shared';
import type { ChatPlugin, Stanza } from '../core';
import { Finder, serializeToSubmitForm } from '../core';
import type { XmppService } from '../xmpp.service';
import { MUC_SUB_EVENT_TYPE, nsRSM } from './multi-user-chat';
import { nsPubSubEvent } from './publish-subscribe.plugin';

const nsMAM = 'urn:xmpp:mam:2';

/**
 * https://xmpp.org/extensions/xep-0313.html
 * Message Archive Management
 */
export class MessageArchivePlugin implements ChatPlugin {
  readonly nameSpace = nsMAM;

  private readonly mamMessageReceivedSubject = new Subject<void>();

  constructor(private readonly chatService: XmppService, private readonly logService: Log) {
    this.chatService.onOnline$
      .pipe(
        mergeMap(async () => {
          await this.requestNewestMessages();
          await this.chatService.chatConnectionService.addHandler((stanza) =>
            this.handleMamMessageStanza(stanza)
          );
        })
      )
      .subscribe();
  }

  private async requestNewestMessages(): Promise<void> {
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

  private async handleMamMessageStanza(stanza: Stanza): Promise<boolean> {
    const messageElement = Finder.create(stanza)
      .searchByTag('result')
      .searchByTag('forwarded')
      .searchByTag('message').result;

    const delayElement = Finder.create(stanza)
      .searchByTag('result')
      .searchByTag('forwarded')
      .searchByTag('delay').result;

    const eventElement = Finder.create(stanza)
      .searchByTag('result')
      .searchByTag('forwarded')
      .searchByTag('message')
      .searchByTag('event')
      .searchByNamespace(nsPubSubEvent).result;

    if (!eventElement && messageElement && delayElement) {
      return this.handleMessage(messageElement, delayElement);
    }

    const itemsElement = eventElement?.querySelector('items');
    const itemsNode = itemsElement?.getAttribute('node');

    if (itemsNode !== MUC_SUB_EVENT_TYPE.messages) {
      this.logService.warn(
        `Handling of MUC/Sub message types other than ${MUC_SUB_EVENT_TYPE.messages} isn't implemented yet!`
      );
      return false;
    }

    if (!itemsElement) {
      throw new Error('No itemsElement to handle from archive');
    }

    const itemElements = Array.from(itemsElement.querySelectorAll('item'));
    const messagesHandled = await Promise.all(
      itemElements.reduce((acc: Promise<boolean>[], itemEl) => {
        const message = itemEl.querySelector('message');
        if (message && delayElement) {
          acc.push(this.handleMessage(message, delayElement));
        }

        return acc;
      }, [])
    );
    return messagesHandled.every((val) => val);
  }

  private async handleMessage(messageElement: Element, delayElement: Element): Promise<boolean> {
    const type = messageElement.getAttribute('type');
    if (type === 'chat') {
      await this.chatService.messageService.handleMessageStanza(messageElement, delayElement);
      this.mamMessageReceivedSubject.next();
      return true;
    } else if (
      type === 'groupchat' ||
      this.chatService.pluginMap.muc.isRoomInvitationStanza(messageElement)
    ) {
      throw new Error('type:groupchat NOT IMPLEMENTED');
    } else {
      throw new Error(`unknown archived message type: ${String(type)}`);
    }
  }
}
