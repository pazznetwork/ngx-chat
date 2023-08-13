// SPDX-License-Identifier: AGPL-3.0-or-later
import { TestUtils } from './helpers/test-utils';
import { firstValueFrom } from 'rxjs';
import type { XmppService } from '@pazznetwork/xmpp-adapter';
import { TestBed } from '@angular/core/testing';
import { XmppAdapterTestModule } from '../xmpp-adapter-test.module';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import { ensureNoRegisteredUser, ensureRegisteredUser } from './helpers/admin-actions';

describe('roster plugin', () => {
  let testUtils: TestUtils;
  let chatService: XmppService;

  beforeAll(() => {
    const testBed = TestBed.configureTestingModule({
      imports: [XmppAdapterTestModule],
    });
    testUtils = new TestUtils(testBed.inject<XmppService>(CHAT_SERVICE_TOKEN));
    chatService = testUtils.chatService;
  });

  it('should not have contacts from previous logged in user', async () => {
    await ensureRegisteredUser(testUtils.villain);
    await ensureRegisteredUser(testUtils.friend);
    await ensureRegisteredUser(testUtils.hero);

    const contactsSubscription = testUtils.chatService.contactListService.contacts$.subscribe();
    await testUtils.chatService.logIn(testUtils.hero);

    await chatService.pluginMap.roster.addContact(testUtils.friend.jid.toString());
    const contacts = await firstValueFrom(chatService.contactListService.contacts$);
    expect(contacts?.length).toBe(1);
    await testUtils.chatService.logOut();

    await testUtils.chatService.logIn(testUtils.villain);
    const contactsWithNewLogin = await firstValueFrom(chatService.contactListService.contacts$);
    expect(contactsWithNewLogin?.length).toBe(0);
    await testUtils.logOut();

    await ensureNoRegisteredUser(testUtils.villain);
    await ensureNoRegisteredUser(testUtils.friend);
    await ensureNoRegisteredUser(testUtils.hero);
    contactsSubscription.unsubscribe();
  });
});
