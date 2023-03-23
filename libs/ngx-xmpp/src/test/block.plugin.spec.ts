// SPDX-License-Identifier: AGPL-3.0-or-later
import { TestUtils } from './helpers/test-utils';
import type { XmppService } from '@pazznetwork/xmpp-adapter';
import { TestBed } from '@angular/core/testing';
import { XmppAdapterTestModule } from '../xmpp-adapter-test.module';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import { firstValueFrom } from 'rxjs';
import { ensureNoRegisteredUser, ensureRegisteredUser } from './helpers/admin-actions';

describe('block plugin', () => {
  let testUtils: TestUtils;

  beforeAll(() => {
    const testBed = TestBed.configureTestingModule({
      imports: [XmppAdapterTestModule],
    });
    testUtils = new TestUtils(testBed.inject<XmppService>(CHAT_SERVICE_TOKEN));
  });

  it('should be able to block a contact', async () => {
    const contactsSubscription = testUtils.chatService.contactListService.contacts$.subscribe();
    const blockedSubscription =
      testUtils.chatService.contactListService.blockedContactJIDs$.subscribe();
    await ensureRegisteredUser(testUtils.hero);

    await testUtils.chatService.logIn(testUtils.hero);
    await testUtils.chatService.contactListService.blockJid(testUtils.villain.jid);
    const contacts = await firstValueFrom(testUtils.chatService.contactListService.contacts$);
    const blocked = await firstValueFrom(
      testUtils.chatService.contactListService.blockedContactJIDs$
    );

    expect(contacts.length).toEqual(0);
    expect(blocked.size).toEqual(1);
    await testUtils.chatService.logOut();

    await ensureNoRegisteredUser(testUtils.hero);
    contactsSubscription.unsubscribe();
    blockedSubscription.unsubscribe();
  });

  it('should be able to unblock a contact', async () => {
    const contactsSubscription = testUtils.chatService.contactListService.contacts$.subscribe();
    const blockedSubscription =
      testUtils.chatService.contactListService.blockedContactJIDs$.subscribe();
    await ensureRegisteredUser(testUtils.hero);
    await testUtils.chatService.logIn(testUtils.hero);

    await testUtils.chatService.contactListService.blockJid(testUtils.villain.jid);
    const contacts = await firstValueFrom(testUtils.chatService.contactListService.contacts$);
    const blocked = await firstValueFrom(
      testUtils.chatService.contactListService.blockedContactJIDs$
    );

    expect(contacts.length).toEqual(0);
    expect(blocked.size).toEqual(1);
    const afterUnblock = firstValueFrom(
      testUtils.chatService.contactListService.blockedContactJIDs$
    );
    await testUtils.chatService.contactListService.unblockJid(testUtils.villain.jid);
    expect(
      (await firstValueFrom(testUtils.chatService.contactListService.contacts$)).length
    ).toEqual(0);
    expect((await afterUnblock).size).toEqual(0);

    await testUtils.chatService.logOut();
    await ensureNoRegisteredUser(testUtils.hero);
    contactsSubscription.unsubscribe();
    blockedSubscription.unsubscribe();
  });

  it('should be able to load roster with blocked, unblocked and normal contacts', async () => {
    const createContactsPromise = () =>
      firstValueFrom(testUtils.chatService.contactListService.contacts$);
    const createBlockedPromise = () =>
      firstValueFrom(testUtils.chatService.contactListService.blockedContactJIDs$);

    const contactsSubscription = testUtils.chatService.contactListService.contacts$.subscribe();
    const blockedSubscription =
      testUtils.chatService.contactListService.blockedContactJIDs$.subscribe();
    await ensureRegisteredUser(testUtils.hero);
    await testUtils.chatService.logIn(testUtils.hero);

    await testUtils.chatService.contactListService.blockJid(testUtils.villain.jid);
    await testUtils.chatService.contactListService.blockJid(testUtils.princess.jid);

    expect((await createContactsPromise()).length).toEqual(0);

    expect((await createBlockedPromise()).size).toEqual(2);
    await testUtils.chatService.contactListService.addContact(testUtils.father.jid);

    expect((await createContactsPromise()).length).toEqual(1);

    await testUtils.chatService.contactListService.unblockJid(testUtils.princess.jid);
    expect((await createContactsPromise()).length).toEqual(1);
    expect((await createBlockedPromise()).size).toEqual(1);

    await testUtils.chatService.logOut();
    expect((await createContactsPromise()).length).toEqual(0);
    expect((await createBlockedPromise()).size).toEqual(0);

    await testUtils.chatService.logIn(testUtils.hero);
    expect((await createContactsPromise()).length).toEqual(1);
    expect((await createBlockedPromise()).size).toEqual(1);

    await testUtils.chatService.logOut();
    await ensureNoRegisteredUser(testUtils.hero);
    contactsSubscription.unsubscribe();
    blockedSubscription.unsubscribe();
  });

  xit('should not allow users in roster which are blocked');
});
