// SPDX-License-Identifier: MIT
import {
  Contact,
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
  Stanza,
  XmppService,
} from '@pazznetwork/xmpp-adapter';
import type { HandlerAsync } from '@pazznetwork/strophets';
import { shareReplay } from 'rxjs/operators';

/**
 * Part of the XMPP Core Specification
 * see: https://datatracker.ietf.org/doc/rfc6120/
 */
export class XmppMessageService implements MessageService {
  private messageHandler?: HandlerAsync;
  private readonly messageSubject = new Subject<Contact>();
  private readonly messageSentSubject: Subject<Recipient> = new Subject();
  readonly messageSent$ = this.messageSentSubject.asObservable();
  readonly jidToUnreadCount$: Observable<JidToNumber>;
  readonly message$: Observable<Contact>;
  readonly unreadMessageCountSum$: Observable<number>;

  constructor(
    private readonly chatService: XmppService,
    private readonly messageArchivePlugin: MessageArchivePlugin,
    private readonly multiUserPlugin: MultiUserChatPlugin,
    // private readonly messageState: MessageStatePlugin,
    messageCarbonPlugin: MessageCarbonsPlugin,
    unreadMessageCount: UnreadMessageCountService
  ) {
    this.message$ = merge(this.messageSubject, messageCarbonPlugin.message$).pipe(
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.jidToUnreadCount$ = unreadMessageCount.jidToUnreadCount$;
    this.unreadMessageCountSum$ = unreadMessageCount.unreadMessageCountSum$;

    const registerHandler$ = this.chatService.onOnline$.pipe(
      switchMap(async () => {
        this.messageHandler = await this.chatService.chatConnectionService.addHandlerAsync(
          (stanza) => {
            if (!Finder.create(stanza).searchByTag('body').result) {
              return Promise.resolve(false);
            }
            return this.handleMessageStanza(stanza);
          },
          { name: 'message' }
        );
      })
    );
    const unregisterHandler$ = this.chatService.onOffline$.pipe(
      switchMap(async () => {
        if (!this.messageHandler) {
          throw new Error('There was no messageHandler in message.service');
        }
        this.messageHandler = await this.chatService.chatConnectionService.deleteHandlerAsync(
          this.messageHandler
        );
      })
    );
    merge(registerHandler$, unregisterHandler$).subscribe();
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
      direction: Direction.out,
      body,
      datetime: new Date(await firstValueFrom(this.chatService.pluginMap.entityTime.getNow())),
      delayed: false,
      fromArchive: false,
      state: MessageState.SENDING,
    };
    //const messageStanza = messageBuilder.tree();
    // this.chatService.pluginMap.messageState.beforeSendMessage(message, messageStanza);

    // TODO: on rejection mark message that it was not sent successfully
    try {
      const sendMessageStanza = await messageBuilder.send();
      const sendMessage: Message = {
        id: sendMessageStanza.getAttribute('id') as string,
        ...message,
      };
      recipient.messageStore.addMessage(sendMessage);
      // await this.chatService.pluginMap.messageState.afterSendMessage(sendMessage, messageStanza);
    } catch (rej) {
      throw new Error(
        `rejected message; message=${JSON.stringify(message)}, rejection=${JSON.stringify(rej)}`
      );
    }
  }

  /**
   *
   * @param messageStanza messageStanza to handle from connection, mam or other message extending plugins
   * @param archiveDelayElement only provided by MAM
   */
  async handleMessageStanza(
    messageStanza: MessageWithBodyStanza,
    archiveDelayElement?: Stanza
  ): Promise<boolean> {
    const me = await firstValueFrom(this.chatService.chatConnectionService.userJid$);
    const to = messageStanza.getAttribute('to');
    if (!to) {
      throw new Error('"to" cannot be undefined');
    }
    const isAddressedToMe = parseJid(me).bare().equals(parseJid(to).bare());
    const messageDirection = isAddressedToMe ? Direction.in : Direction.out;

    const messageFromArchive = archiveDelayElement != null;

    const delayElement = archiveDelayElement ?? messageStanza.querySelector('delay');
    const stamp = delayElement?.getAttribute('stamp');
    const datetime = stamp
      ? new Date(stamp)
      : new Date(await firstValueFrom(this.chatService.pluginMap.entityTime.getNow()));

    const message = {
      id: messageStanza.querySelector('stanza-id')?.id as string,
      body: messageStanza.querySelector('body')?.textContent?.trim() as string,
      direction: messageDirection,
      datetime,
      delayed: !!delayElement,
      fromArchive: messageFromArchive,
    };

    const contactJid = isAddressedToMe
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

    if (messageDirection === Direction.in && !messageFromArchive) {
      this.messageSubject.next(contact);
    }
    return true;
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
}
