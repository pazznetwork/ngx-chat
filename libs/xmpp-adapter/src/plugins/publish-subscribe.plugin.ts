// SPDX-License-Identifier: MIT
import { Subject } from 'rxjs';
import type { ChatPlugin, Stanza } from '../core';
import { serializeToSubmitForm, XmppResponseError } from '../core';
import type { XmppService } from '../xmpp.service';
import type { StanzaBuilder } from '../stanza-builder';
import type { XmlSchemaForm } from '@pazznetwork/ngx-chat-shared';

export const nsPubSub = 'http://jabber.org/protocol/pubsub';
export const nsPubSubOwner = `${nsPubSub}#owner`;
export const nsPubSubEvent = `${nsPubSub}#event`;
export const nsPubSubOptions = `${nsPubSub}#publish-options`;

/**
 * XEP-0060 Publish Subscribe (https://xmpp.org/extensions/xep-0060.html)
 * XEP-0223 Persistent Storage of Private Data via PubSub (https://xmpp.org/extensions/xep-0223.html)
 */
export class PublishSubscribePlugin implements ChatPlugin {
  nameSpace = nsPubSub;

  private readonly publishEventSubject = new Subject<Stanza>();
  readonly publishEvent$ = this.publishEventSubject.asObservable();

  // private supportsPrivatePublishSubject = new ReplaySubject<boolean>(1);

  constructor(private readonly xmppChatAdapter: XmppService) {}

  isPubSubEvent(stanza: Element): boolean {
    return stanza.querySelector('event')?.getAttribute('xmlns') === nsPubSubEvent;
  }

  publishEvent(stanza: Element): void {
    this.publishEventSubject.next(stanza);
  }

  async storePrivatePayloadPersistent(
    node: string,
    id: string | undefined,
    createData: (builder: StanzaBuilder) => StanzaBuilder
  ): Promise<Element> {
    return this.xmppChatAdapter.chatConnectionService
      .$iq({ type: 'set' })
      .c('pubsub', { xmlns: nsPubSub })
      .c('publish', { node })
      .c('item', id ? { id } : {})
      .cCreateMethod(createData)
      .up()
      .up()
      .up()
      .c('publish-options')
      .c('x', { xmlns: 'jabber:x:data', type: 'submit' })
      .c('field', { var: 'FORM_TYPE' })
      .c('value', undefined, 'http://jabber.org/protocol/pubsub#publish-options')
      .up()
      .up()
      .c('field', { var: 'pubsub#persist_items' })
      .c('value', undefined, 'true')
      .up()
      .up()
      .c('field', { var: 'pubsub#access_model' })
      .c('value', undefined, 'whitelist')
      .up()
      .up()
      .send();
  }

  async privateNotify(node: string, data?: Element, id?: string): Promise<void> {
    await this.xmppChatAdapter.chatConnectionService
      .$iq({ type: 'set' })
      .c('pubsub', { xmlns: nsPubSub })
      .c('publish', { node })
      .c('item', id ? { id } : {})
      .cCreateMethod((builder) => (data ? builder.cNode(data) : builder))
      .up()
      .up()
      .up()
      .c('publish-options')
      .cCreateMethod((builder) =>
        serializeToSubmitForm(builder, this.getPrivateConfigurationForm())
      )
      .send();
  }

  async retrieveNodeItems(node: string): Promise<Element[]> {
    try {
      const iqResponseStanza = await this.xmppChatAdapter.chatConnectionService
        .$iq({ type: 'get' })
        .c('pubsub', { xmlns: nsPubSub })
        .c('items', { node })
        .send();
      return Array.from(iqResponseStanza.querySelectorAll('items > item'));
    } catch (e) {
      if (
        e instanceof XmppResponseError &&
        (e.errorCondition === 'item-not-found' || e.errorCode === 404)
      ) {
        return [];
      }

      throw e;
    }
  }

  async getOwnerSubscriptions(): Promise<Subscription[]> {
    const service = await this.xmppChatAdapter.pluginMap.disco.findService('pubsub', 'pep');
    const subscriptions = await this.xmppChatAdapter.chatConnectionService
      .$iq({ type: 'get', to: service.jid })
      .c('pubsub', { xmlns: nsPubSubOwner })
      .c('subscriptions')
      .send();
    return this.fromElementToSubscription(subscriptions);
  }

  async getSubscriptions(): Promise<Subscription[]> {
    const service = await this.xmppChatAdapter.pluginMap.disco.findService('pubsub', 'pep');
    const subscriptions = await this.xmppChatAdapter.chatConnectionService
      .$iq({ type: 'get', to: service.jid })
      .c('pubsub', { xmlns: nsPubSub })
      .c('subscriptions')
      .send();
    return this.fromElementToSubscription(subscriptions);
  }

  fromElementToSubscription(subscriptionsElement: Element): Subscription[] {
    return Array.from(subscriptionsElement.querySelectorAll('subscriptions > subscription')).map(
      (element) => {
        return {
          node: element.getAttribute('node'),
          jid: element.getAttribute('jid'),
          subscription: element.getAttribute('subscription'),
          subid: element.getAttribute('subid') ?? undefined,
        } as Subscription;
      }
    );
  }

  private getPrivateConfigurationForm(persistent = false): XmlSchemaForm {
    return {
      type: 'submit',
      instructions: [],
      fields: [
        { type: 'hidden', variable: 'FORM_TYPE', value: nsPubSubOptions },
        { type: 'boolean', variable: 'pubsub#persist_items', value: persistent },
        { type: 'list-single', variable: 'pubsub#access_model', value: 'whitelist' },
      ],
    };
  }

  // private async determineSupportForPrivatePublish(): Promise<void> {
  //   let isSupported: boolean;
  //   try {
  //     const service = await this.xmppChatAdapter.pluginMap.disco.findService('pubsub', 'pep');
  //     isSupported =
  //       service.features.indexOf('http://jabber.org/protocol/pubsub#publish-options') > -1;
  //   } catch (e) {
  //     isSupported = false;
  //   }
  //   this.supportsPrivatePublishSubject.next(isSupported);
  // }
}

export interface Subscription {
  node: string;
  jid: string;
  subscription: 'subscribed' | 'unconfigured' | 'pending' | 'none';
  subid?: string;
}
