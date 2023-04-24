// SPDX-License-Identifier: AGPL-3.0-or-later
import { InjectionToken } from '@angular/core';
import type { ChatService } from '@pazznetwork/ngx-chat-shared';

/**
 * The chat service token gives you access to the main chat api and is implemented by default with an XMPP adapter,
 * you can always reuse the api and ui with a new service implementing the ChatServiceInterface interface and providing the
 * said implementation with the token
 */
export const CHAT_SERVICE_TOKEN = new InjectionToken<ChatService>('ngxChatService');
