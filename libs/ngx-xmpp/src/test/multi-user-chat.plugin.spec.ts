// SPDX-License-Identifier: AGPL-3.0-or-later
import { filter } from 'rxjs/operators';
import { firstValueFrom, map, mergeMap } from 'rxjs';
import { TestUtils } from './helpers/test-utils';
import type { OccupantNickChange } from '@pazznetwork/ngx-chat-shared';
import { parseJid, Room } from '@pazznetwork/ngx-chat-shared';
import { TestBed } from '@angular/core/testing';
import { XmppAdapterTestModule } from '../xmpp-adapter-test.module';
import type { XmppService } from '@pazznetwork/xmpp-adapter';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import { cleanServerBesidesAdmin, ensureRegisteredUser } from './helpers/admin-actions';
import { getRoomAffiliation, getRoomRole } from './helpers/ejabberd-client';

describe('multi user chat plugin', () => {
  let testUtils: TestUtils;
  beforeAll(() => {
    const testBed = TestBed.configureTestingModule({
      imports: [XmppAdapterTestModule],
    });
    testUtils = new TestUtils(testBed.inject<XmppService>(CHAT_SERVICE_TOKEN));
  });

  beforeEach(async () => cleanServerBesidesAdmin());

  describe('room creation', () => {
    it('should be owner of created room', async () => {
      await ensureRegisteredUser(testUtils.hero);
      await testUtils.logIn.hero();

      await testUtils.chatService.roomService.createRoom(testUtils.heroRoom);
      expect(
        await getRoomAffiliation(
          parseJid(testUtils.heroRoom.jid)?.local as string,
          testUtils.hero.jid
        )
      ).toEqual('owner');
      await testUtils.destroy.room.hero();
      await testUtils.logOut();
    });

    it('should not throw if user tries to create the same room multiple times just return the existing one', async () => {
      await ensureRegisteredUser(testUtils.hero);
      await testUtils.logIn.hero();

      await testUtils.create.room.hero();
      await testUtils.create.room.hero();

      expect(await firstValueFrom(testUtils.chatService.roomService.rooms$)).toHaveSize(1);

      await testUtils.destroy.room.hero();
      await testUtils.logOut();
    });

    it('should throw if another user already created the room', async () => {
      await ensureRegisteredUser(testUtils.hero);
      await ensureRegisteredUser(testUtils.princess);
      await testUtils.logIn.hero();
      await testUtils.create.room.hero();
      await testUtils.logOut();
      await testUtils.logIn.princess();

      try {
        await testUtils.create.room.hero();
        fail('should have thrown');
      } catch (e) {
        expect(e).toBeTruthy();
      }

      await testUtils.logOut();
      await testUtils.logIn.hero();
      await testUtils.destroy.room.hero();
      await testUtils.logOut();
    });

    it('should throw if room is not configurable', async () => {
      await ensureRegisteredUser(testUtils.hero);
      await ensureRegisteredUser(testUtils.princess);
      await testUtils.logIn.hero();

      try {
        await testUtils.chatService.roomService.createRoom(testUtils.heroRoom);
        await testUtils.chatService.roomService.getRoomConfiguration(testUtils.heroRoom.jid);
        await testUtils.logOut();

        await testUtils.logIn.princess();
        await testUtils.chatService.roomService.getRoomConfiguration(testUtils.heroRoom.jid);
        fail('should have thrown');
      } catch (e) {
        expect(e).toContain('Owner privileges required');
      }
      await testUtils.logOut();

      await testUtils.logIn.hero();
      await testUtils.destroy.room.hero();
      await testUtils.logOut();
    });

    it('should allow users to create and configure rooms', async () => {
      await ensureRegisteredUser(testUtils.hero);
      await testUtils.logIn.hero();
      const configTestRoom = {
        roomId: 'configtestroom',
        public: true,
        membersOnly: false,
        nonAnonymous: false,
        persistentRoom: true,
      };

      const room = await testUtils.chatService.roomService.createRoom(configTestRoom);
      expect(room.jid.toString()).toContain(configTestRoom.roomId.toLowerCase());
      const roomConfigForm = await testUtils.chatService.roomService.getRoomConfiguration(
        testUtils.roomIdToJid(configTestRoom.roomId)
      );
      const roomConfigOnServer = {
        public: roomConfigForm?.fields?.find(
          (field) => field.variable === 'muc#roomconfig_publicroom'
        )?.value as string,
        membersOnly: roomConfigForm?.fields?.find(
          (field) => field.variable === 'muc#roomconfig_membersonly'
        )?.value,
        nonAnonymous:
          roomConfigForm?.fields?.find((field) => field?.variable === 'muc#roomconfig_whois')
            ?.value === 'anyone',
        persistentRoom: roomConfigForm?.fields?.find(
          (field) => field?.variable === 'muc#roomconfig_persistentroom'
        )?.value,
      };

      expect(Boolean(roomConfigOnServer.public))
        .withContext('Room configuration public')
        .toEqual(configTestRoom.public);
      expect(roomConfigOnServer.membersOnly)
        .withContext('Room configuration membersOnly')
        .toEqual(configTestRoom.membersOnly);
      expect(roomConfigOnServer.nonAnonymous)
        .withContext('Room configuration nonAnonymous')
        .toEqual(configTestRoom.nonAnonymous);
      expect(roomConfigOnServer.persistentRoom)
        .withContext('Room configuration persistentRoom')
        .toEqual(configTestRoom.persistentRoom);

      await testUtils.chatService.roomService.destroyRoom(
        testUtils.roomIdToJid(configTestRoom.roomId)
      );
      await testUtils.logOut();
    });

    it('should be able to create multiple rooms', async () => {
      await ensureRegisteredUser(testUtils.father);
      await testUtils.logIn.father();

      await testUtils.chatService.roomService.createRoom(testUtils.heroRoom);
      await testUtils.chatService.roomService.createRoom(testUtils.fatherRoom);
      await testUtils.chatService.roomService.createRoom(testUtils.princessRoom);

      expect(await testUtils.currentRoomCount()).toEqual(3);

      await testUtils.chatService.roomService.destroyRoom(testUtils.heroRoom.jid);
      await testUtils.chatService.roomService.destroyRoom(testUtils.fatherRoom.jid);
      await testUtils.chatService.roomService.destroyRoom(testUtils.princessRoom.jid);

      await testUtils.logOut();
    });
  });

  describe('room joining', () => {
    const createRoomsAsFatherAndInviteUser = async (userJid: string): Promise<void> => {
      await testUtils.logIn.father();

      await testUtils.chatService.roomService.createRoom(testUtils.heroRoom);
      await testUtils.chatService.roomService.createRoom(testUtils.fatherRoom);
      await testUtils.chatService.roomService.createRoom(testUtils.princessRoom);
      await testUtils.chatService.roomService.inviteUserToRoom(userJid, testUtils.heroRoom.jid);
      await testUtils.chatService.roomService.inviteUserToRoom(userJid, testUtils.fatherRoom.jid);
      await testUtils.chatService.roomService.inviteUserToRoom(userJid, testUtils.princessRoom.jid);

      expect(await testUtils.waitForCurrentRoomCount(3)).toEqual(3);
      await testUtils.logOut();
    };

    const destroyRoomAsFather = async (): Promise<void> => {
      await testUtils.logIn.father();

      await testUtils.chatService.roomService.destroyRoom(testUtils.heroRoom.jid);
      await testUtils.chatService.roomService.destroyRoom(testUtils.fatherRoom.jid);
      await testUtils.chatService.roomService.destroyRoom(testUtils.princessRoom.jid);

      expect(await testUtils.waitForCurrentRoomCount(0)).toEqual(0);
      await testUtils.logOut();
    };

    const joinFatherRoomsAsHero = async (): Promise<void> => {
      await testUtils.logIn.hero();

      await testUtils.chatService.roomService.joinRoom(testUtils.heroRoom.jid);
      await testUtils.chatService.roomService.joinRoom(testUtils.fatherRoom.jid);
      await testUtils.chatService.roomService.joinRoom(testUtils.princessRoom.jid);
      expect(await testUtils.waitForCurrentRoomCount(3)).toEqual(3);
    };

    it('should be able to join a room with a invite', async () => {
      await ensureRegisteredUser(testUtils.father);
      await ensureRegisteredUser(testUtils.hero);

      await testUtils.logIn.father();
      expect(await testUtils.waitForCurrentRoomCount(0)).toEqual(0);
      await testUtils.chatService.roomService.createRoom(testUtils.fatherRoom);
      expect(
        await getRoomAffiliation(
          parseJid(testUtils.fatherRoom.jid)?.local as string,
          testUtils.father.jid
        )
      ).toEqual('owner');
      expect(await testUtils.waitForCurrentRoomCount(1)).toEqual(1);

      await testUtils.chatService.roomService.inviteUserToRoom(
        testUtils.hero.jid,
        testUtils.fatherRoom.jid
      );
      await testUtils.logOut();

      await testUtils.logIn.hero();
      await testUtils.chatService.roomService.joinRoom(testUtils.fatherRoom.jid);
      expect(await testUtils.waitForCurrentRoomCount(1))
        .withContext('should have a room after join')
        .toEqual(1);
      expect(
        await getRoomAffiliation(
          parseJid(testUtils.fatherRoom.jid)?.local as string,
          testUtils.father.jid
        )
      ).toEqual('owner');
      await testUtils.logOut();

      await testUtils.logIn.father();
      await testUtils.chatService.roomService.destroyRoom(testUtils.fatherRoom.jid);
      expect(await testUtils.waitForCurrentRoomCount(0))
        .withContext('should have no room after room destroying')
        .toEqual(0);
      await testUtils.logOut();
    });

    it('should be able to join multiple rooms', async () => {
      await ensureRegisteredUser(testUtils.father);
      await ensureRegisteredUser(testUtils.hero);

      await testUtils.logIn.father();

      await testUtils.chatService.roomService.createRoom(testUtils.heroRoom);
      expect(
        await getRoomAffiliation(
          parseJid(testUtils.heroRoom.jid)?.local as string,
          testUtils.father.jid
        )
      ).toEqual('owner');
      await testUtils.chatService.roomService.createRoom(testUtils.fatherRoom);
      expect(
        await getRoomAffiliation(
          parseJid(testUtils.fatherRoom.jid)?.local as string,
          testUtils.father.jid
        )
      ).toEqual('owner');
      await testUtils.chatService.roomService.createRoom(testUtils.princessRoom);
      expect(
        await getRoomAffiliation(
          parseJid(testUtils.princessRoom.jid)?.local as string,
          testUtils.father.jid
        )
      ).toEqual('owner');

      expect(await testUtils.waitForCurrentRoomCount(3)).toEqual(3);
      await testUtils.chatService.roomService.inviteUserToRoom(
        testUtils.hero.jid,
        testUtils.heroRoom.jid
      );
      await testUtils.chatService.roomService.inviteUserToRoom(
        testUtils.hero.jid,
        testUtils.fatherRoom.jid
      );
      await testUtils.chatService.roomService.inviteUserToRoom(
        testUtils.hero.jid,
        testUtils.princessRoom.jid
      );
      await testUtils.logOut();

      await testUtils.logIn.hero();
      // all rooms that you were invited to should be created a message that creates a room in your room collection
      expect(await testUtils.waitForCurrentRoomCount(3)).toEqual(3);
      await testUtils.chatService.roomService.joinRoom(testUtils.heroRoom.jid);
      await testUtils.chatService.roomService.joinRoom(testUtils.fatherRoom.jid);
      expect(
        await getRoomAffiliation(
          parseJid(testUtils.fatherRoom.jid)?.local as string,
          testUtils.father.jid
        )
      ).toEqual('owner');
      await testUtils.chatService.roomService.joinRoom(testUtils.princessRoom.jid);
      await testUtils.logOut();

      await testUtils.logIn.father();
      await testUtils.waitForCurrentRoomCount(3);
      await testUtils.chatService.roomService.destroyRoom(testUtils.heroRoom.jid);
      await testUtils.chatService.roomService.destroyRoom(testUtils.fatherRoom.jid);
      await testUtils.chatService.roomService.destroyRoom(testUtils.princessRoom.jid);
      expect(await testUtils.waitForCurrentRoomCount(0)).toEqual(0);
      await testUtils.logOut();
    });

    it('should be able to leave all rooms', async () => {
      await ensureRegisteredUser(testUtils.father);
      await ensureRegisteredUser(testUtils.hero);

      await testUtils.logIn.father();

      await testUtils.chatService.roomService.createRoom(testUtils.heroRoom);
      await testUtils.chatService.roomService.createRoom(testUtils.fatherRoom);
      await testUtils.chatService.roomService.createRoom(testUtils.princessRoom);
      expect(await testUtils.waitForCurrentRoomCount(3)).toEqual(3);
      await testUtils.chatService.roomService.inviteUserToRoom(
        testUtils.hero.jid,
        testUtils.heroRoom.jid
      );
      await testUtils.chatService.roomService.inviteUserToRoom(
        testUtils.hero.jid,
        testUtils.fatherRoom.jid
      );
      await testUtils.chatService.roomService.inviteUserToRoom(
        testUtils.hero.jid,
        testUtils.princessRoom.jid
      );
      await testUtils.logOut();

      await testUtils.logIn.hero();

      expect(await testUtils.waitForCurrentRoomCount(3)).toEqual(3);
      await testUtils.chatService.roomService.joinRoom(testUtils.heroRoom.jid);
      await testUtils.chatService.roomService.joinRoom(testUtils.fatherRoom.jid);
      await testUtils.chatService.roomService.joinRoom(testUtils.princessRoom.jid);

      await testUtils.chatService.roomService.leaveRoom(testUtils.heroRoom.jid);
      expect(await testUtils.waitForCurrentRoomCount(2)).toEqual(2);
      await testUtils.chatService.roomService.leaveRoom(testUtils.fatherRoom.jid);
      expect(await testUtils.waitForCurrentRoomCount(1)).toEqual(1);
      await testUtils.chatService.roomService.leaveRoom(testUtils.princessRoom.jid);
      expect(await testUtils.waitForCurrentRoomCount(0)).toEqual(0);
      await testUtils.logOut();

      await testUtils.logIn.father();
      expect(await testUtils.waitForCurrentRoomCount(3)).toEqual(3);

      await testUtils.chatService.roomService.destroyRoom(testUtils.heroRoom.jid);
      await testUtils.chatService.roomService.destroyRoom(testUtils.fatherRoom.jid);
      await testUtils.chatService.roomService.destroyRoom(testUtils.princessRoom.jid);

      expect(await testUtils.waitForCurrentRoomCount(0)).toEqual(0);
      await testUtils.logOut();
    });

    it('should be able to query only for rooms joined', async () => {
      await ensureRegisteredUser(testUtils.father);
      await ensureRegisteredUser(testUtils.hero);
      // 'Needs the bookmark plugin implementation';
      await createRoomsAsFatherAndInviteUser(testUtils.hero.jid);

      await joinFatherRoomsAsHero();
      await testUtils.logOut();

      await testUtils.logIn.hero();
      await testUtils.create.room.villain();
      expect(await testUtils.waitForCurrentRoomCount(4)).toEqual(4);

      const queriedRooms = await testUtils.chatService.roomService.queryAllRooms();
      const gotRooms = await testUtils.chatService.roomService.getRooms();

      expect(queriedRooms.length).toEqual(4);
      expect(gotRooms.length).toEqual(4);

      await testUtils.destroy.room.villain();
      await testUtils.logOut();
      await destroyRoomAsFather();
    });

    it('should be able to keep the rooms when logging out and and in', async () => {
      await ensureRegisteredUser(testUtils.father);
      await ensureRegisteredUser(testUtils.hero);

      //'Needs the bookmark plugin implementation');
      await createRoomsAsFatherAndInviteUser(testUtils.hero.jid);

      await joinFatherRoomsAsHero();
      await testUtils.logOut();

      expect(await testUtils.waitForCurrentRoomCount(0)).toEqual(0);

      await testUtils.logIn.hero();
      expect(await testUtils.waitForCurrentRoomCount(3)).toEqual(3);
      await testUtils.logOut();
      await destroyRoomAsFather();
    });
  });

  describe('room messaging', () => {
    it('should be able to receive messages', async () => {
      await ensureRegisteredUser(testUtils.hero);
      await ensureRegisteredUser(testUtils.princess);

      const firstMessage = 'first muc.spec.msg';
      const secondMessage = 'second muc.spec.msg';

      await testUtils.logIn.princess();
      const room = await testUtils.create.room.princess();
      await testUtils.chatService.roomService.inviteUserToRoom(
        testUtils.hero.jid,
        room.jid.toString()
      );
      await testUtils.logOut();

      await testUtils.logIn.hero();
      const joinedRoom = await testUtils.chatService.roomService.joinRoom(room.jid.toString());
      await testUtils.chatService.messageService.sendMessage(joinedRoom, firstMessage);
      await testUtils.chatService.messageService.sendMessage(joinedRoom, secondMessage);
      await testUtils.logOut();

      const messagePromise = firstValueFrom(
        testUtils.chatService.roomService.rooms$.pipe(
          filter((rooms) => rooms.length > 0),
          mergeMap(
            (rooms) =>
              (rooms[0] as Room)?.messageStore.messages$.pipe(filter((array) => array.length >= 2))
          )
        )
      );

      await testUtils.logIn.hero();
      const [first, second] = await messagePromise;
      expect(first?.body).toEqual(firstMessage);
      expect(second?.body).toEqual(secondMessage);
      await testUtils.logOut();
    });

    it('should be able to send messages', async () => {
      await ensureRegisteredUser(testUtils.hero);
      await testUtils.logIn.hero();
      // when
      const room = await testUtils.chatService.roomService.createRoom(
        testUtils.createRoomConfig('chatroom')
      );
      await testUtils.chatService.roomService.joinRoom(room.jid.toString());
      await testUtils.chatService.messageService.sendMessage(room, 'message body');

      const messages = await firstValueFrom(
        room.messageStore.messages$.pipe(filter((array) => array.length > 0))
      );

      // then
      expect(messages.length).toEqual(1);
      const message = messages[0];
      expect(message?.body).toEqual('message body');
      expect(message?.direction).toEqual(testUtils.direction.out);
      expect(message?.id).not.toBeUndefined();
      expect(message?.from?.bare().toString()).toEqual(room.jid.bare().toString());
      expect(message?.from?.resource).toEqual(parseJid(testUtils.hero.jid).local);
      await testUtils.logOut();
    });
  });

  describe('room operations handling', () => {
    xit('should handle kicked occupant and leave room', async () => {
      await ensureRegisteredUser(testUtils.princess);
      await ensureRegisteredUser(testUtils.hero);

      await testUtils.logIn.princess();
      await testUtils.create.room.princess();
      await testUtils.chatService.roomService.inviteUserToRoom(
        testUtils.hero.jid,
        testUtils.princessRoom.jid
      );
      await testUtils.logOut();

      await testUtils.logIn.hero();
      await testUtils.chatService.roomService.joinRoom(testUtils.princessRoom.jid);
      const rooms = await firstValueFrom(testUtils.chatService.roomService.rooms$);
      expect(rooms.length).toEqual(1);
      await testUtils.logOut();

      await testUtils.logIn.princess();
      await testUtils.chatService.roomService.kickFromRoom('hero', testUtils.princessRoom.jid);
      await testUtils.logOut();

      await testUtils.logIn.hero();
      const roomsAfterKick = await firstValueFrom(testUtils.chatService.roomService.rooms$);
      expect(roomsAfterKick.length).toEqual(0);
      await testUtils.logOut();
    });

    it('should handle banning and unbanning of a room occupant', async () => {
      await ensureRegisteredUser(testUtils.villain);
      await ensureRegisteredUser(testUtils.hero);

      await testUtils.logIn.hero();
      await testUtils.create.room.hero();
      await testUtils.chatService.roomService.joinRoom(testUtils.heroRoom.jid);
      await testUtils.chatService.roomService.grantModeratorStatusForRoom(
        'hero',
        testUtils.heroRoom.jid
      );
      expect(
        await getRoomRole(parseJid(testUtils.heroRoom.jid)?.local as string, testUtils.hero.jid)
      ).toEqual('moderator');
      await testUtils.chatService.roomService.inviteUserToRoom(
        testUtils.villain.jid,
        testUtils.heroRoom.jid
      );
      await testUtils.logOut();

      await testUtils.logIn.villain();
      await testUtils.chatService.roomService.joinRoom(testUtils.heroRoom.jid);
      expect(await testUtils.waitForCurrentRoomCount(1)).toEqual(1);
      expect(
        await getRoomRole(parseJid(testUtils.heroRoom.jid)?.local as string, testUtils.villain.jid)
      ).toEqual('participant');
      await testUtils.logOut();

      await testUtils.logIn.hero();
      await testUtils.chatService.roomService.joinRoom(testUtils.heroRoom.jid);
      expect(
        await getRoomAffiliation(
          parseJid(testUtils.heroRoom.jid)?.local as string,
          testUtils.hero.jid
        )
      ).toEqual('owner');
      expect(
        await getRoomRole(parseJid(testUtils.heroRoom.jid)?.local as string, testUtils.hero.jid)
      ).toEqual('moderator');
      const villainOccupant = 'villain@' + (testUtils.heroRoom.jid.split('@')[1] as string);
      await testUtils.chatService.roomService.banUserForRoom(
        villainOccupant,
        testUtils.heroRoom.jid
      );
      await testUtils.logOut();

      await testUtils.logIn.villain();
      expect(await testUtils.waitForCurrentRoomCount(0)).toEqual(0);
      try {
        await testUtils.chatService.roomService.joinRoom(testUtils.heroRoom.jid);
      } catch (e) {
        expect(e).toBeTruthy();
      }
      expect(await testUtils.waitForCurrentRoomCount(0)).toEqual(0);
      await testUtils.logOut();

      await testUtils.logIn.hero();
      await testUtils.logWebsocketStream();
      await testUtils.chatService.roomService.joinRoom(testUtils.heroRoom.jid);
      await testUtils.chatService.roomService.unbanUserForRoom(
        villainOccupant,
        testUtils.heroRoom.jid
      );
      await testUtils.chatService.roomService.inviteUserToRoom(
        testUtils.villain.jid,
        testUtils.heroRoom.jid
      );
      await testUtils.logOut();

      await testUtils.logIn.villain();
      await testUtils.chatService.roomService.joinRoom(testUtils.heroRoom.jid);
      expect(await testUtils.waitForCurrentRoomCount(1)).toEqual(1);
      await testUtils.logOut();
    });

    xit('should be able to change nick', async () => {
      const myOccupantJid = 'chatroom@conference.example.com/something';
      const room = await testUtils.chatService.roomService.joinRoom(myOccupantJid);

      room.onOccupantChange$
        .pipe(
          filter(({ change }) => change === 'changedNick'),
          map((change) => change as OccupantNickChange)
        )
        .subscribe(({ occupant, newNick }) => {
          expect(newNick).toEqual('newNick');
          expect(occupant.jid.toString()).toEqual(myOccupantJid.toString());
        });

      await testUtils.chatService.roomService.changeUserNicknameForRoom(
        'newNick',
        room.jid.toString()
      );
    });

    xit('should be able to change room topic', async () => {
      const roomJid = 'chatroom@conference.example.com';
      const room = await testUtils.chatService.roomService.joinRoom(roomJid);

      const newSubject = 'new subject';

      if (!testUtils.chatService.roomService.rooms$) {
        throw new Error(`testUtils.chatService.rooms$ is undefined`);
      }
      await testUtils.chatService.roomService.changeRoomSubject(room.jid.toString(), newSubject);
      const rooms = await firstValueFrom(testUtils.chatService.roomService.rooms$);
      expect(rooms[0]?.subject).toEqual(newSubject);
    });
  });
});
