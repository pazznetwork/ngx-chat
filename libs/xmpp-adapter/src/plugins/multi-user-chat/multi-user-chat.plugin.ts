// SPDX-License-Identifier: MIT
import {
  Connectable,
  connectable,
  filter,
  firstValueFrom,
  map,
  merge,
  mergeMap,
  Observable,
  of,
  ReplaySubject,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import type {
  Invitation,
  Log,
  RoomConfiguration,
  RoomCreationOptions,
} from '@pazznetwork/ngx-chat-shared';
import { getUniqueId } from '@pazznetwork/strophe-ts';
import {
  Affiliation,
  AffiliationModification,
  CustomRoomFactory,
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
import type { Handler } from '@pazznetwork/strophe-ts';
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
  private readonly messageReceivedSubject = new ReplaySubject<Room>(1);
  readonly message$ = this.messageReceivedSubject.asObservable();

  private readonly invitationSubject = new ReplaySubject<Invitation>(1);
  readonly invitation$ = this.invitationSubject.asObservable();

  private readonly leftRoomSubject = new ReplaySubject<JID>(1);
  readonly leftRoom$ = this.leftRoomSubject.asObservable();

  private readonly destroyedRoomSubject = new ReplaySubject<JID>(1);
  readonly destroyedRoom$ = this.destroyedRoomSubject.asObservable();

  private readonly createdRoomSubject = new ReplaySubject<Room>(1);
  private readonly updateRoomSubject = new ReplaySubject<Room>(1);

  private readonly roomsFetchedSubject = new ReplaySubject<boolean>(1);

  private readonly roomsMap = new Map<string, Room>();

  readonly rooms$: Connectable<Room[]>;

  private handlers: { destroy?: Handler; presence?: Handler } = {};
  constructor(
    private readonly xmppService: XmppService,
    private readonly logService: Log,
    private readonly serviceDiscoveryPlugin: ServiceDiscoveryPlugin,
    private readonly customRoomFactory: CustomRoomFactory
  ) {
    this.rooms$ = connectable(
      merge(
        this.createdRoomSubject.pipe(
          map((createdRoom) => {
            const key = createdRoom.jid.bare().toString().toLowerCase();
            if (!this.roomsMap.has(key)) {
              this.roomsMap.set(key, createdRoom);
            }
            return this.roomsMap;
          })
        ),
        this.updateRoomSubject.pipe(
          map((updatedRoom) => {
            const key = updatedRoom.jid.bare().toString().toLowerCase();
            if (this.roomsMap.has(key)) {
              this.roomsMap.set(key, updatedRoom);
              return this.roomsMap;
            }
            return this.roomsMap;
          })
        ),
        merge(this.leftRoomSubject, this.destroyedRoomSubject).pipe(
          map((jid) => {
            this.roomsMap.delete(jid.bare().toString().toLowerCase());
            return this.roomsMap;
          })
        ),
        this.xmppService.onOnline$.pipe(
          mergeMap(async () => this.getPublicOrJoinedRooms()),
          map((rooms) => {
            rooms.forEach((room) => {
              const roomBareJid = room.jid.bare().toString().toLowerCase();
              if (!this.roomsMap.has(roomBareJid)) {
                this.roomsMap.set(roomBareJid, room);
              }
            });
            return this.roomsMap;
          }),
          tap(() => this.roomsFetchedSubject.next(true))
        ),
        this.xmppService.onOffline$.pipe(
          map(() => {
            this.roomsMap.clear();
            return this.roomsMap;
          }),
          tap(() => this.roomsFetchedSubject.next(false))
        )
      ).pipe(
        map((roomMap) => Array.from(roomMap.values())),
        startWith([]),
        shareReplay({ bufferSize: 1, refCount: false })
      ),
      { connector: () => new ReplaySubject<Room[]>(1), resetOnDisconnect: false }
    );

    xmppService.onOnline$.pipe(switchMap(() => this.registerHandler())).subscribe();
    xmppService.onOffline$.pipe(switchMap(() => this.unregisterHandler())).subscribe();

    //TODO: move to be after service initialization
    this.rooms$.connect();
  }

  async registerHandler(): Promise<void> {
    this.handlers.destroy = await this.xmppService.chatConnectionService.addHandler(
      (stanza) => this.handleRoomDestroyedStanza(stanza),
      { ns: nsMucUser, name: 'destroy' }
    );

    this.handlers.presence = await this.xmppService.chatConnectionService.addHandler(
      (stanza) => this.handleRoomPresenceStanza(stanza),
      { ns: nsMuc, name: 'presence' },
      { ignoreNamespaceFragment: true, matchBareFromJid: true }
    );
    await this.xmppService.chatConnectionService.addHandler(
      (stanza) => this.handleRoomPresenceStanza(stanza),
      { ns: nsMucUser, name: 'presence' },
      { ignoreNamespaceFragment: true, matchBareFromJid: true }
    );
  }

  async unregisterHandler(): Promise<void> {
    if (this.handlers.destroy) {
      await this.xmppService.chatConnectionService.deleteHandler(this.handlers.destroy);
    }
    if (this.handlers.presence) {
      await this.xmppService.chatConnectionService.deleteHandler(this.handlers.presence);
    }
  }

  /**
   * Resolves if room could be configured as requested, rejects if room did exist or server did not accept configuration.
   */
  async createRoom(options: RoomCreationOptions): Promise<Room> {
    const userJid = parseJid(await firstValueFrom(this.xmppService.userJid$));
    const { roomId, nick } = options;
    const service = await this.serviceDiscoveryPlugin.findService('conference', 'text');


    const roomJid = new JID(roomId, service.jid, nick ?? userJid.local);

    const roomFromUser = await firstValueFrom(this.getRoomByJid(roomJid.bare()));

    if (roomFromUser) {
      return roomFromUser;
    }

    const presenceResponse = await this.xmppService.chatConnectionService
      .$pres({ to: roomJid.toString() })
      .c('x', { xmlns: nsMuc })
      .send();
    const room = await this.getOrCreateRoom(roomJid);
    await this.handleRoomPresenceStanza(presenceResponse, room);
    room.handleOccupantJoined(
      {
        jid: userJid.bare(),
        affiliation: presenceResponse.getAttribute('affiliation') as Affiliation,
        role: presenceResponse.getAttribute('role') as Role,
        nick: userJid?.resource ?? '',
      },
      true
    );

    const roomInfo = await this.getRoomInfo(roomJid.bare());

    if (!roomInfo) {
      throw new Error('Did not get roomInfo');
    }

    room.name = getField<TextualFormField>(roomInfo, 'muc#roomconfig_roomname')?.value;
    room.description =
      getField<TextualFormField>(roomInfo, 'muc#roominfo_description')?.value ?? '';

    const itemElement = presenceResponse?.querySelector('x')?.querySelector('item');
    if (itemElement?.getAttribute('affiliation') !== Affiliation.owner) {
      throw new Error('error creating room, user is not owner: ' + presenceResponse.toString());
    }

    await this.applyRoomConfiguration(room.jid, options);
    room.name = options.name || undefined;
    this.updateRoomSubject.next(room);
    return room;
  }

  handleRoomDestroyedStanza(stanza: Element): boolean {
    const roomJid = stanza?.querySelector('destroy')?.getAttribute('jid');
    if (!roomJid) {
      return false;
    }
    this.destroyedRoomSubject.next(parseJid(roomJid));
    return true;
  }

  async destroyRoom(roomJid: JID): Promise<void> {
    // const lessRoomsPromise = firstValueFrom(
    //   this.rooms$.pipe(
    //     map((rooms) => rooms.length),
    //     pairwise(),
    //     filter(([before, after]) => before > after)
    //   )
    // );
    if (!this.roomsMap.get(roomJid.bare().toString())) {
      throw new Error('Room does not exist in your list');
    }
    try {
      await this.xmppService.chatConnectionService
        .$iq({ type: 'set', to: roomJid.toString().toLowerCase() })
        .c('query', { xmlns: nsMucOwner })
        .c('destroy')
        .send();
      this.destroyedRoomSubject.next(roomJid);

      // await lessRoomsPromise; // avoiding deadlock if rooms$ is stalled
    } catch (e) {
      this.logService.error((e as Element)?.outerHTML, 'error destroying room');
      throw e;
    }
  }

  async joinRoom(roomJid: JID): Promise<Room> {
    const userJid = await firstValueFrom(this.xmppService.chatConnectionService.userJid$);
    const occupantJid = new JID(
      roomJid.local,
      roomJid.domain,
      roomJid.resource != '' && roomJid.resource != null ? roomJid.resource : userJid.split('@')[0]
    );

    const presenceResponse = await this.xmppService.chatConnectionService
      .$pres({ to: occupantJid.toString() })
      .c('x', { xmlns: nsMuc })
      .c('history', { maxstanzas: '50', seconds: '604800' }) // 7 days
      .up()
      .send();

    await this.handleRoomPresenceStanza(presenceResponse);

    const room = await this.getOrCreateRoom(occupantJid.bare());

    room.nick = occupantJid.resource;

    const roomInfo = await this.getRoomInfo(occupantJid.bare());

    if (!roomInfo) {
      throw new Error('Did not get roomInfo');
    }

    const fieldName = getField<TextualFormField>(roomInfo, 'muc#roomconfig_roomname')?.value;

    if (fieldName) {
      room.name = fieldName;
    } else if (!room.name) {
      room.name = roomJid.local;
    }
    room.description =
      getField<TextualFormField>(roomInfo, 'muc#roominfo_description')?.value ?? '';
    this.createdRoomSubject.next(room);

    await this.handleRoomPresenceStanza(presenceResponse, room);
    room.handleOccupantJoined(
      {
        jid: occupantJid,
        affiliation: presenceResponse.getAttribute('affiliation') as Affiliation,
        role: presenceResponse.getAttribute('role') as Role,
        nick: occupantJid?.resource ?? '',
      },
      true
    );
    await this.xmppService.messageService.loadMostRecentMessages(room);

    return room;
  }

  async getRoomInfo(roomJid: JID): Promise<XmlSchemaForm | undefined> {
    const roomInfoResponse = await this.xmppService.chatConnectionService
      .$iq({ type: 'get', to: roomJid.toString() })
      .c('query', { xmlns: nsDiscoInfo })
      .send();

    const responseQueryItems = Array.from(roomInfoResponse?.querySelectorAll('query'));
    if (!responseQueryItems) {
      return undefined;
    }

    const infoElement = responseQueryItems.find(
      (el): boolean => el?.getAttribute('xmlns') === nsDiscoInfo
    );

    if (!infoElement) {
      return undefined;
    }

    const formEl = Array.from(infoElement.querySelectorAll('x')).find(
      (el): boolean => el.getAttribute('xmlns') === nsXForm
    );

    if (formEl) {
      return parseForm(formEl);
    }

    return undefined;
  }

  async getRoomsQuery(): Promise<Element> {
    const conferenceServer = await this.serviceDiscoveryPlugin.findService('conference', 'text');
    const to = conferenceServer.jid.toString();

    return this.xmppService.chatConnectionService
      .$iq({ type: 'get', to })
      .c('query', { xmlns: nsDiscoItems })
      .send();
  }


  async getPublicOrJoinedRooms(): Promise<Room[]> {
    const roomQueryResponse = await this.getRoomsQuery();

    return this.extractRoomSummariesFromResponse(roomQueryResponse);
  }

  /**
   * Usually on simple query request as server responds with a maximum of 250 rooms if not with another configured limit.
   * If one wants to get all rooms, one has to use the result set management extension (RSM) and query them page by page.
   *
   * @returns {Promise<Room[]>}
   */
  async queryAllRooms(): Promise<Room[]> {
    let roomQueryResponse = await this.getRoomsQuery();

    const result: Room[] = await this.extractRoomSummariesFromResponse(roomQueryResponse);

    const extractResultSet = (iq: IqResponseStanza): Element | undefined =>
      Finder.create(iq)
        .searchByTag('query')
        .searchByNamespace(nsDiscoItems)
        .searchByTag('set')
        .searchByNamespace(nsRSM).result;

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
        .cCreateMethod((builder) =>
          lastReceivedRoom ? builder.c('after', {}, lastReceivedRoom) : builder
        )
        .send();
      result.push(...(await this.extractRoomSummariesFromResponse(roomQueryResponse)));
      resultSet = extractResultSet(roomQueryResponse);
    }

    await Promise.all(
      result.map(async (room: Room): Promise<void> => {
        // room.addOccupants(await this.queryUserList(room.jid));
        const roomInfo = await this.getRoomInfo(room.jid);
        if (!roomInfo) {
          return;
        }
        room.info = roomInfo;
      })
    );

    return result;
  }

  /**
   * Get all members of a MUC-Room with their affiliation to the room using the rooms fullJid.
   * **Can be only called by room moderators.**
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

  async sendMessage(roomJid: string, body: string): Promise<Element> {
    const from = await firstValueFrom(this.xmppService.chatConnectionService.userJid$);
    const id = getUniqueId('muc-msg-');

    return this.xmppService.chatConnectionService
      .$msg({ from, to: roomJid, id, type: 'groupchat' })
      .c('body', {}, body)
      .send();
  }

  async sendThreadMessage(roomJid: string, body: string, thread: string): Promise<Element> {
    const from = await firstValueFrom(this.xmppService.chatConnectionService.userJid$);
    return this.xmppService.chatConnectionService
      .$msg({ from, to: roomJid, type: 'groupchat' })
      .c('body', {}, body)
      .up()
      .c('thread', {}, thread)
      .send();
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
      throw new Error(`Room configuration not supported for ${roomJid.toString()}, expected ${nsMucRoomConfigForm}, but got ${formTypeField?.value}`);
    }

    if (roomConfiguration.name) {
      setFieldValue(
        roomConfigForm,
        'text-single',
        'muc#roomconfig_roomname',
        roomConfiguration.name
      );
    }

    if (roomConfiguration.public != undefined) {
      setFieldValue(
        roomConfigForm,
        'boolean',
        'muc#roomconfig_publicroom',
        roomConfiguration.public
      );
    }

    if (roomConfiguration.publicList != undefined) {
      setFieldValue(
        roomConfigForm,
        'boolean',
        'public_list',
        roomConfiguration.publicList
      );
    }

    if (roomConfiguration.membersOnly != undefined) {
      setFieldValue(
        roomConfigForm,
        'boolean',
        'muc#roomconfig_membersonly',
        roomConfiguration.membersOnly
      );
    }

    if (roomConfiguration.nonAnonymous != undefined) {
      setFieldValue(
        roomConfigForm,
        'list-single',
        'muc#roomconfig_whois',
        roomConfiguration.nonAnonymous ? 'anyone' : 'moderators'
      );
    }

    if (roomConfiguration.persistentRoom != undefined) {
      setFieldValue(
        roomConfigForm,
        'boolean',
        'muc#roomconfig_persistentroom',
        roomConfiguration.persistentRoom
      );
    }

    if (roomConfiguration.moderated != undefined) {
      setFieldValue(
        roomConfigForm,
        'boolean',
        'muc#roomconfig_moderatedroom',
        roomConfiguration.moderated
      );
    }

    if (roomConfiguration.allowSubscription != undefined) {
      setFieldValue(
        roomConfigForm,
        'boolean',
        'allow_subscription',
        roomConfiguration.allowSubscription
      );
    }
    if (roomConfiguration.enableLogging != undefined || roomConfiguration.mam != undefined) {
      const hasEnableLogging = !!getField(roomConfigForm, 'muc#roomconfig_enablelogging');
      const hasMam = !!getField(roomConfigForm, 'mam') || !!getField(roomConfigForm, 'muc#roomconfig_mam');

      if (hasEnableLogging && roomConfiguration.enableLogging != undefined) {
        setFieldValue(
          roomConfigForm,
          'boolean',
          'muc#roomconfig_enablelogging',
          roomConfiguration.enableLogging
        );
      }


      const mamValue = roomConfiguration.mam ?? roomConfiguration.enableLogging;
      if (mamValue != undefined) {
        // Prefer standard muc# prefix if available or if forcing creation
        const mamField = getField(roomConfigForm, 'muc#roomconfig_mam') ? 'muc#roomconfig_mam' : 'mam';
        setFieldValue(
          roomConfigForm,
          'boolean',
          mamField,
          mamValue,
          !hasMam
        );
      }
    }

    await this.xmppService.chatConnectionService
      .$iq({ type: 'set', to: roomJid.toString() })
      .c('query', { xmlns: nsMucOwner })
      .cCreateMethod((builder): StanzaBuilder => serializeToSubmitForm(builder, roomConfigForm))
      .send();


  }

  getRoomByJid(jid: JID): Observable<Room | undefined> {
    const cachedRoom = this.getRoomFromCache(jid);
    if (cachedRoom) {
      return of(cachedRoom);
    }
    return this.rooms$.pipe(
      map((rooms) => rooms?.find((room) => {
        const rBare = room?.jid?.bare();
        return rBare && rBare.toString().toLowerCase() === jid.bare().toString().toLowerCase();
      }))
    );
  }

  private getRoomFromCache(jid: JID): Room | undefined {
    return this.roomsMap.get(jid.bare().toString().toLowerCase());
  }

  async banUser(occupantJid: JID, roomJid: JID, reason?: string): Promise<IqResponseStanza> {
    let userJid = await this.getUserJidByOccupantJid(occupantJid, roomJid);

    if (!userJid) {
      // If user not found in room (e.g. offline), assume the passed JID is the real user JID
      userJid = occupantJid;
    }

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
    const bannedUsersStanza = await this.xmppService.chatConnectionService
      .$iq({ type: 'get', to: roomJid.toString() })
      .c('query', { xmlns: nsMucAdmin })
      .c('item', { affiliation: 'outcast' })
      .send();

    const userJidAttributes = Finder.create(bannedUsersStanza)
      .searchByTag('item')
      .results.map((item) => item.getAttribute('jid'));

    const userJidAttribute = userJidAttributes.find((jid) => jid?.includes(occupantJid.local as string));

    let userJid: JID;
    if (userJidAttribute) {
      userJid = parseJid(userJidAttribute);
    } else {
      // Fallback: Assume the passed JID is the target JID if lookup fails
      this.logService.warn(`unbanUser: Could not find user in ban list by nick ${occupantJid.local}. Using provided JID ${occupantJid.toString()}. Available chunks: ${userJidAttributes.join(', ')}`);
      userJid = occupantJid;
    }

    // Optional: Check if really banned, but we should just try to unban anyway to be safe/idempotent
    // const banList = (await this.getBanList(roomJid)).map((bannedUser): JID => bannedUser.userJid);
    // if (!banList.find((bannedJid): boolean => bannedJid.equals(userJid))) {
    //   this.logService.warn(`unbanUser: ${userJid.toString()} isn't on the ban list.`);
    // }

    const response = await this.xmppService.chatConnectionService
      .$iq({ to: roomJid.toString(), type: 'set' })
      .c('query', { xmlns: nsMucAdmin })
      .c('item', { jid: userJid.toString(), affiliation: Affiliation.none })
      .send();

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
      .sendResponseLess();
  }

  async leaveRoom(roomJid: JID, status?: string): Promise<void> {
    const cachedRoom = this.getRoomFromCache(roomJid);
    if (!cachedRoom) {
      await firstValueFrom(this.roomsFetchedSubject.pipe(filter((val) => val)));
    }
    const room = cachedRoom ?? (await firstValueFrom(this.getRoomByJid(roomJid)));
    const from = await firstValueFrom(this.xmppService.chatConnectionService.userJid$);

    if (!room) {
      throw new Error('room not in room list');
    }

    const occupant = room?.getOccupant(parseJid(from).bare());
    if (!occupant) {
      this.logService.warn('leaveRoom: user not found in local occupant list, proceeding with unavailable presence anyway to ensure server sync.');
    }

    this.logService.debug(`leaveRoom: sending unavailable presence...`);
    const response = await this.xmppService.chatConnectionService
      .$pres({ to: roomJid.toString(), from, type: Presence[Presence.unavailable] })
      .cCreateMethod(
        (builder): StanzaBuilder => (status ? builder.c('status', {}, status) : builder)
      )
      .send();
    this.logService.debug(`leaveRoom: unavailable presence sent. Checking response...`);

    if (Finder.create(response).searchByTag('item').result?.getAttribute('role') !== 'none') {
      throw new Error('error leaving room: ' + response?.outerHTML?.toString());
    }

    if (occupant && occupant.affiliation === Affiliation.owner) {
      this.logService.debug(`leaveRoom: user is owner, setting affiliation to none...`);
      try {
        await Promise.race([
          this.setAffiliation(occupant.jid, roomJid, Affiliation.none),
          new Promise((_, reject) => setTimeout(() => reject(new Error('setAffiliation timeout')), 5000))
        ]);
        this.logService.debug(`leaveRoom: affiliation set to none.`);
      } catch (e) {
        this.logService.error('leaveRoom: Failed to set affiliation to none, but proceeding to leave locally.', e);
      }
    }
    this.leftRoomSubject.next(roomJid);
    this.logService.debug(`occupant left room: occupantJid=${roomJid.toString()}`);
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
    return stanza.querySelector('invite') != null || stanza.querySelector('decline') != null;
  }

  async grantMembership(userJid: JID | string, roomJid: JID | string, reason?: string): Promise<void> {
    const userJidObj = userJid instanceof JID ? userJid : parseJid(userJid);
    const roomJidObj = roomJid instanceof JID ? roomJid : parseJid(roomJid);
    await this.setAffiliation(userJidObj, roomJidObj, Affiliation.member, reason);
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

  private async handleRoomPresenceStanza(stanza: Stanza, roomInCreation?: Room): Promise<boolean> {
    const stanzaType = stanza.getAttribute('type');

    if (stanzaType === 'error') {
      throw new Error(`error handling message, stanza: ${stanza.outerHTML}`);
    }

    const roomJid = parseJid(stanza.getAttribute('from') as string);
    // const userJid = parseJid(
    //   stanza.getAttribute('to') ?? (await firstValueFrom(this.xmppService.userJid$))
    // );

    const xEl = Array.from(stanza.querySelectorAll('x')).find(
      (el): boolean => el.getAttribute('xmlns') === nsMucUser
    );

    const itemEl = xEl?.querySelector('item');

    if (!itemEl) {
      return false;
    }

    const subjectOccupant: RoomOccupant = {
      jid: roomJid,
      affiliation: itemEl.getAttribute('affiliation') as Affiliation,
      role: itemEl.getAttribute('role') as Role,
      nick: roomJid.resource,
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

    let room = roomInCreation ?? this.getRoomFromCache(roomJid) ?? (await firstValueFrom(this.getRoomByJid(roomJid)));

    if (!room && stanzaType === 'unavailable') {
      return false;
    }

    if (!room) {
      room = await this.getOrCreateRoom(roomJid);
    }
    const userJid = parseJid(await firstValueFrom(this.xmppService.userJid$));

    const isCurrentUser =
      statusCodes.includes(OtherStatusCode.PresenceSelfRef) ||
      room.nick === subjectOccupant.nick ||
      subjectOccupant.nick === userJid.local ||
      subjectOccupant.nick === userJid.resource;



    const createdRoom = statusCodes.includes(EnteringRoomStatusCode.NewRoomCreated);

    if (isCurrentUser && createdRoom) {
      return true;
    }

    if (!stanzaType && room.hasOccupant(subjectOccupant.jid)) {
      const oldOccupant = room.getOccupant(subjectOccupant.jid);
      room.handleOccupantModified(subjectOccupant, oldOccupant as RoomOccupant, isCurrentUser);
      return false;
    }

    if (!stanzaType) {
      room.handleOccupantJoined(subjectOccupant, isCurrentUser);
      return false;
    }

    const isRoomShutdown = statusCodes.includes(ExitingRoomStatusCode.MUCShutdown);
    // const isErrorReply = statusCodes.includes(ExitingRoomStatusCode.ErrorReply); // Unused

    // Exiting statuses that only apply to the user in the stanza
    const isUserExitingStatus = isInCodes(statusCodes, [
      ExitingRoomStatusCode.Banned,
      ExitingRoomStatusCode.Kicked,
      ExitingRoomStatusCode.AffiliationChange,
      ExitingRoomStatusCode.MembersOnly,
      ExitingRoomStatusCode.ErrorReply,
    ]);

    if (statusCodes.length > 0 || stanzaType === 'unavailable') {
      this.logService.debug(`[MUC DEBUG] type=${stanzaType}, codes=${JSON.stringify(statusCodes)}, isCurrentUser=${isCurrentUser}, isUserExit=${isUserExitingStatus}, isShutdown=${isRoomShutdown}`);
    }

    const isNickChange = statusCodes.includes(OtherStatusCode.NewNickNameInRoom);
    if (
      isRoomShutdown ||
      (isCurrentUser && (isUserExitingStatus || (stanzaType === 'unavailable' && !isNickChange)))
    ) {
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
      this.logService.warn(`[MUC DEBUG] 303 CODE DETECTED for ${subjectOccupant.nick} -> ${xEl?.querySelector('item')?.getAttribute('nick')}`);
      room.handleOccupantChangedNick(
        subjectOccupant,
        isCurrentUser,
        xEl?.querySelector('item')?.getAttribute('nick') ?? ''
      );
      // Verify occupant update
      const newNick = xEl?.querySelector('item')?.getAttribute('nick') ?? '';
      const movedOccupant = room.findOccupantByNick(newNick);
      this.logService.warn(`[MUC DEBUG] Occupant moved? ${!!movedOccupant}, isCurrentUser=${isCurrentUser}`);
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

  private readonly roomLocks = new Map<string, Promise<any>>();
  private async getOrCreateRoom(roomJid: JID): Promise<Room> {
    roomJid = roomJid.bare();

    if (!this.roomLocks.get(roomJid.toString().toLowerCase())) {
      this.roomLocks.set(
        roomJid.toString().toLowerCase(),
        (async () => {
          let room = this.getRoomFromCache(roomJid);
          if (!room) {
            // Fallback to observable only if not in cache (though cache should be primary source via rooms$)
            // actually, avoiding the observable wait entirely for creation flow is safer to prevent deadlocks
            // room = await firstValueFrom(this.getRoomByJid(roomJid));
          }
          if (!room) {
            room = await this.customRoomFactory.create(this.logService, roomJid, roomJid.local);
            this.createdRoomSubject.next(room);
          }
          this.roomLocks.delete(roomJid.toString().toLowerCase());
          return room;
        })()
      );
    }
    return this.roomLocks.get(roomJid.toString().toLowerCase());
  }

  private async extractRoomSummariesFromResponse(iq: IqResponseStanza): Promise<Room[]> {
    const rooms = await Promise.all(
      Finder.create(iq)
        .searchByTag('query')
        .searchByNamespace(nsDiscoItems)
        .searchByTag('item')
        .results.map((item): Promise<Room> => {
          const jid = parseJid(item.getAttribute('jid') as string);
          return this.customRoomFactory.create(this.logService, jid, jid.local);
        })
    );
    for (const room of rooms) {
      this.createdRoomSubject.next(room);
    }
    return rooms;
  }

  async handleRoomMessageStanza(
    stanza: Stanza,
    delayElement = stanza.querySelector('delay'),
    from = this.extractFrom(stanza)
  ): Promise<boolean> {
    const result = stanza.querySelector('result');
    const forwarded = stanza.querySelector('forwarded');
    if (result && forwarded) {
      const message = forwarded.querySelector('message');
      if (message) {
        return this.handleRoomMessageStanza(message, forwarded.querySelector('delay') ?? undefined);
      }
    }

    const event = stanza.querySelector('event');
    if (event && event.getAttribute('xmlns') === 'http://jabber.org/protocol/pubsub#event') {
      const items = event.querySelector('items');
      if (items && items.getAttribute('node') === 'urn:xmpp:mucsub:nodes:messages') {
        const message = items.querySelector('item')?.querySelector('message');
        if (message) {
          return this.handleRoomMessageStanza(message, delayElement);
        }
      }
    }

    const messageText = stanza?.querySelector('body')?.textContent?.trim();


    if (!from) {
      throw new Error('Can not handle message for undefined from; muc:handleRoomMessageStanza');
    }

    if (this.isRoomInvitationStanza(stanza)) {
      return this.handleRoomInvitationMessageStanza(stanza);
    }
    const room = await firstValueFrom(this.getRoomByJid(from.bare()));

    if (!room) {
      return true;
    }
    // ... rest of function ...

    // NOTE: truncated context for brevity, ensuring valid replacement
    const roomOccupants = Finder.create(stanza)
      .searchByTag('x')
      .searchByTag('item')
      .results.map((item) => {
        return {
          jid: parseJid(item.getAttribute('jid') as string),
          affiliation: item.getAttribute('affiliation') as Affiliation,
          role: item.getAttribute('role') as Role,
        } as RoomOccupant;
      });

    if (roomOccupants.length > 0) {
      room.addOccupants(roomOccupants);
    }

    if (messageText) {
      const stamp = delayElement?.getAttribute('stamp');
      const datetime = stamp
        ? new Date(stamp)
        : new Date(await firstValueFrom(this.xmppService.pluginMap.entityTime.getNow()));

      const mineJid = parseJid(
        await firstValueFrom(this.xmppService.chatConnectionService.userJid$)
      );

      const isMyMucMessage =
        !!roomOccupants.find((occupant) => mineJid.bare().equals(occupant.jid.bare())) ||
        from.toString().includes(mineJid.local as string);


      const id = (stanza.getAttribute('id') ??
        stanza.querySelector('stanza-id')?.getAttribute('id')) as string;

      const message: Message = {
        body: messageText,
        datetime,
        id,
        from,
        direction: isMyMucMessage ? Direction.out : Direction.in,
        delayed: !!delayElement,
        fromArchive: stanza.querySelector('archived') == null,
      };
      room.messageStore.addMessage(message);
      this.updateRoomSubject.next(room);

      if (!message.delayed) {
        this.messageReceivedSubject.next(room);
      }

      return true;
    }

    if (stanza.querySelector('subject') != null) {
      // The archive only stores non-empty subjects. The current value of the subject is sent directly after entering a room by the room,
      // not the archive.
      // If a subject was first set, then unset, we would first receive the empty subject on room entry and then overwrite it with the
      // previous non-empty value from archive. This is why we want to always ignore subjects from archive.
      // This actually looks like a bug in MAM, it seems that MAM interprets messages with just subject in them as if they were chat
      // messages and not room metadata. This would explain why empty subjects are not stored.
      if (delayElement != null || stanza.querySelector('forwarded') != null) {
        return true;
      }

      room.subject = stanza?.querySelector('subject')?.textContent?.trim() ?? '';

      return true;
    }

    return false;
  }

  async handleRoomInvitationMessageStanza(stanza: Stanza): Promise<true> {
    const xElFinder = Finder.create(stanza).searchByTag('x').searchByNamespace(nsMucUser);
    const invitationEl =
      xElFinder.searchByTag('invite').result ?? xElFinder.searchByTag('decline').result;

    if (!invitationEl) {
      throw new Error(
        'Could not find invite or decline element in stanza; muc:handleRoomInvitationMessageStanza'
      );
    }
    const conferenceElement = Finder.create(stanza)
      .searchByTag('x')
      .searchByNamespace('jabber:x:conference').result;
    const roomJidString: string =
      invitationEl.getAttribute('to') ?? (conferenceElement?.getAttribute('jid') as string);

    const roomJid = parseJid(roomJidString);

    const invitation: Invitation = {
      type: invitationEl.tagName as Invitation['type'],
      roomJid,
      roomPassword: xElFinder?.searchByTag('password').result?.textContent as string,
      from: parseJid(stanza.getAttribute('from') as string),
      message: invitationEl.querySelector('reason')?.textContent ?? '',
    };

    // Ensure the room is created locally so it appears in the room list
    await this.getOrCreateRoom(invitation.roomJid);

    this.invitationSubject.next(invitation);

    return true;
  }

  private extractFrom(stanza: Stanza): JID {
    const messageFrom = stanza.querySelector('message')?.getAttribute('from');
    if (messageFrom != null) {
      return parseJid(messageFrom);
    }
    const stanzaFrom = stanza.getAttribute('from');
    if (stanzaFrom != null) {
      return parseJid(stanzaFrom);
    }
    throw new Error('Could not extract from from stanza');
  }

  private async setAffiliation(
    occupantJid: JID,
    roomJid: JID,
    affiliation: Affiliation,
    reason?: string
  ): Promise<IqResponseStanza> {
    return this.xmppService.chatConnectionService
      .$iq({ to: roomJid.toString(), type: 'set' })
      .c('query', { xmlns: nsMucAdmin })
      .c('item', { jid: occupantJid.bare().toString(), affiliation })
      .cCreateMethod((builder) => (reason ? builder.c('reason', {}, reason) : builder))
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

  private async getUserJidByOccupantJid(occupantJid: JID, roomJid: JID): Promise<JID | undefined> {
    const room = await firstValueFrom(this.getRoomByJid(roomJid.bare()));
    return room?.findOccupantByNick(occupantJid.local as string)?.jid;
  }

  hasMUCExtensionWithoutInvite(messageStanza: Element): boolean {
    return (
      messageStanza.querySelector('x')?.getAttribute('xmlns') === nsMucUser &&
      !this.isRoomInvitationStanza(messageStanza)
    );
  }
}
