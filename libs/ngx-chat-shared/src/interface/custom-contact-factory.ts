// SPDX-License-Identifier: AGPL-3.0-or-later
import { Contact, ContactSubscription } from '@pazznetwork/ngx-chat-shared';

export interface CustomContactFactory {
  create(
    jid: string,
    name: string,
    avatar: string | undefined,
    subscription: ContactSubscription | undefined
  ): Promise<Contact>;
}
