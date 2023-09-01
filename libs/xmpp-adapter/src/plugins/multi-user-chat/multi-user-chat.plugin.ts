// SPDX-License-Identifier: MIT
import { combineLatest, firstValueFrom, mergeMap, Observable, of, startWith, Subject } from 'rxjs';
import type {
  Invitation,
  Log,
  RoomConfiguration,
  RoomCreationOptions,
} from '@pazznetwork/ngx-chat-shared';
import {
  Affiliation,
  AffiliationModification,
  Direction,
  JID,
  Message,
  nsXForm,
  parseJid,
  Presence,
  Role,
  Room,
  RoomOccupant,
  TextualFormField,
  XmlSchemaForm,
} from '@pazznetwork/ngx-chat-shared';
import type { IqResponseStanza, Stanza, StanzaHandlerChatPlugin } from '../../core';
import { Finder, getField, parseForm, serializeToSubmitForm, setFieldValue } from '../../core';
import type { XmppService } from '../../xmpp.service';
import { nsDiscoInfo, nsDiscoItems, ServiceDiscoveryPlugin } from '../service-discovery.plugin';
import {
  nsMuc,
  nsMucAdmin,
  nsMucOwner,
  nsMucRoomConfigForm,
  nsMucUser,
  nsRSM,
} from './multi-user-chat-constants';
import { map, scan, shareReplay } from 'rxjs/operators';
import type { XmppConnectionService } from '../../service';
import type { Handler } from '@pazznetwork/strophets';
import type { StanzaBuilder } from '../../stanza-builder';
import { OtherStatusCode } from './other-status-code';
import { EnteringRoomStatusCode } from './entering-room-status-code';
import { ExitingRoomStatusCode } from './exiting-room-status-code';

/**
 * The MultiUserChatPlugin tries to provide the necessary functionality for a multi-user text chat,
 * whereby multiple XMPP users can exchange messages in the context of a room or channel, similar to Internet Relay Chat (IRC).
 * For more details see:
 *
 * @see https://xmpp.org/extensions/xep-0045.html
 */
export class MultiUserChatPlugin implements StanzaHandlerChatPlugin {
  readonly nameSpace = nsMuc;
  private readonly messageSubject = new Subject<Room>();
  readonly message$ = this.messageSubject.asObservable();

  private readonly invitationSubject = new Subject<Invitation>();
  readonly invitation$ = this.invitationSubject.asObservable();

  private readonly leftRoomSubject = new Subject<JID>();
  readonly leftRoom$ = this.leftRoomSubject.asObservable();

  private readonly createdRoomSubject = new Subject<Room>();
  readonly createdRoom$ = this.createdRoomSubject.asObservable();

  private readonly clearRoomsSubject = new Subject<void>();

  private readonly allLeftRooms$ = this.clearRoomsSubject.pipe(
    map((): Set<string> => new Set<string>()),
    mergeMap((initialSet) =>
      this.leftRoom$.pipe(
        scan((acc, val) => acc.add(val.toString()), initialSet),
        startWith(initialSet)
      )
    )
  );

  private readonly allCreatedRooms$ = this.clearRoomsSubject.pipe(
    map((): Map<string, Room> => new Map<string, Room>()),
    mergeMap((initialMap) =>
      this.createdRoom$.pipe(
        scan((acc, val) => acc.set(val.jid.toString(), val), initialMap),
        startWith(initialMap)
      )
    )
  );

