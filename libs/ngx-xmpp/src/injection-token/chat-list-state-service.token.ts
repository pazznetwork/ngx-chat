// SPDX-License-Identifier: AGPL-3.0-or-later
import { InjectionToken } from '@angular/core';
import { OpenChatStateService } from '@pazznetwork/ngx-chat-shared';

/**
 * Optional injectable token to handle open chats with users.
 */
export const CHAT_LIST_STATE_SERVICE_TOKEN = new InjectionToken<OpenChatStateService>(
  'ngxChatListStateService'
);
