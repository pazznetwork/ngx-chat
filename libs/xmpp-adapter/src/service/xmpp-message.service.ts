// SPDX-License-Identifier: MIT
import {
  Direction,
  Invitation,
  JidToNumber,
  Message,
  MessageService,
  MessageState,
  parseJid,
  Recipient,
} from '@pazznetwork/ngx-chat-shared';
import type { Observable } from 'rxjs';
import { firstValueFrom, merge, Subject, switchMap } from 'rxjs';
import type {
  MessageArchivePlugin,
  MessageCarbonsPlugin,
  MultiUserChatPlugin,
  UnreadMessageCountService,
} from '@pazznetwork/xmpp-adapter';
import {
  Finder,
  MessageWithBodyStanza,
  nsConference,
  nsMucUser,
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
  private readonly messageSubject = new Subject<Recipient>();
  private readonly messageSentSubject: Subject<Recipient> = new Subject();
  readonly jidToUnreadCount$: Observable<JidToNumber>;
  readonly message$: Observable<Recipient>;
  readonly unreadMessageCountSum$: Observable<number>;

  constructor(
    private readonly chatService: XmppService,
    private readonly messageArchivePlugin: MessageArchivePlugin,
    private readonly multiUserPlugin: MultiUserChatPlugin,
    messageCarbonPlugin: MessageCarbonsPlugin,
    unreadMessageCount: UnreadMessageCountService
  ) {
    this.message$ = merge(
      this.messageSubject,
      this.messageSentSubject,
      messageCarbonPlugin.message$
    ).pipe(shareReplay({ bufferSize: 1, refCount: false }));

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

    const messageFromArchive = !!delayElement;
    // if is from archive get the inner message with type attribute
    const messageStanza = messageFromArchive
      ? (stanza.querySelector('message') as Element)
      : stanza;

    const me = await firstValueFrom(this.chatService.chatConnectionService.userJid$);
    const to = messageStanza.getAttribute('to');
    if (!to) {
      throw new Error('"to" cannot be undefined');
    }
    const from = messageElement?.getAttribute('from');
    const isAddressedToMe = parseJid(me).bare().equals(parseJid(to).bare());
    const messageDirection = isAddressedToMe ? Direction.in : Direction.out;
    const stamp = delayElement?.getAttribute('stamp');
    const datetime = stamp
      ? new Date(stamp)
      : new Date(await firstValueFrom(this.chatService.pluginMap.entityTime.getNow()));

    // result as first child comes from mam should call directly from there with the archive delay
    // received as first child comes from carbons should call directly from there with the archive delay
    if (messageStanza.querySelector('received')) {
      if (!messageElement) {
        return true;
      }
      // body can be missing on type=chat messageElements
      const body = messageElement.querySelector('body')?.textContent?.trim() ?? '';

      const message: Message = {
        id: messageElement.querySelector('stanza-id')?.id as string,
        body,
        direction: messageDirection,
        datetime,
        delayed: false,
        fromArchive: false,
      };
      const contactJid = messageDirection === Direction.in ? from : to;
      const contact = await this.chatService.contactListService.getOrCreateContactById(
        contactJid as string
      );
      contact.messageStore.addMessage(message);
      this.messageSubject.next(contact);

      return true;
    }

    if (messageFromArchive && eventElement) {
      const itemsElement = eventElement?.querySelector('items');

      if (!itemsElement) {
        throw new Error('No itemsElement to handle from archive');
      }

      const itemElements = Array.from(itemsElement.querySelectorAll('item'));
      const messagesHandled = await Promise.all(
        itemElements.reduce((acc: Promise<boolean>[], itemEl) => {
          const message = itemEl.querySelector('message');
          if (message && delayElement) {
            acc.push(
              this.handleMessage(
                message,
                messageDirection,
                datetime,
                messageFromArchive,
                messageFromArchive
              )
            );
          }

          return acc;
        }, [])
      );
      return messagesHandled.every((val) => val);
    }

    return this.handleMessage(
      messageStanza,
      messageDirection,
      datetime,
      messageFromArchive,
      messageFromArchive
    );
  }

  private extractInvitationFromMessage(messageStanza: MessageWithBodyStanza): Invitation {
    const invitations = Array.from(messageStanza.querySelectorAll('x'));
    const mediatedInvitation = invitations.find((el) => el.getAttribute('xmlns') === nsMucUser);
    const inviteEl = mediatedInvitation?.querySelector('invite');
    if (mediatedInvitation && inviteEl) {
      return {
        type: 'invite',
        from: parseJid(inviteEl?.getAttribute('from') as string),
        roomJid: parseJid(messageStanza.getAttribute('from') as string),
        reason: inviteEl?.querySelector('reason')?.textContent ?? '',
        password: mediatedInvitation.querySelector('password')?.textContent as string,
      };
    }

    const directInvitation = invitations.find((el) => el.getAttribute('xmlns') === nsConference);
    if (directInvitation) {
      return {
        type: 'invite',
        from: parseJid(messageStanza.getAttribute('from') as string),
        roomJid: parseJid(directInvitation.getAttribute('jid') as string),
        reason: directInvitation.getAttribute('reason') ?? '',
        password: directInvitation.getAttribute('password') as string,
      };
    }

    throw new Error(`unknown invitation format: ${messageStanza.toString()}`);
  }

  private async handleMessage(
    messageStanza: Element,
    direction: Direction,
    datetime: Date,
    delayed: boolean,
    messageFromArchive: boolean
  ): Promise<boolean> {
    const type = messageStanza.getAttribute('type');
    if (type === 'chat') {
      const message = {
        id: messageStanza.querySelector('stanza-id')?.id as string,
        body: messageStanza.querySelector('body')?.textContent?.trim() as string,
        direction,
        datetime,
        delayed,
        fromArchive: messageFromArchive,
      };

      const contactJid =
        direction === Direction.in
          ? messageStanza.getAttribute('from')
          : messageStanza.getAttribute('to');
      const contact = await this.chatService.contactListService.getOrCreateContactById(
        contactJid as string
      );

      contact.messageStore.addMessage(message);

      const invites = Array.from(messageStanza.querySelectorAll('x'));
      const isRoomInviteMessage =
        invites.find((el) => el.getAttribute('xmlns') === nsMucUser) ||
        invites.find((el) => el.getAttribute('xmlns') === nsConference);

      if (isRoomInviteMessage) {
        contact.newRoomInvitation(this.extractInvitationFromMessage(messageStanza));
      }

      if (direction === Direction.in && !messageFromArchive) {
        this.messageSubject.next(contact);
      }
      return true;
    } else if (type === 'groupchat' || this.multiUserPlugin.isRoomInvitationStanza(messageStanza)) {
      return this.multiUserPlugin.handleRoomMessageStanza(messageStanza);
    } else {
      throw new Error(`unknown archived message type: ${String(type)}`);
    }
  }
}
