// SPDX-License-Identifier: AGPL-3.0-or-later
import { CustomRoomFactory, JID, Log, Room } from '@pazznetwork/ngx-chat-shared';

export class DefaultRoomFactory implements CustomRoomFactory {
  create(logService: Log, roomJid: JID, name?: string): Promise<Room> {
    return Promise.resolve(new Room(logService, roomJid, name));
  }
}
