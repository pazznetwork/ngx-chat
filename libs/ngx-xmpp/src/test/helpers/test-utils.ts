// SPDX-License-Identifier: AGPL-3.0-or-later
import { catchError, firstValueFrom, map, of, startWith, timeout } from 'rxjs';
import type { AuthRequest, RoomCreationOptions } from '@pazznetwork/ngx-chat-shared';
import { Affiliation, Direction, parseJid, Role, Room } from '@pazznetwork/ngx-chat-shared';
import { XmppService } from '@pazznetwork/xmpp-adapter';
import type { StropheWebsocket } from '@pazznetwork/strophe-ts';
import { filter } from 'rxjs/operators';
import { destroyRoom } from './ejabberd-client';
// using legacy domain for XMPP server match, but localhost for connection
const devXmppDomain = 'local-jabber.entenhausen.pazz.de';


export const testUser: AuthRequest = {
  username: 'test',
  password: 'test',
  domain: devXmppDomain,
  service: `ws://localhost:5280/websocket`,
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
  constructor(readonly chatService: XmppService) { }

  static readonly createdRooms = new Set<string>();

  readonly direction = Direction;
  readonly affiliation = Affiliation;
  readonly role = Role;
  readonly xmppDomain = devXmppDomain as string;
  readonly service = `ws://localhost:5280/websocket`;
  readonly suffix = Math.random().toString(36).substring(7);

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

  readonly heroRoom = this.createRoomConfig(testRoomId(this.heroString) + '-' + this.suffix);
  readonly villainRoom = this.createRoomConfig(testRoomId(this.villainString) + '-' + this.suffix);
  readonly princessRoom = this.createRoomConfig(testRoomId(this.princessString) + '-' + this.suffix);
  readonly fatherRoom = this.createRoomConfig(testRoomId(this.fatherString) + '-' + this.suffix);
  readonly friendRoom = this.createRoomConfig(testRoomId(this.friendString) + '-' + this.suffix);

  async loginWithRetry(auth: AuthRequest, retries = 5): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await this.chatService.logIn(auth);
        return;
      } catch (e) {
        if (i === retries - 1) {
          throw e;
        }
        // Wait before retry (exponential backoff or constant)
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  readonly logIn = {
    hero: () => this.loginWithRetry(this.hero),
    villain: () => this.loginWithRetry(this.villain),
    princess: () => this.loginWithRetry(this.princess),
    father: () => this.loginWithRetry(this.father),
    friend: () => this.loginWithRetry(this.friend),
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

  readonly logOut = async (): Promise<void> => {
    if (await firstValueFrom(this.chatService.isOnline$)) {
      await this.chatService.logOut();
      // Wait for state to become offline
      await firstValueFrom(
        this.chatService.isOnline$.pipe(
          filter(online => !online),
          timeout(5000),
          catchError(() => of(false)) // Proceed anyway on timeout
        )
      );
    }
    // Wait for the socket to actually close and server to register it
    await new Promise((resolve) => setTimeout(resolve, 3000));
  };

  readonly currentRoomCount = (): Promise<number> => {
    if (!this.chatService.roomService.rooms$) {
      throw new Error(`this.chat.rooms$ is undefined`);
    }
    return firstValueFrom(this.chatService.roomService.rooms$.pipe(map((arr) => arr.length)));
  };

  waitForRoom(jid: string): Promise<Room> {
    if (!this.chatService.roomService.rooms$) {
      throw new Error(`this.chat.rooms$ is undefined`);
    }
    return firstValueFrom(
      this.chatService.roomService.rooms$.pipe(
        startWith([]),
        map((rooms) => rooms.find((r) => r.jid.equals(parseJid(jid)))),
        filter((room): room is Room => !!room),
        timeout(300000)
      )
    );
  }

  waitForCurrentRoomCount(count: number): Promise<number> {
    if (!this.chatService.roomService.rooms$) {
      throw new Error(`this.chat.rooms$ is undefined`);
    }
    return firstValueFrom(
      this.chatService.roomService.rooms$.pipe(
        startWith([]),
        map((arr) => arr.length),
        filter((c) => c === count),
        timeout(300000)
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
    const config = {
      roomId,
      public: false,
      membersOnly: false,
      nonAnonymous: true,
      persistentRoom: false,
      allowSubscription: true,
      jid: this.roomIdToJid(roomId),
    };
    TestUtils.createdRooms.add(config.roomId);
    return config;
  }

  async fakeWebsocketInStanza(stanza: string): Promise<void> {
    const connection = await firstValueFrom(this.chatService.chatConnectionService.connection$);
    if (!connection) throw new Error('fakeWebsocketInStanza: Connection not found!');

    const webSocket = connection.protocolManager as StropheWebsocket;
    if (!webSocket) throw new Error('fakeWebsocketInStanza: WebSocket (protocolManager) not found!');

    if (typeof webSocket.onMessage !== 'function') throw new Error('fakeWebsocketInStanza: webSocket.onMessage is not a function!');

    console.log('fakeWebsocketInStanza: injecting stanza...');
    // Strophe Websocket onMessage expects a MessageEvent-like object with a 'data' property
    await webSocket.onMessage(stanza);
  }

  async logWebsocketStream(): Promise<void> {
    const connection = await firstValueFrom(this.chatService.chatConnectionService.connection$);
    // eslint-disable-next-line no-console
    console.log(connection.debugLog);
  }

  static clean(): void {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    (XmppService as unknown).instance = undefined;
  }

  static async cleanAllCreatedRooms(): Promise<void> {
    // Enforce 30s timeout on cleanup to prevent zombie processes
    let timeoutHandle: any;
    const timeoutPromise = new Promise<void>((resolve) => {
      timeoutHandle = setTimeout(async () => {
        console.warn('[TestUtils] Cleanup timed out! Force-resolving to prevent hang.');
        TestUtils.createdRooms.clear(); // CRITICAL: Clear the list to prevent death spiral
        // Force disconnect to kill socket and allow process exit
        try {
          const service = (XmppService as any).instance; // Access singleton if available
          if (service) {
            console.warn('[TestUtils] Force-disconnecting service due to cleanup timeout');
            const connection = await firstValueFrom(service.chatConnectionService.connection$) as any;
            connection?.disconnectFinally('cleanup-timeout');
          }
        } catch (e) { console.warn('Failed to force disconnect', e); }

        // NUCLEAR OPTION: If running in a browser, try to close the window to signal Karma to stop
        try {
          if (typeof window !== 'undefined') {
            console.warn('[TestUtils] Attempting to close window to kill zombie process...');
            window.stop(); // Stop loading anything further
            window.close(); // Try to close the tab/window
          }
        } catch (e) { console.warn('Failed to close window', e); }

        resolve();
      }, 30000);
    });

    const cleanupPromise = this._cleanAllCreatedRoomsUnsafe().finally(() => clearTimeout(timeoutHandle));

    await Promise.race([
      cleanupPromise,
      timeoutPromise
    ]);
  }

  private static async _cleanAllCreatedRoomsUnsafe(): Promise<void> {
    const rooms = Array.from(TestUtils.createdRooms);
    if (rooms.length > 0) {
      console.log(`[TestUtils] Cleaning up ${rooms.length} tracked rooms...`);
      // Optimization: Fetch online rooms once to avoid 404 errors destroying non-existent rooms
      // This speeds up cleanup significantly if many rooms were defined but not created
      try {
        const { getMucRooms } = require('./ejabberd-client');
        console.log('[TestUtils] Fetching online rooms list...');
        const onlineRooms = await getMucRooms();
        console.log(`[TestUtils] Fetched ${onlineRooms?.length} online rooms.`);
        const onlineRoomNames = new Set(onlineRooms.map((r: string) => r.split('@')[0]));

        for (const room of rooms) {
          if (onlineRoomNames.has(room)) {
            try {
              await destroyRoom(room);
              await new Promise(resolve => setTimeout(resolve, 20));
            } catch (e) {
              console.warn(`[TestUtils] Failed to clean up room ${room}:`, e);
            }
          }
        }
      } catch (e) {
        // Fallback if getMucRooms fails
        console.warn('[TestUtils] Failed to fetch online rooms, falling back to brute force cleanup', e);
        for (const room of rooms) {
          try {
            await destroyRoom(room);
          } catch (e) {
            // Ignore
          }
        }
      }
    }
    TestUtils.createdRooms.clear();
  }

}
