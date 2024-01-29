// SPDX-License-Identifier: AGPL-3.0-or-later
import { Contact, ContactSubscription, CustomContactFactory } from '@pazznetwork/ngx-chat-shared';
import { dummyAvatar } from './dummy-avatar';

export class CustomContact implements CustomContactFactory {
  create(
    jid: string,
    name: string,
    avatar: string = dummyAvatar,
    subscription = ContactSubscription.none
  ): Promise<Contact> {
    return new Promise((resolve) =>
      setTimeout(() => resolve(new Contact(jid, name, avatar, subscription)), 10)
    );
    // return Promise.resolve(new Contact(jid, name, avatar, subscription));
  }
}
