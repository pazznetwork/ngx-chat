// SPDX-License-Identifier: AGPL-3.0-or-later
import { TestUtils } from './helpers/test-utils';
import type { XmppService } from '@pazznetwork/xmpp-adapter';
import { TestBed } from '@angular/core/testing';
import { XmppAdapterTestModule } from '../xmpp-adapter-test.module';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import { firstValueFrom } from 'rxjs';
import { ensureNoRegisteredUser, ensureRegisteredUser } from './helpers/admin-actions';
import { filter } from 'rxjs/operators';

describe('block plugin', () => {
  let testUtils: TestUtils;

  beforeAll(() => {
    const testBed = TestBed.configureTestingModule({
      imports: [XmppAdapterTestModule],
    });
    testUtils = new TestUtils(testBed.inject<XmppService>(CHAT_SERVICE_TOKEN));
  });

  it('should be able to block a contact', async () => {
    const contactService = testUtils.chatService.contactListService;
    const contactsPromise = firstValueFrom(contactService.contacts$);
    const blockedPromise = firstValueFrom(
      contactService.blockedContactJIDs$.pipe(filter((b) => b.size === 1))
    );
    await ensureRegisteredUser(testUtils.hero);
    await testUtils.chatService.logIn(testUtils.hero);

    await contactService.blockJid(testUtils.villain.jid);
    const contacts = await contactsPromise;
    const blocked = await blockedPromise;

    expect(contacts.length).toEqual(0);
    expect(blocked.size).toEqual(1);

    await testUtils.chatService.logOut();
    await ensureNoRegisteredUser(testUtils.hero);
  });

  it('should be able to unblock a contact', async () => {
    const contactService = testUtils.chatService.contactListService;
    const contactsPromise = firstValueFrom(contactService.contacts$);
    const blockedPromise = firstValueFrom(
      contactService.blockedContactJIDs$.pipe(filter((b) => b.size === 1))
    );
    await ensureRegisteredUser(testUtils.hero);
    await testUtils.chatService.logIn(testUtils.hero);

    await contactService.blockJid(testUtils.villain.jid);
    const contacts = await contactsPromise;
    const blocked = await blockedPromise;

    expect(contacts.length).toEqual(0);
    expect(blocked.size).toEqual(1);

    const afterUnblockContactsPromise = firstValueFrom(
      contactService.contacts$.pipe(filter((c) => c.length === 0))
    );
    const afterUnblockBlockedPromise = firstValueFrom(
      contactService.blockedContactJIDs$.pipe(filter((b) => b.size === 0))
    );
    await contactService.unblockJid(testUtils.villain.jid);

    expect((await afterUnblockContactsPromise).length).toEqual(0);
    expect((await afterUnblockBlockedPromise).size).toEqual(0);

    await testUtils.chatService.logOut();
    await ensureNoRegisteredUser(testUtils.hero);
  });

  it('should be able to load roster with blocked, unblocked and normal contacts', async () => {
    await ensureRegisteredUser(testUtils.hero);
    const contactService = testUtils.chatService.contactListService;

    const blockedPromiseAfterBlockingTwo = firstValueFrom(
      contactService.blockedContactJIDs$.pipe(filter((b) => b.size === 2))
    );
    const blockedPromiseAfterUnblock = firstValueFrom(
      contactService.blockedContactJIDs$.pipe(filter((b) => b.size === 1))
    );

    const blockedPromiseAfterLogout = firstValueFrom(
      contactService.blockedContactJIDs$.pipe(filter((b) => b.size === 0))
    );

    const contactsPromiseAfterLogin = firstValueFrom(
      contactService.contacts$.pipe(filter((c) => c.length === 1))
    );
    const blockedPromiseAfterLogin = firstValueFrom(
      contactService.blockedContactJIDs$.pipe(filter((b) => b.size === 1))
    );

    await testUtils.chatService.logIn(testUtils.hero);

    await contactService.blockJid(testUtils.villain.jid);
    await contactService.blockJid(testUtils.princess.jid);

    expect((await blockedPromiseAfterBlockingTwo).size).toEqual(2);

    const contactsPromiseAfterAdd = firstValueFrom(
      contactService.contacts$.pipe(filter((c) => c.length === 1))
    );

    await contactService.addContact(testUtils.father.jid);

    const contactsAfterAdd = await contactsPromiseAfterAdd;

    expect(contactsAfterAdd.length).toEqual(1);

    await contactService.unblockJid(testUtils.princess.jid);
    expect((await blockedPromiseAfterUnblock).size).toEqual(1);

    await testUtils.chatService.logOut();
    expect((await blockedPromiseAfterLogout).size).toEqual(0);

    await testUtils.chatService.logIn(testUtils.hero);
    expect((await contactsPromiseAfterLogin).length).toEqual(1);
    expect((await blockedPromiseAfterLogin).size).toEqual(1);

    await testUtils.chatService.logOut();

    await ensureNoRegisteredUser(testUtils.hero);
  });
});
