// SPDX-License-Identifier: AGPL-3.0-or-later
import { InjectionToken } from '@angular/core';
import { CustomRoomFactory } from '@pazznetwork/ngx-chat-shared';

/**
 * Optional injectable token to handle custom room creation.
 * Common use case is to handle the avatars of the room by yourself as we currently don't provide the xmpp implementation
 */
export const CUSTOM_ROOM_FACTORY_TOKEN = new InjectionToken<CustomRoomFactory>(
  'ngxChatCustomRoomFactory'
);