  readonly rooms$ = combineLatest([this.allLeftRooms$, this.allCreatedRooms$]).pipe(
    map(([leftRoomSet, createdRoomMap]) =>
      Array.from(createdRoomMap.values()).filter(
        (val): boolean => !leftRoomSet.has(val.jid.toString())
      )
    ),
    startWith([]),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private handlers: { destroy?: Handler; presence?: Handler } = {};
  constructor(
    private readonly xmppService: XmppService,
    private readonly logService: Log,
    private readonly serviceDiscoveryPlugin: ServiceDiscoveryPlugin
  ) {
    xmppService.onAuthenticating$
      .pipe(
        mergeMap(async (): Promise<void> => {
          this.clearRoomsSubject.next();
          await this.registerHandler(xmppService.chatConnectionService);
        })
      )
      .subscribe();

    xmppService.onOffline$
      .pipe(
        mergeMap(async (): Promise<void> => {
          await this.unregisterHandler(xmppService.chatConnectionService);
          this.clearRoomsSubject.next();
        })
      )
      .subscribe();
  }

  async registerHandler(connection: XmppConnectionService): Promise<void> {
    this.handlers.destroy = await connection.addHandler(
      (stanza) => this.handleRoomDestroyedStanza(stanza),
      { ns: nsMucUser, name: 'destroy' }
    );

    this.handlers.presence = await connection.addHandler(
      (stanza) => this.handleRoomPresenceStanza(stanza),
      { ns: nsMuc, name: 'presence' },
      { ignoreNamespaceFragment: true, matchBareFromJid: true }
    );
  }

  async unregisterHandler(connection: XmppConnectionService): Promise<void> {
    if (this.handlers.destroy) {
      await connection.deleteHandler(this.handlers.destroy);
    }
    if (this.handlers.presence) {
      await connection.deleteHandler(this.handlers.presence);
    }
  }

  /**
   * Resolves if room could be configured as requested, rejects if room did exist or server did not accept configuration.
   */
  async createRoom(options: RoomCreationOptions): Promise<Room> {
    const userJid = await firstValueFrom(this.xmppService.userJid$);
    const { roomId, nick } = options;
    console.log('before findService');
    const service = await this.serviceDiscoveryPlugin.findService('conference', 'text');
    const occupantJid = parseJid(`${roomId}@${service.jid}/${nick ?? userJid}`);
    console.log('before join room internal');
    const { presenceResponse, room } = await this.joinRoomInternal(userJid, occupantJid);

    const itemElement = presenceResponse?.querySelector('x')?.querySelector('item');
    if (itemElement?.getAttribute('affiliation') !== Affiliation.owner) {
      throw new Error('error creating room, user is not owner: ' + presenceResponse.toString());
    }

    await this.applyRoomConfiguration(room.jid, options);
    room.name = options.name || undefined;
    return room;
  }

  handleRoomDestroyedStanza(stanza: Element): boolean {
    const roomJid = stanza?.querySelector('destroy')?.getAttribute('jid');
    if (!roomJid) {
      return false;
    }
    this.leftRoomSubject.next(parseJid(roomJid));
    return true;
  }

  async destroyRoom(roomJid: JID): Promise<void> {
    try {
      await this.xmppService.chatConnectionService
        .$iq({ type: 'set', to: roomJid.toString().toLowerCase() })
        .c('query', { xmlns: nsMucOwner })
        .c('destroy')
        .send();
    } catch (e) {
      this.logService.error('error destroying room');
      throw e;
    }
  }

  async joinRoom(occupantJid: JID): Promise<Room> {
    const userJid = await firstValueFrom(this.xmppService.chatConnectionService.userJid$);
    const { room } = await this.joinRoomInternal(userJid, occupantJid);

    return room;
  }

  async getRoomInfo(roomJid: JID): Promise<XmlSchemaForm | null> {
    const roomInfoResponse = await this.xmppService.chatConnectionService
      .$iq({ type: 'get', to: roomJid.toString() })
      .c('query', { xmlns: nsDiscoInfo })
      .send();

    const responseQueryItems = Array.from(roomInfoResponse?.querySelectorAll('query'));
    if (!responseQueryItems) {
      return null;
    }

    const infoElement = responseQueryItems.find(
      (el): boolean => el?.getAttribute('xmlns') === nsDiscoInfo
    );

    if (!infoElement) {
      return null;
    }

    const formEl = Array.from(infoElement.querySelectorAll('x')).find(
      (el): boolean => el.getAttribute('xmlns') === nsXForm
    );

    if (formEl) {
      return parseForm(formEl);
    }

    return null;
  }

  async getRoomsQuery(): Promise<Element> {
    const conferenceServer = await this.serviceDiscoveryPlugin.findService('conference', 'text');
    const to = conferenceServer.jid.toString();

    return this.xmppService.chatConnectionService
      .$iq({ type: 'get', to })
      .c('query', { xmlns: nsDiscoItems })
      .send();
  }

  async getRooms(): Promise<Room[]> {
    const roomQueryResponse = await this.getRoomsQuery();

    return this.extractRoomSummariesFromResponse(roomQueryResponse);
  }

  async queryAllRooms(): Promise<Room[]> {
    let roomQueryResponse = await this.getRoomsQuery();

    const result: Room[] = await this.getRooms();

    const extractResultSet = (iq: IqResponseStanza): Element | undefined =>
      Finder.create(iq)
        .searchByTag('query')
        .searchByNamespace(nsDiscoItems)
        .searchByTag('set')
        .searchByNamespace('http://jabber.org/protocol/rsm').result;

    let resultSet = extractResultSet(roomQueryResponse);

    const conferenceServer = await this.serviceDiscoveryPlugin.findService('conference', 'text');
    const to = conferenceServer.jid.toString();

    while (resultSet && resultSet.querySelector('last')) {
      const lastReceivedRoom = resultSet.querySelector('last')?.textContent;
      roomQueryResponse = await this.xmppService.chatConnectionService
        .$iq({ type: 'get', to })
        .c('query', { xmlns: nsDiscoItems })
        .c('set', { xmlns: nsRSM })
        .c('max', {}, String(250))
        .up()
        .c('after', {}, lastReceivedRoom as string)
        .send();
      result.push(...this.extractRoomSummariesFromResponse(roomQueryResponse));
      resultSet = extractResultSet(roomQueryResponse);
    }

    await Promise.all(
      result.map(async (summary): Promise<void> => {
        const roomInfo = await this.getRoomInfo(summary.jid);
        if (!roomInfo) {
          return;
        }
        summary.info = roomInfo;
      })
    );

    return result;
  }

  /**
   * Get all members of a MUC-Room with their affiliation to the room using the rooms fullJid
   *
   * @param roomJid jid of the room
   */
  async queryUserList(roomJid: JID): Promise<RoomOccupant[]> {
    const memberQueryResponses = await Promise.all([
      ...Object.values(Affiliation).map(
        (affiliation): Promise<Element> =>
          this.xmppService.chatConnectionService
            .$iq({ type: 'get', to: roomJid.toString() })
            .c('query', { xmlns: nsMucAdmin })
            .c('item', { affiliation })
            .send()
      ),
      ...Object.values(Role).map(
        (role): Promise<Element> =>
          this.xmppService.chatConnectionService
            .$iq({ type: 'get', to: roomJid.toString() })
            .c('query', { xmlns: nsMucAdmin })
            .c('item', { role })
            .send()
      ),
    ]);
    const members = new Map<string, RoomOccupant>();
    for (const memberQueryResponse of memberQueryResponses) {
      const queries = Array.from(memberQueryResponse.querySelectorAll('query'));
      if (!queries) {
        continue;
      }
      const adminQuery = queries.find((el): boolean => el.getAttribute('xmlns') === nsMucAdmin);

      if (!adminQuery) {
        continue;
      }

      Array.from(adminQuery.querySelectorAll('item')).forEach((memberItem): void => {
        if (!memberItem) {
          return;
        }
        const userJid = parseJid(memberItem.getAttribute('jid') as string);
        const roomUser = members.get(userJid.bare().toString()) || {
          jid: userJid,
          affiliation: Affiliation.none,
          role: Role.none,
          nick: memberItem.getAttribute('nick') ?? '',
        };

        const affiliation = memberItem.getAttribute('affiliation');
        roomUser.affiliation = affiliation as Affiliation;

        const role = memberItem.getAttribute('role');
        roomUser.role = role as Role;
        // tslint:enable no-unused-expression
        members.set(userJid.bare().toString(), roomUser);
      });
    }

    return [...members.values()];
  }

  async sendMessage(roomJid: string, body: string, thread?: string): Promise<Element> {
    const from = await firstValueFrom(this.xmppService.chatConnectionService.userJid$);
    const roomMessageBuilder = thread
      ? this.xmppService.chatConnectionService
          .$msg({ from, to: roomJid, type: 'groupchat' })
          .c('body', {}, body)
          .up()
          .c('thread', {}, thread)
      : this.xmppService.chatConnectionService
          .$msg({ from, to: roomJid, type: 'groupchat' })
          .c('body', {}, body);

    return roomMessageBuilder.send();
  }

  /**
   * requests a configuration form for a room which returns with the default values
   * for an example see:
   * https://xmpp.org/extensions/xep-0045.html#registrar-formtype-owner
   */
  async getRoomConfiguration(roomJid: JID): Promise<XmlSchemaForm> {
    const configurationForm = await this.xmppService.chatConnectionService
      .$iq({ type: 'get', to: roomJid.toString() })
      .c('query', { xmlns: nsMucOwner })
      .send();

    const xItems = configurationForm?.querySelector('query')?.querySelectorAll('x');
    if (!xItems) {
      throw new Error('Could not get room configuration; multi-user-chat:getRoomConfiguration');
    }
    const formElement = Array.from(xItems)?.find(
      (el): boolean => el.getAttribute('xmlns') === nsXForm
    );

    if (!formElement) {
      throw new Error('Could not find form element');
    }

    return parseForm(formElement);
  }

  async applyRoomConfiguration(roomJid: JID, roomConfiguration: RoomConfiguration): Promise<void> {
    const roomConfigForm = await this.getRoomConfiguration(roomJid);

    const formTypeField = getField(roomConfigForm, 'FORM_TYPE');
    if (formTypeField?.value !== nsMucRoomConfigForm) {
      throw new Error(
        `unexpected form type for room configuration form: formType=${String(
          formTypeField?.value
        )}, formTypeField=${JSON.stringify(formTypeField)}`
      );
    }

    if (roomConfiguration.name) {
      setFieldValue(
        roomConfigForm,
        'text-single',
        'muc#roomconfig_roomname',
        roomConfiguration.name
      );
    }
    if (roomConfiguration.nonAnonymous) {
      setFieldValue(
        roomConfigForm,
        'list-single',
        'muc#roomconfig_whois',
        roomConfiguration.nonAnonymous ? 'anyone' : 'moderators'
      );
    }
    if (roomConfiguration.public) {
      setFieldValue(
        roomConfigForm,
        'boolean',
        'muc#roomconfig_publicroom',
        roomConfiguration.public
      );
    }
    if (roomConfiguration.membersOnly) {
      setFieldValue(
        roomConfigForm,
        'boolean',
        'muc#roomconfig_membersonly',
        roomConfiguration.membersOnly
      );
    }
    if (roomConfiguration.persistentRoom) {
      setFieldValue(
        roomConfigForm,
        'boolean',
        'muc#roomconfig_persistentroom',
        roomConfiguration.persistentRoom
      );
    }
    if (roomConfiguration.allowSubscription) {
      setFieldValue(
        roomConfigForm,
        'boolean',
        'allow_subscription',
        roomConfiguration.allowSubscription
      );
    }

    this.xmppService.chatConnectionService
      .$iq({ type: 'set', to: roomJid.toString() })
      .c('query', { xmlns: nsMucOwner })
      .cCreateMethod((builder): StanzaBuilder => serializeToSubmitForm(builder, roomConfigForm));
  }

  getRoomByJid(jid: JID): Observable<Room | undefined> {
    return this.rooms$.pipe(map((rooms) => rooms?.find((room) => room?.jid?.equals(jid.bare()))));
  }

  async banUser(occupantJid: JID, roomJid: JID, reason?: string): Promise<IqResponseStanza> {
    const userJid = await this.getUserJidByOccupantJid(occupantJid, roomJid);

    const response = await this.xmppService.chatConnectionService
      .$iq({ to: roomJid.toString(), type: 'set' })
      .c('query', { xmlns: nsMucAdmin })
      .c('item', { jid: userJid.toString(), affiliation: Affiliation.outcast })
      .c('reason', {}, reason)
      .send();
    this.logService.debug(`ban response ${response.toString()}`);

    return response;
  }

  async unbanUser(occupantJid: JID, roomJid: JID): Promise<IqResponseStanza> {
    const userJid = await this.getUserJidByOccupantJid(occupantJid, roomJid);

    const banList = (await this.getBanList(roomJid)).map((bannedUser): JID => bannedUser.userJid);
    this.logService.debug(`ban list: ${JSON.stringify(banList)}`);

    if (!banList.find((bannedJid): boolean => bannedJid.equals(userJid))) {
      throw new Error(`error unbanning: ${userJid.toString()} isn't on the ban list`);
    }

    const response = await this.xmppService.chatConnectionService
      .$iq({ to: roomJid.toString(), type: 'set' })
      .c('query', { xmlns: nsMucAdmin })
      .c('item', { jid: userJid.toString(), affiliation: Affiliation.none })
      .send();
    this.logService.debug('unban response: ' + response.toString());

    return response;
  }

  async getBanList(roomJid: JID): Promise<AffiliationModification[]> {
    const response = await this.xmppService.chatConnectionService
      .$iq({ to: roomJid.toString(), type: 'get' })
      .c('query', { xmlns: nsMucAdmin })
      .c('item', { affiliation: Affiliation.outcast })
      .send();

    const responseItems = response?.querySelector('query')?.querySelectorAll('item');

    if (!responseItems) {
      return [];
    }

    return Array.from(responseItems).map(
      (item): { userJid: JID; reason: string; affiliation: Affiliation } => ({
        userJid: parseJid(item.getAttribute('jid') as string),
        affiliation: item.getAttribute('affiliation') as Affiliation,
        reason: item.querySelector('reason')?.textContent ?? '',
      })
    );
  }

  async inviteUser(inviteeJid: JID, roomJid: JID, invitationMessage?: string): Promise<void> {
    const from = await firstValueFrom(this.xmppService.chatConnectionService.userJid$);
    await this.xmppService.chatConnectionService
      .$msg({ to: roomJid.toString(), from })
      .c('x', { xmlns: nsMucUser })
      .c('invite', { to: inviteeJid.toString() })
      .cCreateMethod(
        (builder): StanzaBuilder =>
          invitationMessage ? builder.c('reason', {}, invitationMessage) : builder
      )
      .send();
  }

  async declineRoomInvite(occupantJid: JID, reason?: string): Promise<void> {
    const to = occupantJid.bare().toString();
    const from = await firstValueFrom(this.xmppService.chatConnectionService.userJid$);

    this.xmppService.chatConnectionService
      .$msg({ to, from })
      .c('x', { xmlns: nsMucUser })
      .c('decline', { to })
      .cCreateMethod(
        (builder): StanzaBuilder => (reason ? builder.c('reason', {}, reason) : builder)
      );
  }

  async kickFromRoom(nick: string, roomJid: JID, reason?: string): Promise<IqResponseStanza> {
    const response = await this.xmppService.chatConnectionService
      .$iq({ to: roomJid.toString(), type: 'set' })
      .c('query', { xmlns: nsMucAdmin })
      .c('item', { nick, role: Role.none })
      .c('reason', {}, reason)
      .send();
    this.logService.debug(`kick occupant response: ${response.toString()}`);
    return response;
  }

  async changeUserNickname(newNick: string, roomJid: JID): Promise<void> {
    const parsedJid = parseJid(roomJid.toString());
    const from = await firstValueFrom(this.xmppService.chatConnectionService.userJid$);

    await this.xmppService.chatConnectionService
      .$pres({ to: new JID(parsedJid.local, parsedJid.domain, newNick).toString(), from })
      .send();
  }

  async leaveRoom(occupantJid: JID, status?: string): Promise<void> {
    const from = await firstValueFrom(this.xmppService.chatConnectionService.userJid$);

    await this.xmppService.chatConnectionService
      .$pres({ to: occupantJid.toString(), from, type: Presence[Presence.unavailable] })
      .cCreateMethod(
        (builder): StanzaBuilder => (status ? builder.c('status', {}, status) : builder)
      )
      .send();
    this.logService.debug(`occupant left room: occupantJid=${occupantJid.toString()}`);
  }

  async changeRoomSubject(roomJid: JID, subject: string): Promise<void> {
    const from = await firstValueFrom(this.xmppService.chatConnectionService.userJid$);
    await this.xmppService.chatConnectionService
      .$msg({ to: roomJid.toString(), from, type: 'groupchat' })
      .c('subject', {}, subject)
      .send();
    this.logService.debug(
      `room subject changed: roomJid=${roomJid.toString()}, new subject=${subject}`
    );
  }

  isRoomInvitationStanza(stanza: Stanza): boolean {
    const x = Array.from(stanza.querySelectorAll('x')).find(
      (el): boolean => el.getAttribute('xmlns') === nsMucUser
    );
    return x != null && (x.querySelector('invite') != null || x.querySelector('decline') != null);
  }

  async grantMembership(userJid: JID, roomJid: JID, reason?: string): Promise<void> {
    await this.setAffiliation(userJid, roomJid, Affiliation.member, reason);
  }

  async revokeMembership(userJid: JID, roomJid: JID, reason?: string): Promise<void> {
    await this.setAffiliation(userJid, roomJid, Affiliation.none, reason);
  }

  async grantAdmin(userJid: JID, roomJid: JID, reason?: string): Promise<void> {
    await this.setAffiliation(userJid, roomJid, Affiliation.admin, reason);
  }

  async revokeAdmin(userJid: JID, roomJid: JID, reason?: string): Promise<void> {
    await this.setAffiliation(userJid, roomJid, Affiliation.member, reason);
  }

  async grantModeratorStatus(occupantNick: string, roomJid: JID, reason?: string): Promise<void> {
    await this.setRole(occupantNick, roomJid, Role.moderator, reason);
  }

  async revokeModeratorStatus(occupantNick: string, roomJid: JID, reason?: string): Promise<void> {
    await this.setRole(occupantNick, roomJid, Role.participant, reason);
  }

  private async handleRoomPresenceStanza(stanza: Stanza): Promise<boolean> {
    const stanzaType = stanza.getAttribute('type');

    if (stanzaType === 'error') {
      throw new Error(`error handling message, stanza: ${stanza.outerHTML}`);
    }

    const occupantJid = parseJid(stanza.getAttribute('from') as string);

    const xEl = Array.from(stanza.querySelectorAll('x')).find(
      (el): boolean => el.getAttribute('xmlns') === nsMucUser
    );

    const itemEl = xEl?.querySelector('item');

    if (!itemEl) {
      return false;
    }

    const subjectOccupant: RoomOccupant = {
      jid: occupantJid,
      affiliation: itemEl.getAttribute('affiliation') as Affiliation,
      role: itemEl.getAttribute('role') as Role,
      nick: occupantJid?.resource ?? '',
    };

    const isInCodes = (codes: string[], states: ExitingRoomStatusCode[]): boolean => {
      return codes.some((code): boolean => states.includes(code as ExitingRoomStatusCode));
    };

    if (stanzaType && stanzaType !== 'unavailable') {
      return false;
    }

    const statusElements = xEl?.querySelectorAll('status');

    if (!statusElements) {
      return false;
    }

    const statusCodes: string[] = Array.from(statusElements).map(
      (status): string => status.getAttribute('code') as string
    );
    const isCurrentUser = statusCodes.includes(OtherStatusCode.PresenceSelfRef);
    const createdRoom = statusCodes.includes(EnteringRoomStatusCode.NewRoomCreated);

    if (isCurrentUser && createdRoom) {
      this.createdRoomSubject.next(new Room(this.logService, occupantJid.bare()));
      return true;
    }

    const room = await this.getOrCreateRoom(occupantJid);
    if (!stanzaType && room.hasOccupant(subjectOccupant.jid)) {
      const oldOccupant = room.getOccupant(subjectOccupant.jid);
      room.handleOccupantModified(subjectOccupant, oldOccupant as RoomOccupant, isCurrentUser);
      return false;
    }

    if (!stanzaType) {
      room.handleOccupantJoined(subjectOccupant, isCurrentUser);
      return false;
    }

    const shouldRemoveRoom = isInCodes(statusCodes, Object.values(ExitingRoomStatusCode));
    if (shouldRemoveRoom || isCurrentUser) {
      this.leftRoomSubject.next(room.jid);
    }

    // stanzaType is unavailable if the user is in the process of leaving the room or being removed from the room
    // https://xmpp.org/extensions/xep-0045.html#example-43
    const actor = itemEl.querySelector('actor')?.getAttribute('nick');
    const reason = itemEl.querySelector('reason')?.textContent;
    if (
      isInCodes(statusCodes, [ExitingRoomStatusCode.MUCShutdown, ExitingRoomStatusCode.ErrorReply])
    ) {
      room.handleOccupantConnectionError(subjectOccupant, isCurrentUser);
      return true;
    }

    if (statusCodes.includes(ExitingRoomStatusCode.Kicked) && actor && reason) {
      room.handleOccupantKicked(subjectOccupant, isCurrentUser, actor, reason);
      return true;
    }

    if (statusCodes.includes(ExitingRoomStatusCode.Banned) && actor && reason) {
      room.handleOccupantBanned(subjectOccupant, isCurrentUser, actor, reason);
      return true;
    }

    if (statusCodes.includes(OtherStatusCode.NewNickNameInRoom) && xEl) {
      room.handleOccupantChangedNick(
        subjectOccupant,
        isCurrentUser,
        xEl?.querySelector('item')?.getAttribute('nick') ?? ''
      );
      return true;
    }

    if (statusCodes.includes(ExitingRoomStatusCode.AffiliationChange)) {
      room.handleOccupantLostMembership(subjectOccupant, isCurrentUser);
      return true;
    }

    if (statusCodes.includes(ExitingRoomStatusCode.MembersOnly)) {
      room.handleOccupantRoomMembersOnly(subjectOccupant, isCurrentUser);
      return true;
    }

    room.handleOccupantLeft(subjectOccupant, isCurrentUser);

    return true;
  }

  private async getOrCreateRoom(roomJid: JID): Promise<Room> {
    roomJid = roomJid.bare();
    let room = await firstValueFrom(this.getRoomByJid(roomJid));
    if (!room) {
      room = new Room(this.logService, roomJid);
      this.createdRoomSubject.next(room);
    }
    return room;
  }

  private async joinRoomInternal(
    joiningUser: string,
    roomJid: JID
  ): Promise<{ presenceResponse: Stanza; room: Room }> {
    const occupantJid = new JID(
      roomJid.local,
      roomJid.domain,
      roomJid.resource ?? joiningUser.split('@')[0]
    );

    const presenceResponse = await this.xmppService.chatConnectionService
      .$pres({ to: occupantJid.toString() })
      .c('x', { xmlns: nsMuc })
      .send();
    await this.handleRoomPresenceStanza(presenceResponse);

    const room = await this.getOrCreateRoom(occupantJid.bare());
    room.nick = occupantJid.resource;

    const roomInfo = await this.getRoomInfo(occupantJid.bare());

    if (!roomInfo) {
      throw new Error('Did not get roomInfo');
    }

    room.name = getField<TextualFormField>(roomInfo, 'muc#roomconfig_roomname')?.value;
    room.description =
      getField<TextualFormField>(roomInfo, 'muc#roominfo_description')?.value ?? '';

    return { presenceResponse, room };
  }

  private extractRoomSummariesFromResponse(iq: IqResponseStanza): Room[] {
    return Finder.create(iq)
      .searchByTag('query')
      .searchByNamespace(nsDiscoItems)
      .searchByTag('item')
      .results.reduce<Room[]>((acc, item): Room[] => {
        const jid = item.getAttribute('jid') as string;
        const name = item.getAttribute('name') as string;

        acc.push(new Room(this.logService, parseJid(jid), name));

        return acc;
      }, []);
  }

  async handleRoomMessageStanza(stanza: Stanza, archiveDelayElement?: Stanza): Promise<boolean> {
    if (stanza?.querySelector('body')?.textContent?.trim()) {
      const delayElement = archiveDelayElement ?? stanza.querySelector('delay');
      const stamp = delayElement?.getAttribute('stamp');
      const datetime$ = stamp
        ? of(new Date(stamp))
        : this.xmppService.pluginMap.entityTime
            .getNow()
            .pipe(map((number): Date => new Date(number)));

      const from = parseJid(stanza.getAttribute('from') as string);
      const room = await firstValueFrom(this.getRoomByJid(from.bare()));

      if (!room) {
        throw new Error('Can not handle message for undefined room; muc');
      }

      const datetimeFromObservable = await firstValueFrom(datetime$);
      const message: Message = {
        body: stanza?.querySelector('body')?.textContent?.trim() ?? '',
        datetime: datetimeFromObservable,
        id: stanza.getAttribute('id') as string,
        from,
        direction: room.occupantJid && from.equals(room.occupantJid) ? Direction.out : Direction.in,
        delayed: !!delayElement,
        fromArchive: archiveDelayElement != null,
      };
      room.messageStore.addMessage(message);

      if (!message.delayed) {
        this.messageSubject.next(room);
      }

      return true;
    }

    if (stanza.querySelector('subject') != null && stanza.querySelector('body') == null) {
      const roomJid = parseJid(stanza.getAttribute('from') as string).bare();
      // The archive only stores non-empty subjects. The current value of the subject is sent directly after entering a room by the room,
      // not the archive.
      // If a subject was first set, then unset, we would first receive the empty subject on room entry and then overwrite it with the
      // previous non-empty value from archive. This is why we want to always ignore subjects from archive.
      // This actually looks like a bug in MAM, it seems that MAM interprets messages with just subject in them as if they were chat
      // messages and not room metadata. This would explain why empty subjects are not stored.
      if (archiveDelayElement) {
        return true;
      }

      // should be 'await firstValueFrom(this.getRoomByJid(roomJid))' and we should ensure Room exists with the presence handler
      const room = await this.getOrCreateRoom(roomJid);

      if (!room) {
        throw new Error('Can not handle message for undefined room');
      }

      room.subject = stanza?.querySelector('subject')?.textContent?.trim() ?? '';

      return true;
    }

    if (this.isRoomInvitationStanza(stanza)) {
      const xElFinder = Finder.create(stanza).searchByTag('x').searchByNamespace(nsMucUser);
      const invitationEl =
        xElFinder.searchByTag('invite').result ?? xElFinder.searchByTag('decline').result;

      if (!invitationEl) {
        return false;
      }

      this.invitationSubject.next({
        type: invitationEl.tagName as Invitation['type'],
        roomJid: parseJid(stanza.getAttribute('from') as string),
        roomPassword: xElFinder?.searchByTag('password').result?.textContent as string,
        from: parseJid(invitationEl.getAttribute('from') as string),
        message: invitationEl.querySelector('reason')?.textContent ?? '',
      });

      return true;
    }

    return false;
  }

  private async setAffiliation(
    occupantJid: JID,
    roomJid: JID,
    affiliation: Affiliation,
    reason?: string
  ): Promise<IqResponseStanza> {
    const userJid = await this.getUserJidByOccupantJid(occupantJid, roomJid);

    return this.xmppService.chatConnectionService
      .$iq({ to: roomJid.toString(), type: 'set' })
      .c('query', { xmlns: nsMucAdmin })
      .c('item', { jid: userJid.toString(), affiliation })
      .c('reason', {}, reason)
      .send();
  }

  private async setRole(
    occupantNick: string,
    roomJid: JID,
    role: Role,
    reason?: string
  ): Promise<IqResponseStanza> {
    return this.xmppService.chatConnectionService
      .$iq({ to: roomJid.toString(), type: 'set' })
      .c('query', { xmlns: nsMucAdmin })
      .c('item', { nick: occupantNick, role })
      .c('reason', {}, reason)
      .send();
  }

  private async getUserJidByOccupantJid(occupantJid: JID, roomJid: JID): Promise<JID> {
    const users = await this.queryUserList(roomJid);
    const jid = users.find(
      (roomUser): boolean =>
        roomUser.nick === occupantJid.resource || roomUser.jid.bare().equals(occupantJid.bare())
    )?.jid;

    if (!jid) {
      throw new Error('No user jid for occupant jid');
    }

    return jid;
  }
}
