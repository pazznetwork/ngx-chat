// SPDX-License-Identifier: MIT
import {
  Direction,
  type JidToNumber,
  type Message,
  type MessageService,
  MessageState,
  parseJid,
  type Recipient,
  runInZone,
} from '@pazznetwork/ngx-chat-shared';
import {
  Connectable,
  connectable,
  firstValueFrom,
  merge,
  Observable,
  Subject,
  switchMap,
} from 'rxjs';
import type {
  MessageArchivePlugin,
  MessageCarbonsPlugin,
  MessageStatePlugin,
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
import { getUniqueId } from '@pazznetwork/strophe-ts';

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

  readonly messageSent$: Observable<Recipient>;

  readonly messageReceived$: Observable<Recipient>;

  private queuedMessages: { recipient: Recipient; body: string }[] = [];

  constructor(
    private readonly chatService: XmppService,
    private readonly messageArchivePlugin: MessageArchivePlugin,
    private readonly multiUserPlugin: MultiUserChatPlugin,
    private readonly messageStatePlugin: MessageStatePlugin,
    messageCarbonPlugin: MessageCarbonsPlugin,
    unreadMessageCount: UnreadMessageCountService
  ) {
    this.message$ = connectable(
      merge(
        this.messageReceivedSubject,
        this.messageSentSubject,
        this.multiUserPlugin.message$,
        messageCarbonPlugin.message$
      ).pipe(shareReplay({ bufferSize: 1, refCount: false }), runInZone(chatService.zone))
    );
    this.message$.connect();

    this.messageSent$ = this.messageSentSubject.pipe(
      shareReplay({ refCount: false, bufferSize: 1 }),
      runInZone(this.chatService.zone)
    );

    this.messageReceived$ = this.messageReceivedSubject.pipe(
      shareReplay({ refCount: false, bufferSize: 1 }),
      runInZone(this.chatService.zone)
    );

    this.jidToUnreadCount$ = unreadMessageCount.jidToUnreadCount$.pipe(runInZone(chatService.zone));
    this.unreadMessageCountSum$ = unreadMessageCount.unreadMessageCountSum$.pipe(
      runInZone(chatService.zone)
    );

    this.chatService.onOnline$.pipe(switchMap(() => this.initializeHandler())).subscribe();
    this.chatService.onOnline$.subscribe(() => this.flushQueuedMessages());
  }

  async initializeHandler(): Promise<void> {
    await this.chatService.chatConnectionService.addHandler(
      (stanza) => this.handleMessageStanza(stanza),
      { name: 'message' }
    );
    await this.messageArchivePlugin.requestNewestMessages();
  }

  async loadCompleteHistory(): Promise<void> {
    return this.messageArchivePlugin.loadAllMessages();
  }

  async sendMessage(recipient: Recipient, body: string): Promise<void> {
    const trimmedBody = body.trim();
    if (trimmedBody.length === 0) {
      return;
    }

    const isOnline = await firstValueFrom(this.chatService.isOnline$);

    if (!isOnline) {
      this.queuedMessages.push({ recipient, body: trimmedBody });
      if (recipient.recipientType === 'contact') {
        await this.addOptimisticMessage(recipient, trimmedBody);
      }
      return;
    }

    try {
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
    } catch (e) {
      // If send fails, queue it
      this.queuedMessages.push({ recipient, body: trimmedBody });
    }
  }

  private async flushQueuedMessages(): Promise<void> {
    const messages = [...this.queuedMessages];
    this.queuedMessages = [];
    for (const msg of messages) {
      await this.sendMessage(msg.recipient, msg.body);
    }
  }

  private async addOptimisticMessage(recipient: Recipient, body: string): Promise<void> {
    const message = {
      id: getUniqueId('msg-' + recipient.jid.toString() + '-'),
      direction: Direction.out,
      body,
      datetime: new Date(), // Use local time for optimistic
      delayed: false,
      fromArchive: false,
      state: MessageState.SENDING,
    };
    recipient.messageStore.addMessage(message);
  }

  loadMessagesBeforeOldestMessage(recipient: Recipient): Promise<void> {
    return this.messageArchivePlugin.loadMessagesBeforeOldestMessage(recipient);
  }

  async loadMostRecentMessages(recipient: Recipient): Promise<void> {
    return this.messageArchivePlugin.loadMostRecentMessages(recipient);
  }

  getContactMessageState(message: Message, contactJid: string): MessageState {
    return this.messageStatePlugin.getContactMessageState(message, contactJid);
  }

  private async sendMessageToContact(recipient: Recipient, body: string): Promise<void> {
    const from = await firstValueFrom(this.chatService.chatConnectionService.userJid$);
    const id = getUniqueId('msg-' + recipient.jid.toString() + '-');
    const messageBuilder = this.chatService.chatConnectionService
      .$msg({ to: recipient.jid.toString(), from, type: 'chat', id })
      .c('origin-id', { xmlns: 'urn:xmpp:sid:0', id })
      .up()
      .c('body')
      .t(body);

    const message = {
      id,
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
      await this.messageStatePlugin.afterSendMessage(recipient.jid, message);
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
    const mamResult = stanza.querySelector('result');
    if (mamResult) {
      // MAM Result handling if needed
    }

    if (stanza.querySelector('error')) {
      // The recipient's account does not exist on the server.
      // The recipient is offline and the server is not configured to store offline messages for later delivery.
      // The recipient's client or server has some temporary issue that prevents message delivery.
      return true;
    }

    if (this.chatService.pluginMap.pubSub.isPubSubEvent(stanza)) {
      this.chatService.pluginMap.pubSub.publishEvent(stanza);
      return true;
    }

    if (this.messageStatePlugin.isMessageState(stanza)) {
      return this.messageStatePlugin.handleStanza(stanza);
    }



    const delayElement = Finder.create(stanza).searchByTag('delay').result;

    const eventElement = Finder.create(stanza)
      .searchByTag('result')
      .searchByTag('forwarded')
      .searchByTag('message')
      .searchByTag('event')
      .searchByNamespace(nsPubSubEvent).result;

    // if is from archive get the inner message with type attribute
    const archiveMessage =
      Finder.create(stanza).searchByTag('result').searchByTag('forwarded').searchByTag('message')
        .result ??
      Finder.create(stanza).searchByTag('forwarded').searchByTag('message').result;

    const isCarbon = stanza.getElementsByTagName('received').length > 0 ||
      stanza.getElementsByTagName('sent').length > 0;
    const messageFromArchive = !!archiveMessage && !isCarbon;

    const messageStanza = eventElement?.querySelector('message') ?? archiveMessage ?? stanza;


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

    const stanzaId = messageStanza.querySelector('stanza-id')?.getAttribute('id') ?? undefined;
    const id =
      messageStanza.querySelector('origin-id')?.getAttribute('id') ??
      messageStanza.getAttribute('id') ??
      stanzaId as string;

    const message = {
      id,
      stanzaId,
      // body can be missing on type=chat messageElements
      body: messageStanza.querySelector('body')?.textContent?.trim() as string,
      direction,
      datetime,
      // delayed message can be from another device (carbon XEP) or archive
      delayed: !!delayElement,
      fromArchive: messageFromArchive,
    };

    contact.messageStore.addMessage(message);
    await this.messageStatePlugin.afterReceiveMessage(contact, message);

    if (direction === Direction.in && !messageFromArchive) {
      this.messageReceivedSubject.next(contact);
    }
    return true;
  }
}
