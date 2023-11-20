// SPDX-License-Identifier: MIT
import {
  Direction,
  type JidToNumber,
  type Message,
  type MessageService,
  MessageState,
  parseJid,
  type Recipient,
} from '@pazznetwork/ngx-chat-shared';
import type { Connectable, Observable } from 'rxjs';
import { connectable, firstValueFrom, merge, Subject, switchMap } from 'rxjs';
import type {
  MessageArchivePlugin,
  MessageCarbonsPlugin,
  MultiUserChatPlugin,
  UnreadMessageCountService,
} from '@pazznetwork/xmpp-adapter';
import {
  Finder,
  type MessageWithBodyStanza,
  nsPubSubEvent,
  XmppService,
} from '@pazznetwork/xmpp-adapter';
import { shareReplay } from 'rxjs/operators';
import { getUniqueId } from '@pazznetwork/strophets';

/**
 * Part of the XMPP Core Specification
 * see: https://datatracker.ietf.org/doc/rfc6120/
 */
export class XmppMessageService implements MessageService {
  private readonly messageReceivedSubject = new Subject<Recipient>();
  private readonly messageSentSubject = new Subject<Recipient>();
  readonly jidToUnreadCount$: Observable<JidToNumber>;
  readonly message$: Connectable<Recipient>;
  readonly unreadMessageCountSum$: Observable<number>;

  constructor(
    private readonly chatService: XmppService,
    private readonly messageArchivePlugin: MessageArchivePlugin,
    private readonly multiUserPlugin: MultiUserChatPlugin,
    messageCarbonPlugin: MessageCarbonsPlugin,
    unreadMessageCount: UnreadMessageCountService
  ) {
    this.message$ = connectable(
      merge(
        this.messageReceivedSubject,
        this.messageSentSubject,
        this.multiUserPlugin.message$,
        messageCarbonPlugin.message$
      ).pipe(shareReplay({ bufferSize: 1, refCount: false }))
    );
    this.message$.connect();

    this.jidToUnreadCount$ = unreadMessageCount.jidToUnreadCount$;
    this.unreadMessageCountSum$ = unreadMessageCount.unreadMessageCountSum$;

    this.chatService.onOnline$.pipe(switchMap(() => this.initializeHandler())).subscribe();
  }

  async initializeHandler(): Promise<void> {
    await this.chatService.chatConnectionService.addHandler(
      (stanza) => this.handleMessageStanza(stanza),
      { name: 'message' }
    );
  }

  async loadCompleteHistory(): Promise<void> {
    return this.messageArchivePlugin.loadAllMessages();
  }

  async sendMessage(recipient: Recipient, body: string): Promise<void> {
    const trimmedBody = body.trim();
    if (trimmedBody.length === 0) {
      return;
    }
    switch (recipient.recipientType) {
      case 'room':
        await this.multiUserPlugin.sendMessage(recipient.jid.toString(), trimmedBody);
        this.messageSentSubject.next(recipient);
        break;
      case 'contact':
        await this.sendMessageToContact(recipient, trimmedBody);
        this.messageSentSubject.next(recipient);
        break;
      default:
        throw new Error(`invalid recipient type: ${recipient?.recipientType as string}`);
    }
  }

  async loadMostRecentUnloadedMessages(recipient: Recipient): Promise<void> {
    return this.messageArchivePlugin.loadMostRecentUnloadedMessages(recipient);
  }

  getContactMessageState(_message: Message, _contactJid: string): MessageState {
    throw new Error('Not implemented getContactMessageState');
    // return this.messageState.getContactMessageState(message, contactJid);
  }

  private async sendMessageToContact(recipient: Recipient, body: string): Promise<void> {
    const from = await firstValueFrom(this.chatService.chatConnectionService.userJid$);
    const messageBuilder = this.chatService.chatConnectionService
      .$msg({ to: recipient.jid.toString(), from, type: 'chat' })
      .c('body')
      .t(body);

    const message = {
      id: getUniqueId('msg-' + recipient.jid.toString() + '-'),
      direction: Direction.out,
      body,
      datetime: new Date(await firstValueFrom(this.chatService.pluginMap.entityTime.getNow())),
      delayed: false,
      fromArchive: false,
      state: MessageState.SENDING,
    };

    // TODO: on rejection mark message that it was not sent successfully
    try {
      await messageBuilder.send();
      recipient.messageStore.addMessage(message);
    } catch (rej) {
      throw new Error(
        `rejected message; message=${JSON.stringify(message)}, rejection=${JSON.stringify(rej)}`
      );
    }
  }

