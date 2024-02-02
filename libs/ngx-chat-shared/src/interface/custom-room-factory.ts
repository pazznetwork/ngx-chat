// SPDX-License-Identifier: AGPL-3.0-or-later
import { JID, Log, Room } from '@pazznetwork/ngx-chat-shared';

export interface CustomRoomFactory {
  create(logService: Log, roomJid: JID, name?: string): Promise<Room>;
}
