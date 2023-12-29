// SPDX-License-Identifier: MIT
import { filter, switchMap } from 'rxjs/operators';
import type { Log, OpenChatsService } from '@pazznetwork/ngx-chat-shared';
import { Contact, JID, Message, MessageState } from '@pazznetwork/ngx-chat-shared';
import type { ChatPlugin, Stanza } from '../core';
import type { XmppService } from '../xmpp.service';
import type { PublishSubscribePlugin } from './publish-subscribe.plugin';
import { combineLatest, firstValueFrom, tap } from 'rxjs';
import type { StanzaBuilder } from '../stanza-builder';

export interface StateDate {
  lastRecipientReceived: Date;
  lastRecipientSeen: Date;
  lastSent: Date;
}

export type JidToMessageStateDate = Map<string, StateDate>;

const STORAGE_NGX_CHAT_CONTACT_MESSAGE_STATES = 'ngxchat:contactmessagestates';
const wrapperNodeName = 'entries';
const nodeName = 'contact-message-state';

/**
 * Plugin using PubSub to persist message read states.
 * Custom not part of the XMPP Specification
 * Standardized implementation specification would be https://xmpp.org/extensions/xep-0184.html
 */
export class MessageStatePlugin implements ChatPlugin {
  readonly nameSpace = STORAGE_NGX_CHAT_CONTACT_MESSAGE_STATES;

  private jidToMessageStateDate: JidToMessageStateDate = new Map<string, StateDate>();

  constructor(
    private readonly publishSubscribePlugin: PublishSubscribePlugin,
    private readonly chatService: XmppService,
    private readonly openChatsService: OpenChatsService,
    private readonly logService: Log
  ) {
    this.chatService.onOnline$.pipe(switchMap(() => this.onOnline())).subscribe();
    this.chatService.onOffline$.subscribe(() => this.jidToMessageStateDate.clear());

    combineLatest([this.openChatsService.openChats$, this.chatService.isOnline$])
      .pipe(
        filter(([, online]) => online),
        switchMap(([contacts]) =>
          Promise.all(
            Array.from(contacts).map(async (contact) => {
              if (contact.messageStore.mostRecentMessageReceived) {
                await this.sendMessageStateNotification(
                  contact.jid,
                  contact.messageStore.mostRecentMessageReceived.id,
                  MessageState.RECIPIENT_SEEN
                );
              }
            })
          )
        )
      )
      .subscribe();

    this.publishSubscribePlugin.publishEvent$
      .pipe(
        filter((stanza) => stanza.querySelector('items')?.getAttribute('node') === this.nameSpace),
        tap(() => console.log('calling processPubSub in message-state.plugin'))
      )
      .subscribe((stanza) => this.processPubSub(Array.from(stanza?.querySelectorAll('item'))));
  }

  private async onOnline(): Promise<void> {
    try {
      await this.parseContactMessageStates();
    } catch (err) {
      if ((err as string).includes('item-not-found')) {
        return;
      }
      this.logService.error('error parsing contact message states', err);
    }
  }

  private async parseContactMessageStates(): Promise<void> {
    const itemElements = await this.publishSubscribePlugin.retrieveNodeItems(this.nameSpace);
    this.processPubSub(itemElements);
  }

  private processPubSub(itemElements: Stanza[]): void {
    if (itemElements.length !== 1 || !itemElements[0]) {
      this.jidToMessageStateDate.clear();
      return;
    }

    const el = itemElements[0];
    el.querySelector(wrapperNodeName)
      ?.querySelectorAll(nodeName)
      .forEach((contactMessageStateElement: Stanza) => {
        const lastRecipientReceived =
          contactMessageStateElement.getAttribute('lastRecipientReceived');
        const lastRecipientSeen = contactMessageStateElement.getAttribute('lastRecipientSeen');
        const lastSent = contactMessageStateElement.getAttribute('lastSent');
        const jid = contactMessageStateElement.getAttribute('jid');
        if (!lastRecipientReceived || !lastRecipientSeen || !lastSent || !jid) {
          return;
        }
        this.jidToMessageStateDate.set(jid, {
          lastRecipientSeen: new Date(+lastRecipientSeen || 0),
          lastRecipientReceived: new Date(+lastRecipientReceived || 0),
          lastSent: new Date(+lastSent || 0),
        });
      });
  }

  private async persistContactMessageStates(): Promise<void> {
    await this.publishSubscribePlugin.storePrivatePayloadPersistent(
      STORAGE_NGX_CHAT_CONTACT_MESSAGE_STATES,
      'current',
      (builder: StanzaBuilder) =>
        builder.c(wrapperNodeName).cCreateMethod((childBuilder) => {
          [...this.jidToMessageStateDate.entries()].map(([jid, stateDates]) =>
            childBuilder
              .c(nodeName, {
                jid,
                lastRecipientReceived: String(stateDates.lastRecipientReceived.getTime()),
                lastRecipientSeen: String(stateDates.lastRecipientSeen.getTime()),
                lastSent: String(stateDates.lastSent.getTime()),
              })
              .up()
          );
          return childBuilder;
        })
    );
  }

