// SPDX-License-Identifier: AGPL-3.0-or-later
import { TestUtils } from './helpers/test-utils';
import { firstValueFrom } from 'rxjs';

import type { XmppService } from '@pazznetwork/xmpp-adapter';
import { TestBed } from '@angular/core/testing';
import { XmppAdapterTestModule } from '../xmpp-adapter-test.module';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import { ensureNoRegisteredUser, ensureRegisteredUser } from './helpers/admin-actions';

describe('contact list relogin roster plugin', () => {
  let testUtils: TestUtils;


  beforeAll(async () => {
    const testBed = TestBed.configureTestingModule({
      imports: [XmppAdapterTestModule],
    });
    testUtils = new TestUtils(testBed.inject<XmppService>(CHAT_SERVICE_TOKEN));


    // Ensure clean slate
    await ensureNoRegisteredUser(testUtils.hero);
    await ensureNoRegisteredUser(testUtils.villain);
    await ensureNoRegisteredUser(testUtils.friend);
  });

  it('should not have contacts from previous logged in user', async () => {
    await ensureRegisteredUser(testUtils.villain);
    await ensureRegisteredUser(testUtils.friend);
    await ensureRegisteredUser(testUtils.hero);

    const contactsSubscription = testUtils.chatService.contactListService.contacts$.subscribe();
    await testUtils.chatService.logIn(testUtils.hero);

    await testUtils.chatService.pluginMap.roster.addContact(testUtils.friend.jid.toString());
    const contacts = await firstValueFrom(testUtils.chatService.contactListService.contacts$);
    expect(contacts?.length).toBe(1);
    await testUtils.chatService.logOut();

    await testUtils.chatService.logIn(testUtils.villain);
    const contactsWithNewLogin = await firstValueFrom(testUtils.chatService.contactListService.contacts$);
    expect(contactsWithNewLogin?.length).toBe(0);
    await testUtils.chatService.logOut();

    await ensureNoRegisteredUser(testUtils.villain);
    await ensureNoRegisteredUser(testUtils.friend);
    await ensureNoRegisteredUser(testUtils.hero);
    contactsSubscription.unsubscribe();
  });
});
