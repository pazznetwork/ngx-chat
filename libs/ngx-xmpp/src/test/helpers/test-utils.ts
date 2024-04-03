// SPDX-License-Identifier: AGPL-3.0-or-later
import { firstValueFrom, map, startWith } from 'rxjs';
import type { AuthRequest, RoomCreationOptions } from '@pazznetwork/ngx-chat-shared';
import { Affiliation, Direction, Role } from '@pazznetwork/ngx-chat-shared';
import type { XmppService } from '@pazznetwork/xmpp-adapter';
import type { StropheWebsocket } from '@pazznetwork/strophe-ts';
import { devXmppDomain } from '../../.secrets-const';
import { filter } from 'rxjs/operators';

export const testUser: AuthRequest = {
  username: 'test',
  password: 'test',
  domain: devXmppDomain,
  service: `wss://${devXmppDomain}:5280/websocket`,
};

interface TestUserConst extends AuthRequest {
  jid: string;
}

interface TestRoomConst extends RoomCreationOptions {
  jid: string;
}

const makeTestConstJid = (nameString: string): string => `${nameString}@${devXmppDomain}`;

const testRoomId = (prefix: string): string => prefix + 'Room';

export class TestUtils {
  constructor(readonly chatService: XmppService) {}

  readonly direction = Direction;
  readonly affiliation = Affiliation;
  readonly role = Role;
  readonly xmppDomain = devXmppDomain as string;
  readonly service = `wss://${this.xmppDomain}:5280/websocket`;

  readonly friendString = 'friend';
  readonly friend: TestUserConst = {
    domain: this.xmppDomain,
    service: this.service,
    username: this.friendString,
    password: this.friendString,
    jid: makeTestConstJid(this.friendString),
  };

  readonly fatherString = 'father';
  readonly father: TestUserConst = {
    domain: this.xmppDomain,
    service: this.service,
    username: this.fatherString,
    password: this.fatherString,
    jid: makeTestConstJid(this.fatherString),
  };

  readonly princessString = 'princess';
  readonly princess: TestUserConst = {
    domain: this.xmppDomain,
    service: this.service,
    username: this.princessString,
    password: this.princessString,
    jid: makeTestConstJid(this.princessString),
  };

  readonly villainString = 'villain';
  readonly villain: TestUserConst = {
    domain: this.xmppDomain,
    service: this.service,
    username: this.villainString,
    password: this.villainString,
    jid: makeTestConstJid(this.villainString),
  };

  readonly heroString = 'hero';
  readonly hero: TestUserConst = {
    domain: this.xmppDomain,
    service: this.service,
    username: this.heroString,
    password: this.heroString,
    jid: makeTestConstJid(this.heroString),
  };

  readonly heroRoom = this.createRoomConfig(testRoomId(this.heroString));
  readonly villainRoom = this.createRoomConfig(testRoomId(this.villainString));
  readonly princessRoom = this.createRoomConfig(testRoomId(this.princessString));
  readonly fatherRoom = this.createRoomConfig(testRoomId(this.fatherString));
  readonly friendRoom = this.createRoomConfig(testRoomId(this.friendString));

  readonly logIn = {
    hero: () => this.chatService.logIn(this.hero),
    villain: () => this.chatService.logIn(this.villain),
    princess: () => this.chatService.logIn(this.princess),
    father: () => this.chatService.logIn(this.father),
    friend: () => this.chatService.logIn(this.friend),
  };

  readonly create = {
    room: {
      hero: () => this.chatService.roomService.createRoom(this.heroRoom),
      villain: () => this.chatService.roomService.createRoom(this.villainRoom),
      princess: () => this.chatService.roomService.createRoom(this.princessRoom),
      father: () => this.chatService.roomService.createRoom(this.fatherRoom),
      friend: () => this.chatService.roomService.createRoom(this.friendRoom),
    },
  };

  readonly destroy = {
    room: {
      hero: () => this.chatService.roomService.destroyRoom(this.heroRoom.jid),
      villain: () => this.chatService.roomService.destroyRoom(this.villainRoom.jid),
      princess: () => this.chatService.roomService.destroyRoom(this.princessRoom.jid),
      father: () => this.chatService.roomService.destroyRoom(this.fatherRoom.jid),
      friend: () => this.chatService.roomService.destroyRoom(this.friendRoom.jid),
    },
  };

  readonly logOut = (): Promise<void> => this.chatService.logOut();

  readonly currentRoomCount = (): Promise<number> => {
    if (!this.chatService.roomService.rooms$) {
      throw new Error(`this.chat.rooms$ is undefined`);
    }
    return firstValueFrom(this.chatService.roomService.rooms$.pipe(map((arr) => arr.length)));
  };

  waitForCurrentRoomCount(count: number): Promise<number> {
    if (!this.chatService.roomService.rooms$) {
      throw new Error(`this.chat.rooms$ is undefined`);
    }
    return firstValueFrom(
      this.chatService.roomService.rooms$.pipe(
        startWith([]),
        map((arr) => arr.length),
        filter((c) => c === count)
      )
    );
  }

  toJid(auth: AuthRequest): string {
    return `${auth.username}@${auth.domain}`;
  }

  roomIdToJid(id: string): string {
    return id + '@' + 'conference.' + this.xmppDomain;
  }

  createRoomConfig(roomId: string): TestRoomConst {
    return {
      roomId,
      public: false,
      membersOnly: true,
      nonAnonymous: true,
      persistentRoom: true,
      jid: this.roomIdToJid(roomId),
    };
  }

  async fakeWebsocketInStanza(stanza: string): Promise<void> {
    const connection = await firstValueFrom(this.chatService.chatConnectionService.connection$);
    const webSocket = connection.protocolManager as StropheWebsocket;
    await webSocket?.onMessage(stanza);
  }

  async logWebsocketStream(): Promise<void> {
    const connection = await firstValueFrom(this.chatService.chatConnectionService.connection$);
    // eslint-disable-next-line no-console
    console.log(connection.debugLog);
  }
}
