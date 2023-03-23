// SPDX-License-Identifier: MIT
import type { XmppService } from '../xmpp.service';
import type { ServiceDiscoveryPlugin } from './service-discovery.plugin';
import type { ChatPlugin } from '../core';
import { Finder } from '../core';
import { firstValueFrom } from 'rxjs';

export const nsMucSub = 'urn:xmpp:mucsub:0';

/**
 * support for https://docs.ejabberd.im/developer/xmpp-clients-bots/extensions/muc-sub/
 */
export class MucSubPlugin implements ChatPlugin {
  readonly nameSpace = nsMucSub;

  constructor(
    private readonly xmppChatAdapter: XmppService,
    private readonly serviceDiscoveryPlugin: ServiceDiscoveryPlugin
  ) {}

  async subscribeRoom(roomJid: string, nodes: string[] = []): Promise<void> {
    const nick = await firstValueFrom(this.xmppChatAdapter.chatConnectionService.userJid$);
    await this.xmppChatAdapter.chatConnectionService
      .$iq({ type: 'set', to: roomJid })
      .c('subscribe', { xmlns: this.nameSpace, nick })
      .cCreateMethod((builder) => {
        nodes.map((node) => builder.c('event', { node }));
        return builder;
      })
      .send();
  }

  async unsubscribeRoom(roomJid: string): Promise<void> {
    await this.xmppChatAdapter.chatConnectionService
      .$iq({ type: 'set', to: roomJid })
      .c('unsubscribe', { xmlns: this.nameSpace })
      .send();
  }

  /**
   * A room moderator can unsubscribe others providing the their jid as attribute to the information query (iq)
   * see: https://docs.ejabberd.im/developer/xmpp-clients-bots/extensions/muc-sub/#unsubscribing-from-a-muc-room
   *
   * @param roomJid for the room to be unsubscribed from
   * @param jid user id to be unsubscribed
   */
  async unsubscribeJidFromRoom(roomJid: string, jid: string): Promise<void> {
    await this.xmppChatAdapter.chatConnectionService
      .$iq({ type: 'set', to: roomJid })
      .c('unsubscribe', { xmlns: this.nameSpace, jid })
      .send();
  }

  /**
   * A user can query the MUC service to get their list of subscriptions.
   * see: https://docs.ejabberd.im/developer/xmpp-clients-bots/extensions/muc-sub/#g dd ddetting-list-of-subscribed-rooms
   */
  async getSubscribedRooms(): Promise<string[]> {
    const from = await firstValueFrom(this.xmppChatAdapter.chatConnectionService.userJid$);
    const domain = from.split('@')[0] as string;
    const subscriptions = await this.xmppChatAdapter.chatConnectionService
      .$iq({ type: 'get', from, to: `muc.${domain}` })
      .c('subscriptions', { xmlns: this.nameSpace })
      .send();

    if (!subscriptions) {
      return [];
    }

    return (
      Finder.create(subscriptions)
        ?.searchByTag('subscription')
        ?.results?.map((sub) => sub.getAttribute('jid') as string) ?? []
    );
  }

  /**
   * A subscriber or room moderator can get the list of subscribers by sending <subscriptions/> request directly to the room JID.
   * see: https://docs.ejabberd.im/developer/xmpp-clients-bots/extensions/muc-sub/#getting-list-of-subscribers-of-a-room
   *
   * @param roomJid of the room the get a subscriber list from
   */
  getSubscribers(roomJid: string): Promise<Element> {
    return this.xmppChatAdapter.chatConnectionService
      .$iq({ type: 'get', to: roomJid })
      .c('subscriptions', { xmlns: this.nameSpace })
      .send();
  }

  async retrieveSubscriptions(): Promise<Map<string, string[]>> {
    const service = await this.serviceDiscoveryPlugin.findService('conference', 'text');

    const result = await this.xmppChatAdapter.chatConnectionService
      .$iq({ type: 'get', to: service.jid })
      .c('subscriptions', { xmlns: this.nameSpace })
      .send();

    const subscriptions = Finder.create(result)
      .searchByTag('subscriptions')
      .searchByNamespace(this.nameSpace)
      .searchByTag('subscription')
      .results?.map((subscriptionElement) => {
        const subscribedEvents: string[] =
          Finder.create(subscriptionElement)
            .searchByTag('event')
            .results?.map((eventElement) => eventElement.getAttribute('node') as string) ?? [];
        return [subscriptionElement.getAttribute('jid') as string, subscribedEvents] as const;
      });

    return new Map(subscriptions);
  }
}
