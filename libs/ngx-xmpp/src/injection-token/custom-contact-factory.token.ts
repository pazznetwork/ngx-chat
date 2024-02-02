// SPDX-License-Identifier: AGPL-3.0-or-later
import { InjectionToken } from '@angular/core';
import { CustomContactFactory } from '@pazznetwork/ngx-chat-shared';

/**
 * Optional injectable token to handle custom contact creation.
 * Common use case is to handle the avatars of the contacts by yourself as we currently don't provide the xmpp vcard avatar
 */
export const CUSTOM_CONTACT_FACTORY_TOKEN = new InjectionToken<CustomContactFactory>(
  'ngxChatCustomContactFactory'
);
