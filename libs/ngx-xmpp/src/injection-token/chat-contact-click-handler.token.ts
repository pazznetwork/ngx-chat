// SPDX-License-Identifier: AGPL-3.0-or-later
import { InjectionToken } from '@angular/core';
import type { ChatContactClickHandler } from '@pazznetwork/ngx-chat-shared';

/**
 * Optional injectable token to handle contact clicks in the chat
 */
export const CONTACT_CLICK_HANDLER_TOKEN = new InjectionToken<ChatContactClickHandler>(
  'ngxChatContactClickHandler'
);
