// SPDX-License-Identifier: AGPL-3.0-or-later
import { InjectionToken } from '@angular/core';
import type { OpenChatsService } from '@pazznetwork/ngx-chat-shared';

/**
 * Optional injectable token to handle open chats with users.
 */
export const OPEN_CHAT_SERVICE_TOKEN = new InjectionToken<OpenChatsService>(
  'ngxChatOpenChatsService'
);
