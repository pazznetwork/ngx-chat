// SPDX-License-Identifier: MIT
import type { Contact } from '@pazznetwork/ngx-chat-shared';
import { Direction, Message } from '@pazznetwork/ngx-chat-shared';
import type { ChatPlugin } from '../core';
import { Finder } from '../core';
import type { XmppService } from '../xmpp.service';
import { firstValueFrom, Subject, switchMap } from 'rxjs';

export const nsCarbons = 'urn:xmpp:carbons:2';
export const nsForward = 'urn:xmpp:forward:0';
export const nsClient = 'jabber:client';

/**
 * XEP-0280 Message Carbons
 * See XEP-0280 https://xmpp.org/extensions/xep-0280.html#enabling
 */
export class MessageCarbonsPlugin implements ChatPlugin {
  nameSpace = nsCarbons;

  private readonly messageSubject = new Subject<Contact>();
  readonly message$ = this.messageSubject.asObservable();

  constructor(private readonly chatService: XmppService) {
    this.chatService.onOnline$
      .pipe(
        switchMap(async () => {
          await this.enableCarbons();
          await this.chatService.chatConnectionService.addHandler(
            (stanza) => this.handleCarbonMessageStanza(stanza),
            { name: 'message' }
          );
        })
      )
      .subscribe();
  }

  /**
   * Ask the XMPP server to enable Message Carbons
   */
  async enableCarbons(): Promise<void> {
    await this.chatService.chatConnectionService
      .$iq({ type: 'set', id: 'enable_carbons' })
      .c('enable', { xmlns: nsCarbons })
      .sendResponseLess();
  }

  private async handleCarbonMessageStanza(element: Element): Promise<boolean> {
    if (
      !element.querySelector('sent')?.getAttribute('xmlns')?.includes(nsCarbons) &&
      !element.querySelector('received')?.getAttribute('xmlns')?.includes(nsCarbons)
    ) {
      return true;
    }

    const forwarded = Finder.create(element).searchByTag('forwarded').searchByNamespace(nsForward);
    const messageElement = forwarded.searchByTag('message').searchByNamespace(nsClient).result;
    const direction = element.querySelector('received') ? Direction.in : Direction.out;

    if (!messageElement) {
      return true;
    }
    // body can be missing on type=chat messageElements
    const body = messageElement.querySelector('body')?.textContent?.trim() ?? '';

    const message: Message = {
      id: messageElement.querySelector('stanza-id')?.id as string,
      body,
      direction,
      datetime: new Date(await firstValueFrom(this.chatService.pluginMap.entityTime.getNow())),
      delayed: false,
      fromArchive: false,
    };

    const from = messageElement.getAttribute('from');
    const to = messageElement.getAttribute('to');
    const contactJid = direction === Direction.in ? from : to;
    const contact = await this.chatService.contactListService.getOrCreateContactById(
      contactJid as string
    );
    contact.messageStore.addMessage(message);
    this.messageSubject.next(contact);

    return true;
  }
}
