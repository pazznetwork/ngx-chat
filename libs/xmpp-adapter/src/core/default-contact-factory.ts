// SPDX-License-Identifier: AGPL-3.0-or-later
import { Contact, ContactSubscription, CustomContactFactory } from '@pazznetwork/ngx-chat-shared';

export class DefaultContactFactory implements CustomContactFactory {
  create(
    jid: string,
    name: string,
    avatar: string | undefined,
    subscription = ContactSubscription.none
  ): Promise<Contact> {
    return Promise.resolve(new Contact(jid, name, avatar, subscription));
  }
}
