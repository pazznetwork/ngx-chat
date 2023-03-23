// SPDX-License-Identifier: MIT
import { Subject, switchMap } from 'rxjs';
import type { Stanza, StanzaHandlerChatPlugin } from '../core';
import { serializeToSubmitForm, XmppResponseError } from '../core';
import type { XmppService } from '../xmpp.service';
import type { XmppConnectionService } from '../service';
import type { StanzaBuilder } from '../stanza-builder';
import type { XmlSchemaForm } from '@pazznetwork/ngx-chat-shared';
import type { Handler } from '@pazznetwork/strophets';

export const nsPubSub = 'http://jabber.org/protocol/pubsub';
export const nsPubSubOwner = `${nsPubSub}#owner`;
export const nsPubSubEvent = `${nsPubSub}#event`;
export const nsPubSubOptions = `${nsPubSub}#publish-options`;

/**
 * XEP-0060 Publish Subscribe (https://xmpp.org/extensions/xep-0060.html)
 * XEP-0223 Persistent Storage of Private Data via PubSub (https://xmpp.org/extensions/xep-0223.html)
 */
export class PublishSubscribePlugin implements StanzaHandlerChatPlugin {
  nameSpace = nsPubSubEvent;

  private readonly publishSubject = new Subject<Stanza>();
  readonly publish$ = this.publishSubject.asObservable();

  private publishHandler?: Handler;

  constructor(private readonly xmppChatAdapter: XmppService) {
    xmppChatAdapter.onOnline$
      .pipe(switchMap(() => this.registerHandler(this.xmppChatAdapter.chatConnectionService)))
      .subscribe();
    xmppChatAdapter.onOffline$
      .pipe(switchMap(() => this.unregisterHandler(this.xmppChatAdapter.chatConnectionService)))
      .subscribe();
  }

  async registerHandler(connection: XmppConnectionService): Promise<void> {
    this.publishHandler = await connection.addHandler(
      (stanza) => {
        this.publishSubject.next(stanza);
        return true;
      },
      {
        ns: nsPubSub,
        name: 'message',
      }
    );
  }

  async unregisterHandler(connection: XmppConnectionService): Promise<void> {
    if (!this.publishHandler) {
      return;
    }
    await connection.deleteHandler(this.publishHandler);
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
      .cCreateMethod((builder) =>
        serializeToSubmitForm(builder, this.getPrivateConfigurationForm(true))
      )
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
    const subscriptions = await this.xmppChatAdapter.chatConnectionService
      .$iq({ type: 'get' })
      .c('query', { xmlns: nsPubSubOwner })
      .c('subscriptions')
      .send();
    return this.fromElementToSubscription(subscriptions);
  }

  async getSubscriptions(): Promise<Subscription[]> {
    const service = await this.xmppChatAdapter.pluginMap.disco.findService('pubsub', 'service');
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
}

export interface Subscription {
  node: string;
  jid: string;
  subscription: 'subscribed' | 'unconfigured' | 'pending' | 'none';
  subid?: string;
}
