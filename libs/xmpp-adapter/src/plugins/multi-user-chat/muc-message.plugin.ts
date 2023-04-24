// SPDX-License-Identifier: MIT
import type { Contact, Invitation, Log } from '@pazznetwork/ngx-chat-shared';
import { Direction, parseJid } from '@pazznetwork/ngx-chat-shared';
import { firstValueFrom, mergeMap, Subject, switchMap } from 'rxjs';
import type { Handler } from '@pazznetwork/strophets';
import type { ChatPlugin, MessageWithBodyStanza, Stanza } from '../../core';
import type { XmppService } from '../../';
import { nsConference, nsMucUser } from '../';

/**
 * Part of the XMPP Core Specification
 * see: https://datatracker.ietf.org/doc/rfc6120/
 */
export class MucMessagePlugin implements ChatPlugin {
  nameSpace = nsConference;

  private messageHandler?: Handler;

  private messageStanzaSubject = new Subject<Stanza>();
  private readonly messageSubject = new Subject<Contact>();
  readonly message$ = this.messageSubject.asObservable();

  constructor(private readonly chatService: XmppService, private readonly logService: Log) {
    this.chatService.onOnline$
      .pipe(
        switchMap(async () => {
          this.messageHandler = await this.chatService.chatConnectionService.addHandler(
            (stanza) => {
              this.messageStanzaSubject.next(stanza);
              return true;
            },
            { ns: this.nameSpace, name: 'message', type: 'chat' }
          );
        })
      )
      .subscribe();

    this.chatService.onOffline$
      .pipe(
        switchMap(async () => {
          if (!this.messageHandler) {
            throw new Error('muc-message.plugin messageHandler undefined');
          }
          await this.chatService.chatConnectionService.deleteHandler(this.messageHandler);
        })
      )
      .subscribe();

    this.messageStanzaSubject
      .pipe(mergeMap((stanza) => this.handleMessageStanza(stanza)))
      .subscribe();
  }

  /**
   *
   * @param messageStanza messageStanza to handle from connection, mam or other message extending plugins
   * @param archiveDelayElement only provided by MAM
   */
  async handleMessageStanza(
    messageStanza: MessageWithBodyStanza,
    archiveDelayElement?: Stanza
  ): Promise<void> {
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

    if (messageDirection === Direction.in && !messageFromArchive) {
      this.logService.debug(
        'message received <=',
        messageStanza?.querySelector('body')?.textContent
      );
    }

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

    const directInvitation = invitations.find((el) => el.getAttribute('xmlns') === this.nameSpace);
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