  async afterSendMessage(to: JID, message: Message): Promise<void> {
    await this.updateContactMessageState(
      to.bare().toString(),
      MessageState.SENT,
      new Date(await firstValueFrom(this.chatService.pluginMap.entityTime.getNow()))
    );
    delete message.state;
  }

  async afterReceiveMessage(contact: Contact, message: Message): Promise<void> {
    const isChatWithContactOpen = this.openChatsService.isChatOpen(contact);
    const state = isChatWithContactOpen
      ? MessageState.RECIPIENT_SEEN
      : MessageState.RECIPIENT_RECEIVED;
    await this.sendMessageStateNotification(contact.jid, message.id, state);
  }

  private async sendMessageStateNotification(
    recipient: JID,
    messageId: string,
    state: MessageState
  ): Promise<void> {
    const from = await firstValueFrom(this.chatService.chatConnectionService.userJid$);
    await this.chatService.chatConnectionService
      .$msg({
        to: recipient.bare().toString(),
        from,
        type: 'chat',
      })
      .c('message-state', {
        xmlns: STORAGE_NGX_CHAT_CONTACT_MESSAGE_STATES,
        messageId,
        date: new Date(
          await firstValueFrom(this.chatService.pluginMap.entityTime.getNow())
        ).toISOString(),
        state,
      })
      .send();
  }

  isMessageState(stanza: Element): boolean {
    return (
      stanza.querySelector('message-state')?.getAttribute('xmlns') ===
      'ngxchat:contactmessagestates'
    );
  }

  async handleStanza(stanza: Stanza): Promise<boolean> {
    const type = stanza.getAttribute('type');
    const from = stanza.getAttribute('from');

    if (!from) {
      throw new Error(
        `No from attribute on message; message-state.plugin.registerHandler stanza=${stanza.outerHTML}`
      );
    }

    const stateElement = Array.from(stanza.querySelectorAll('message-state')).find(
      (el) => el.getAttribute('xmlns') === this.nameSpace
    );
    if (type === 'chat' && stateElement) {
      await this.handleStateNotificationStanza(stateElement, from);
      return true;
    }
    return false;
  }

  private async handleStateNotificationStanza(stateElement: Element, from: string): Promise<void> {
    const state = stateElement.getAttribute('state');
    const date = stateElement.getAttribute('date');

    if (!date) {
      throw new Error(
        `No date on stanza; message-state.handleStateNotificationStanza stateElement=${stateElement.outerHTML}`
      );
    }

    const contact = await this.chatService.contactListService.getOrCreateContactById(from);
    const stateDate = new Date(date);
    await this.updateContactMessageState(
      contact.jid.bare().toString(),
      state as MessageState,
      stateDate
    );
  }

  private async updateContactMessageState(
    contactJid: string,
    state: MessageState,
    stateDate: Date
  ): Promise<void> {
    const current = this.getContactMessageStateDate(contactJid);
    let changed = false;
    if (state === MessageState.RECIPIENT_RECEIVED && current.lastRecipientReceived < stateDate) {
      current.lastRecipientReceived = stateDate;
      changed = true;
    } else if (state === MessageState.RECIPIENT_SEEN && current.lastRecipientSeen < stateDate) {
      current.lastRecipientReceived = stateDate;
      current.lastRecipientSeen = stateDate;
      changed = true;
    } else if (state === MessageState.SENT && current.lastSent < stateDate) {
      current.lastSent = stateDate;
      changed = true;
    }
    if (changed) {
      try {
        await this.persistContactMessageStates();
      } catch (err) {
        this.logService.error('error persisting contact message states', err);
      }
    }
  }

  private getContactMessageStateDate(contactJid: string): StateDate {
    if (!this.jidToMessageStateDate.has(contactJid)) {
      this.jidToMessageStateDate.set(contactJid, {
        lastRecipientReceived: new Date(0),
        lastRecipientSeen: new Date(0),
        lastSent: new Date(0),
      });
    }

    return this.jidToMessageStateDate.get(contactJid) as StateDate;
  }

  getContactMessageState(message: Message, contactJid: string): MessageState {
    const stateDate = this.getContactMessageStateDate(contactJid);
    const date = message.datetime;

    if (date <= stateDate.lastRecipientSeen) {
      return MessageState.RECIPIENT_SEEN;
    } else if (date <= stateDate.lastRecipientReceived) {
      return MessageState.RECIPIENT_RECEIVED;
    } else if (date <= stateDate.lastSent) {
      return MessageState.SENT;
    }
    return MessageState.UNKNOWN;
  }
}