  /**
   *
   * @param stanza message to handle from connection, mam or other message extending plugins
   */
  async handleMessageStanza(stanza: MessageWithBodyStanza): Promise<boolean> {
    if (stanza.querySelector('error')) {
      // The recipient's account does not exist on the server.
      // The recipient is offline and the server is not configured to store offline messages for later delivery.
      // The recipient's client or server has some temporary issue that prevents message delivery.
      return true;
    }

    // can be wrapped in result from a query, or in a message received carbons
    const messageElement = Finder.create(stanza)
      .searchByTag('forwarded')
      .searchByTag('message').result;

    const delayElement = Finder.create(stanza).searchByTag('delay').result;

    const eventElement = Finder.create(stanza)
      .searchByTag('result')
      .searchByTag('forwarded')
      .searchByTag('message')
      .searchByTag('event')
      .searchByNamespace(nsPubSubEvent).result;

    // if is from archive get the inner message with type attribute
    const archiveMessage = Finder.create(stanza)
      .searchByTag('forwarded')
      .searchByTag('message').result;

    const messageFromArchive = !!archiveMessage;

    const messageStanza = eventElement?.querySelector('message') ?? archiveMessage ?? stanza;

    // result as first child comes from mam should call directly from there with the archive delay
    // received as first child comes from carbons should call directly from there with the archive delay
    if (messageStanza.querySelector('received') && !messageElement) {
      return true;
    }

    if (!messageFromArchive && !eventElement) {
      return this.handleSingleMessage(messageStanza, delayElement, messageFromArchive);
    }

    const messageElements = Finder.create(stanza)
      .searchByTag('forwarded')
      .searchForDeepestByTag('message').results;

    let handled = true; // Assume all messages will be handled successfully initially
    for (const message of messageElements) {
      if (!message) {
        handled = false;
        continue;
      }
      const result = await this.handleSingleMessage(message, delayElement, messageFromArchive);
      handled = handled && result;
    }

    return handled;
  }

  private async handleSingleMessage(
    messageStanza: Element,
    delayElement: Element | null = null,
    messageFromArchive = false
  ): Promise<boolean> {
    // The type attribute can be one of several values including "chat", "error", "groupchat", "headline", or "normal".
    // If no type is provided, it should be treated as if it were a "normal" message. Each type has its own specific usage context and meaning.
    const type = messageStanza.getAttribute('type');

    if (
      type === 'groupchat' ||
      this.multiUserPlugin.hasMUCExtensionWithoutInvite(messageStanza) ||
      this.multiUserPlugin.isRoomInvitationStanza(messageStanza)
    ) {
      return this.multiUserPlugin.handleRoomMessageStanza(messageStanza, delayElement);
    }

    const to = messageStanza.getAttribute('to');

    if (to == null) {
      throw new Error('to is null which should be only the case for type=groupchat messages');
    }
    const stamp = delayElement?.getAttribute('stamp');
    const datetime = stamp
      ? new Date(stamp)
      : new Date(await firstValueFrom(this.chatService.pluginMap.entityTime.getNow()));
    const me = await firstValueFrom(this.chatService.chatConnectionService.userJid$);
    const isAddressedToMe = parseJid(me).bare().equals(parseJid(to).bare());
    const direction = isAddressedToMe ? Direction.in : Direction.out;
    const contactJid = direction === Direction.in ? messageStanza.getAttribute('from') : to;
    const contact = await this.chatService.contactListService.getOrCreateContactById(
      contactJid as string
    );

    const message = {
      id: messageStanza.querySelector('stanza-id')?.id as string,
      // body can be missing on type=chat messageElements
      body: messageStanza.querySelector('body')?.textContent?.trim() as string,
      direction,
      datetime,
      // delayed message can be from another device (carbon XEP) or archive
      delayed: !!delayElement,
      fromArchive: messageFromArchive,
    };

    contact.messageStore.addMessage(message);

    if (direction === Direction.in && !messageFromArchive) {
      this.messageReceivedSubject.next(contact);
    }
    return true;
  }
}
