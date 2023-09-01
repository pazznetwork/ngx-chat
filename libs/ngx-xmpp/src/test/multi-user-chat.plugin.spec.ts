// SPDX-License-Identifier: AGPL-3.0-or-later
import { filter, mergeMap } from 'rxjs/operators';
import { firstValueFrom, map } from 'rxjs';
import { TestUtils } from './helpers/test-utils';
import type { Invitation, OccupantNickChange } from '@pazznetwork/ngx-chat-shared';
import { TestBed } from '@angular/core/testing';
import { XmppAdapterTestModule } from '../xmpp-adapter-test.module';
import type { XmppService } from '@pazznetwork/xmpp-adapter';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import {
  ensureNoRegisteredUser,
  ensureRegisteredUser,
  unregisterAllBesidesAdmin,
} from './helpers/admin-actions';

fdescribe('multi user chat plugin', () => {
  let testUtils: TestUtils;
  beforeAll(() => {
    const testBed = TestBed.configureTestingModule({
      imports: [XmppAdapterTestModule],
    });
    testUtils = new TestUtils(testBed.inject<XmppService>(CHAT_SERVICE_TOKEN));
  });

  beforeEach(async () => unregisterAllBesidesAdmin());

  describe('room creation', () => {
    fit('should throw if user tries to create the same room multiple times', async () => {
      console.log('room test');
      await ensureRegisteredUser(testUtils.hero);
      await testUtils.logIn.hero();
      console.log('after register hero');
      try {
        await testUtils.create.room.hero();
        console.log('after create room');
        await testUtils.create.room.hero();
        console.log('after second create room');
        fail('should have thrown');
      } catch (e) {
        expect((e as Error).message).toContain('can not join room more than once');
      }

      await testUtils.destroy.room.hero();
      await ensureNoRegisteredUser(testUtils.hero);
    });

    it('should throw if another user already created the room', async () => {
      await testUtils.logIn.hero();
      await testUtils.create.room.hero();
      await testUtils.logOut();
      await testUtils.logIn.princess();

      try {
        await testUtils.create.room.hero();
        fail('should have thrown');
      } catch (e) {
        expect((e as Error).message).toContain('error creating room, user is not owner');
      }

      await testUtils.logOut();
      await testUtils.logIn.hero();
      await testUtils.destroy.room.hero();
      await testUtils.logOut();
    });

    it('should throw if room is not configurable', async () => {
      await testUtils.logIn.hero();

      try {
        await testUtils.chatService.roomService.getRoomConfiguration(testUtils.heroRoom.jid);
        await testUtils.chatService.roomService.createRoom(testUtils.heroRoom);

        await testUtils.logOut();
        await testUtils.logIn.princess();
        await testUtils.chatService.roomService.getRoomConfiguration(testUtils.heroRoom.jid);
        fail('should have thrown');
      } catch (e) {
        expect((e as Error).message).toContain('Owner privileges required');
      }

      await testUtils.logOut();
      await testUtils.logIn.hero();
      await testUtils.destroy.room.hero();
    });

    it('should allow users to create and configure rooms', async () => {
      await testUtils.logIn.hero();
      const configTestRoom = {
        roomId: 'configTestRoom',
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
      expect(Boolean(roomConfigOnServer.public)).toEqual(configTestRoom.public);
      expect(roomConfigOnServer.membersOnly).toEqual(configTestRoom.membersOnly);
      expect(roomConfigOnServer.nonAnonymous).toEqual(configTestRoom.nonAnonymous);
      expect(roomConfigOnServer.persistentRoom).toEqual(configTestRoom.persistentRoom);

      await testUtils.chatService.roomService.destroyRoom(
        testUtils.roomIdToJid(configTestRoom.roomId)
      );
      await testUtils.logOut();
    });

    it('should be able to create multiple rooms', async () => {
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

    xit('should throw if user is not allowed to create rooms', async () => {
      // 'For this we need to disallow common users to create rooms on the server';
    });
  });

  describe('room joining', () => {
    const createRoomsAsFather = async (): Promise<void> => {
      await testUtils.logIn.father();

      await testUtils.chatService.roomService.createRoom(testUtils.heroRoom);
      await testUtils.chatService.roomService.createRoom(testUtils.fatherRoom);
      await testUtils.chatService.roomService.createRoom(testUtils.princessRoom);

      expect(await testUtils.currentRoomCount()).toEqual(3);
      await testUtils.logOut();
    };

    const destroyRoomAsFather = async (): Promise<void> => {
      await testUtils.logIn.father();

      await testUtils.chatService.roomService.destroyRoom(testUtils.heroRoom.jid);
      await testUtils.chatService.roomService.destroyRoom(testUtils.fatherRoom.jid);
      await testUtils.chatService.roomService.destroyRoom(testUtils.princessRoom.jid);

      expect(await testUtils.currentRoomCount()).toEqual(0);
      await testUtils.logOut();
    };

    const joinFatherRoomsAsHero = async (): Promise<void> => {
      await testUtils.logIn.hero();

      expect(await testUtils.currentRoomCount()).toEqual(0);
      await testUtils.chatService.roomService.joinRoom(testUtils.heroRoom.jid);
      expect(await testUtils.currentRoomCount()).toEqual(1);
      await testUtils.chatService.roomService.joinRoom(testUtils.fatherRoom.jid);
      expect(await testUtils.currentRoomCount()).toEqual(2);
      await testUtils.chatService.roomService.joinRoom(testUtils.princessRoom.jid);
      expect(await testUtils.currentRoomCount()).toEqual(3);
    };

    it('should be able to join multiple rooms', async () => {
      await createRoomsAsFather();

      await joinFatherRoomsAsHero();
      await testUtils.logOut();

      await destroyRoomAsFather();
    });

    it('should be able to leave all rooms', async () => {
      await testUtils.logIn.hero();
      expect(await testUtils.currentRoomCount()).toEqual(0);
      await testUtils.logOut();

      await createRoomsAsFather();

      await joinFatherRoomsAsHero();

      expect(await testUtils.currentRoomCount()).toEqual(3);
      await testUtils.chatService.roomService.leaveRoom(testUtils.heroRoom.jid);
      expect(await testUtils.currentRoomCount()).toEqual(2);
      await testUtils.chatService.roomService.leaveRoom(testUtils.fatherRoom.jid);
      expect(await testUtils.currentRoomCount()).toEqual(1);
      await testUtils.chatService.roomService.leaveRoom(testUtils.princessRoom.jid);
      expect(await testUtils.currentRoomCount()).toEqual(0);
      await testUtils.logOut();

      await destroyRoomAsFather();
    });

    xit('should be able to query only for rooms joined', async () => {
      // 'Needs the bookmark plugin implementation';
      await createRoomsAsFather();

      await joinFatherRoomsAsHero();
      await testUtils.logOut();

      await testUtils.logIn.villain();
      await testUtils.create.room.villain();

      const queriedRooms = await testUtils.chatService.roomService.queryAllRooms();
      const gotRooms = await testUtils.chatService.roomService.getRooms();

      expect(queriedRooms.length).toEqual(4);
      expect(gotRooms.length).toEqual(4);

      await testUtils.destroy.room.villain();
      await testUtils.logOut();
      await destroyRoomAsFather();
    });

    xit('should be able to keep the rooms when logging out and and in', async () => {
      //'Needs the bookmark plugin implementation');
      await createRoomsAsFather();

      await joinFatherRoomsAsHero();
      await testUtils.logOut();

      expect(await testUtils.currentRoomCount()).toEqual(0);

      await testUtils.logIn.hero();
      expect(await testUtils.currentRoomCount()).toEqual(3);
      await testUtils.logOut();
      await destroyRoomAsFather();
    });
  });

  describe('room messaging', () => {
    it('should be able to receive messages', async () => {
      const newRoom = testUtils.createRoomConfig('chatroom');
      const message = 'message content here';

      await testUtils.logIn.hero();
      if (!testUtils.chatService.roomService.rooms$) {
        throw new Error(`testUtils.chatService.rooms$ is undefined`);
      }
      const roomsBeforeJoin = await firstValueFrom(testUtils.chatService.roomService.rooms$);
      const expectedRoomCount = roomsBeforeJoin.length++;
      const room = await testUtils.chatService.roomService.createRoom(newRoom);
      const roomsAfterJoin = await firstValueFrom(testUtils.chatService.roomService.rooms$);

      expect(expectedRoomCount).toEqual(roomsAfterJoin.length);

      await testUtils.chatService.roomService.inviteUserToRoom(
        testUtils.princess.jid,
        room.jid.toString()
      );
      await testUtils.logOut();

      await testUtils.logIn.princess();
      // TODO: accept user room invite?
      await testUtils.chatService.roomService.joinRoom(room.jid.toString());
      const juliaRooms = await firstValueFrom(testUtils.chatService.roomService.rooms$);
      const joinedRoom = juliaRooms.find((juliaRoom) => juliaRoom.jid.equals(room.jid));
      if (joinedRoom == null) {
        throw new Error('joinedRoom undefined');
      }
      await testUtils.chatService.messageService.sendMessage(joinedRoom, message);
      await testUtils.logOut();

      await testUtils.logIn.hero();
      const receivedMessage = roomsAfterJoin[0]?.messageStore.mostRecentMessageReceived;
      expect(receivedMessage?.body).toEqual(message);
    });

    it('should be able to send messages', async () => {
      // when
      const myOccupantJid = 'chatroom@conference.example.com/me';
      const room = await testUtils.chatService.roomService.joinRoom(myOccupantJid);
      await testUtils.chatService.messageService.sendMessage(room, 'message body');

      // then
      expect(room.messageStore.messages.length).toEqual(1);
      expect(room.messageStore.messages[0]?.body).toEqual('message body');
      expect(room.messageStore.messages[0]?.direction).toEqual(testUtils.direction.out);
      expect(room.messageStore.messages[0]?.id).not.toBeUndefined();
      expect(room.messageStore.messages[0]?.from?.toString()).toEqual(myOccupantJid);
    });
  });

  describe('room operations handling', () => {
    it('should handle kicked occupant and leave room', async () => {
      const resource = 'other';
      const otherOccupantJid = 'chatroom@conference.example.com/' + resource;

      const room = await testUtils.chatService.roomService.joinRoom(otherOccupantJid);
      if (!testUtils.chatService.roomService.rooms$) {
        throw new Error(`testUtils.chatService.rooms$ is undefined`);
      }
      const rooms = await firstValueFrom(testUtils.chatService.roomService.rooms$);

      expect(rooms.length).toEqual(1);

      room.onOccupantChange$
        .pipe(
          filter(({ change }) => change === 'kicked'),
          mergeMap(async ({ occupant }): Promise<void> => {
            expect(occupant.nick).toEqual(resource);
            expect(occupant.role).toEqual(testUtils.role.none);
            expect(occupant.affiliation).toEqual(testUtils.affiliation.none);
            if (!testUtils.chatService.roomService.rooms$) {
              throw new Error(`testUtils.chatService.rooms$ is undefined`);
            }
            expect((await firstValueFrom(testUtils.chatService.roomService.rooms$)).length).toEqual(
              0
            );
          })
        )
        .subscribe();
      await testUtils.chatService.roomService.kickFromRoom(resource, room.jid.toString());
    });

    it('should handle banned occupant', async () => {
      const resource = 'other';
      const otherOccupantJid = 'chatroom@conference.example.com/' + resource;

      const room = await testUtils.chatService.roomService.joinRoom(otherOccupantJid);

      room.onOccupantChange$
        .pipe(filter(({ change }) => change === 'banned'))
        .subscribe(({ occupant }) => {
          expect(occupant.nick).toEqual(resource);
          expect(occupant.role).toEqual(testUtils.role.none);
          expect(occupant.affiliation).toEqual(testUtils.affiliation.outcast);
        });
      await testUtils.chatService.roomService.banUserForRoom(
        otherOccupantJid,
        'chatroom@conference.example.com'
      );
    });

    it('should handle unban occupant', async () => {
      const otherOccupantJid = 'chatroom@conference.example.com/other';
      const roomJid = 'chatroom@conference.example.com';

      await testUtils.chatService.roomService.banUserForRoom(otherOccupantJid, roomJid);
      let banList = await testUtils.chatService.roomService.queryRoomUserList(roomJid);
      expect(banList.length).toEqual(1);
      await testUtils.chatService.roomService.unbanUserForRoom(otherOccupantJid, roomJid);
      banList = await testUtils.chatService.roomService.queryRoomUserList(roomJid);
      expect(banList.length).toEqual(0);
    });

    it('should be able to invite user', async () => {
      const myOccupantJid = 'me@example.com/something';
      const otherOccupantJid = 'other@example.com/something';
      const roomJid = 'chatroom@conference.example.com';

      if (!testUtils.chatService.roomService.onInvitation$) {
        throw new Error(`testUtils.chatService.onInvitation$ is undefined`);
      }
      testUtils.chatService.roomService.onInvitation$.subscribe((invitation: Invitation) => {
        expect(invitation.type).toEqual('invite');
        expect(invitation.roomJid.toString()).toEqual(roomJid);
        expect(invitation.from.toString()).toEqual(myOccupantJid);
        expect(invitation.message).toEqual('reason');
      });
      await testUtils.chatService.roomService.inviteUserToRoom(otherOccupantJid, roomJid);
    });

    it('should be able to change nick', async () => {
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

    it('should be able to change room topic', async () => {
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
