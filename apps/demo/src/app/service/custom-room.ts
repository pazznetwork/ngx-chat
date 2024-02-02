// SPDX-License-Identifier: AGPL-3.0-or-later
import { CustomRoomFactory, JID, Log, Room } from '@pazznetwork/ngx-chat-shared';
import { dummyAvatar } from './dummy-avatar';

export class CustomRoom implements CustomRoomFactory {
  create(logService: Log, roomJid: JID, name?: string): Promise<Room> {
    const room = new Room(logService, roomJid, name);
    room.avatar = dummyAvatar;
    return Promise.resolve(room);
  }
}
