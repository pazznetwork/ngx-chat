// SPDX-License-Identifier: MIT
import type { Contact } from '@pazznetwork/ngx-chat-shared';
import type { ChatPlugin } from '../core';
import type { XmppService } from '../xmpp.service';
import { Subject, switchMap } from 'rxjs';

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
}
