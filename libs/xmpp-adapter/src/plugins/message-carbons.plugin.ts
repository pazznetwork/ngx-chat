// SPDX-License-Identifier: MIT
import type { Contact } from '@pazznetwork/ngx-chat-shared';
import { Direction, Message } from '@pazznetwork/ngx-chat-shared';
import type { ChatPlugin, IqResponseStanza } from '../core';
import { Finder, MessageReceivedEvent } from '../core';
import type { XmppService } from '../xmpp.service';
import { firstValueFrom, Subject, switchMap } from 'rxjs';
import type { Handler } from '@pazznetwork/strophets';
import { first } from 'rxjs/operators';

export const nsCarbons = 'urn:xmpp:carbons:2';
export const nsForward = 'urn:xmpp:forward:0';
export const nsClient = 'jabber:client';

/**
 * XEP-0280 Message Carbons
 * See XEP-0280 https://xmpp.org/extensions/xep-0280.html#enabling
 */
export class MessageCarbonsPlugin implements ChatPlugin {
  nameSpace = nsCarbons;

  private carbonMessageHandler?: Handler;

  private readonly messageSubject = new Subject<Contact>();
  readonly message$ = this.messageSubject.asObservable();

  constructor(private readonly xmppService: XmppService) {
    this.xmppService.onOnline$
      .pipe(switchMap(() => this.xmppService.chatConnectionService.userJid$.pipe(first())))
      .pipe(
        switchMap(async (jid) => {
          await this.enableCarbons();
          this.carbonMessageHandler = await this.xmppService.chatConnectionService.addHandler(
            (stanza) => {
              void this.handleCarbonMessageStanza(stanza);
              return true;
            },
            { ns: this.nameSpace, name: 'message', from: jid }
          );
        })
      )
      .subscribe();

    this.xmppService.onOffline$
      .pipe(
        switchMap(async () => {
          if (!this.carbonMessageHandler) {
            return;
          }
          await this.xmppService.chatConnectionService.deleteHandler(this.carbonMessageHandler);
        })
      )
      .subscribe();
  }

  /**
   * Ask the XMPP server to enable Message Carbons
   */
  async enableCarbons(): Promise<IqResponseStanza> {
    return this.xmppService.chatConnectionService
      .$iq({ type: 'set' })
      .c('enable', { xmlns: nsCarbons })
      .send();
  }

  private async handleCarbonMessageStanza(element: Element): Promise<void> {
    const receivedOrSentElement = Finder.create(element).searchByNamespace(this.nameSpace).result;
    if (!receivedOrSentElement) {
      return;
    }
    const forwarded = Finder.create(receivedOrSentElement)
      .searchByTag('forwarded')
      .searchByNamespace(nsForward);
    const messageElement = forwarded.searchByTag('message').searchByNamespace(nsClient).result;
    const direction = receivedOrSentElement.tagName === 'received' ? Direction.in : Direction.out;

    if (!messageElement) {
      return;
    }
    // body can be missing on type=chat messageElements
    const body = messageElement.querySelector('body')?.textContent?.trim() ?? '';

    const message: Message = {
      id: messageElement.querySelector('stanza-id')?.id as string,
      body,
      direction,
      datetime: new Date(await firstValueFrom(this.xmppService.pluginMap.entityTime.getNow())),
      delayed: false,
      fromArchive: false,
    };

    const messageReceivedEvent = new MessageReceivedEvent();
    /*  this.xmppService.pluginMap.messageState.afterReceiveMessage(
      message,
      messageElement,
      messageReceivedEvent
    );*/
    if (messageReceivedEvent.discard) {
      return;
    }

    const from = messageElement.getAttribute('from');
    const to = messageElement.getAttribute('to');
    const contactJid = direction === Direction.in ? from : to;
    const contact = await this.xmppService.contactListService.getOrCreateContactById(
      contactJid as string
    );
    contact.messageStore.addMessage(message);

    if (direction === Direction.in) {
      this.messageSubject.next(contact);
    }
  }
}
