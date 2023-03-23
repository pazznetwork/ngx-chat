// SPDX-License-Identifier: AGPL-3.0-or-later
import { AuthRequest, Contact, ContactSubscription, Presence } from '@pazznetwork/ngx-chat-shared';
import { TestUtils } from './helpers/test-utils';
import { firstValueFrom, map, merge, scan, skip } from 'rxjs';
import type { XmppService } from '@pazznetwork/xmpp-adapter';
import { $pres } from '@pazznetwork/strophets';
import { devXmppDomain } from '../.secrets-const';
import { TestBed } from '@angular/core/testing';
import { XmppAdapterTestModule } from '../xmpp-adapter-test.module';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import { ensureNoRegisteredUser, ensureRegisteredUser } from './helpers/admin-actions';
import { filter, shareReplay } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';

const timLogin: AuthRequest = {
  domain: devXmppDomain,
  username: 'tim',
  password: 'tim',
};

const bobLogin: AuthRequest = {
  domain: devXmppDomain,
  username: 'bob',
  password: 'bob',
};

fdescribe('roster plugin', () => {
  let testUtils: TestUtils;
  let chatService: XmppService;

  beforeAll(() => {
    const testBed = TestBed.configureTestingModule({
      imports: [XmppAdapterTestModule],
    });
    testUtils = new TestUtils(testBed.inject<XmppService>(CHAT_SERVICE_TOKEN));
    chatService = testUtils.chatService;
  });

  it('should have a working contacts$ observable', () => {
    const testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

    const alice = new Contact('alice18@www.com', 'Alice', '', ContactSubscription.both);
    const bob = new Contact('bob99@root.com', 'Bob', '', ContactSubscription.none);
    const rob = new Contact('robert__11@kek.to', 'Robertus', '', ContactSubscription.from);
    const existingContacts = [alice, bob];

    testScheduler.run(({ expectObservable, cold }) => {
      const onOnline$ = cold('     --a-------------g-   ');
      const onOffline$ = cold('    ---------------f-');
      const removeContact$ = cold('------b------e---', { b: alice.jid, e: rob.jid });
      const newContact$ = cold('   --------c--d------', { c: rob, d: alice });
      const expectMarbles = '              --a---b-c--d-e-fg-';

      const contacts$ = merge(
        newContact$.pipe(
          map((contact) => (state: Map<string, Contact>) => {
            state.set(contact.jid.toString(), contact);
            return state;
          })
        ),
        removeContact$.pipe(
          map((jid) => (state: Map<string, Contact>) => {
            state.delete(jid.toString());
            return state;
          })
        ),
        onOffline$.pipe(
          map(() => (state: Map<string, Contact>) => {
            state.clear();
            return state;
          })
        ),
        onOnline$.pipe(
          map(() => existingContacts),
          map((contacts) => () => {
            const state = new Map<string, Contact>();
            contacts.forEach((c) => state.set(c.jid.toString(), c));
            return state;
          })
        )
      ).pipe(
        scan((state, innerFun) => innerFun(state), new Map<string, Contact>()),
        map((contactMap) => Array.from(contactMap.values())),
        shareReplay({ bufferSize: 1, refCount: false })
      );
      expectObservable(contacts$).toBe(expectMarbles, {
        a: existingContacts,
        b: [bob],
        c: [bob, rob],
        d: [bob, rob, alice],
        e: [bob, alice],
        f: [],
        g: existingContacts,
      });
    });
  });

  it('should handle adding a contact with a pending request to roster', async () => {
    const contactsPromise = firstValueFrom(
      testUtils.chatService.contactListService.contacts$.pipe(skip(1))
    );
    await ensureRegisteredUser(bobLogin);

    await testUtils.chatService.logIn(bobLogin);
    await testUtils.chatService.contactListService.addContact(testUtils.toJid(timLogin));
    const contacts = await contactsPromise;

    expect(contacts.length).toEqual(1);
    await testUtils.chatService.logOut();

    await ensureNoRegisteredUser(bobLogin);
  });

  fit('should be able to remove a contact request', async () => {
    await ensureNoRegisteredUser(bobLogin);
    await ensureNoRegisteredUser(timLogin);
    await ensureRegisteredUser(timLogin);
    await ensureRegisteredUser(bobLogin);
    const emitArray: Contact[][] = [];
    const contactsSubscription = testUtils.chatService.contactListService.contacts$.subscribe(
      (contacts) => emitArray.push(contacts)
    );

    await testUtils.chatService.logIn(bobLogin);
    await testUtils.chatService.contactListService.addContact(testUtils.toJid(timLogin));
    await testUtils.chatService.logOut();

    const contactsPromise = firstValueFrom(testUtils.chatService.contactListService.contacts$);

    await chatService.logIn(timLogin);

    expect(emitArray?.[0]?.length).toBe(0);
    expect(emitArray?.[1]?.length).toBe(1);
    expect(emitArray?.[2]?.length).toBe(0);
    expect(emitArray?.[3]?.length).toBe(0);

    const contacts = await contactsPromise;
    const contactJid = contacts?.[0]?.jid.toString();
    expect(contactJid).toEqual(testUtils.toJid(timLogin));

    await chatService.contactListService.removeContact(contactJid as string);
    await chatService.logOut();

    await ensureNoRegisteredUser(bobLogin);
    await ensureNoRegisteredUser(timLogin);
    contactsSubscription.unsubscribe();
  });

  it('should handle adding multiple contacts to roster', async () => {
    const contactsPromise = firstValueFrom(
      testUtils.chatService.contactListService.contacts$.pipe(filter((array) => array.length === 3))
    );
    await ensureRegisteredUser(bobLogin);

    await testUtils.chatService.logIn(bobLogin);
    await testUtils.chatService.contactListService.addContact(testUtils.toJid(timLogin));
    await testUtils.chatService.contactListService.addContact(testUtils.toJid(testUtils.hero));
    await testUtils.chatService.contactListService.addContact(testUtils.toJid(testUtils.villain));
    const contacts = await contactsPromise;

    expect(contacts.length).toEqual(3);
    await testUtils.chatService.logOut();

    await ensureNoRegisteredUser(bobLogin);
  });

  it('should treat adding multiple times the same jid as one contact', async () => {
    const contactsPromise = firstValueFrom(
      testUtils.chatService.contactListService.contacts$.pipe(filter((array) => array.length === 1))
    );
    await ensureRegisteredUser(bobLogin);

    await testUtils.chatService.logIn(bobLogin);
    await testUtils.chatService.contactListService.addContact(testUtils.toJid(timLogin));
    await testUtils.chatService.contactListService.addContact(testUtils.toJid(timLogin));
    await testUtils.chatService.contactListService.addContact(testUtils.toJid(timLogin));
    const contacts = await contactsPromise;

    expect(contacts.length).toEqual(1);
    await testUtils.chatService.logOut();

    await ensureNoRegisteredUser(bobLogin);
  });

  it('should load all contacts in the roster after logout and login', async () => {
    const contactsSubscription = testUtils.chatService.contactListService.contacts$.subscribe();

    await ensureRegisteredUser(bobLogin);

    await testUtils.chatService.logIn(bobLogin);
    await testUtils.chatService.contactListService.addContact(testUtils.toJid(timLogin));
    await testUtils.chatService.contactListService.addContact(testUtils.toJid(testUtils.hero));
    await testUtils.chatService.contactListService.addContact(testUtils.toJid(testUtils.villain));

    const contacts = await firstValueFrom(testUtils.chatService.contactListService.contacts$);
    expect(contacts.length).toEqual(3);
    await testUtils.chatService.logOut();

    await testUtils.chatService.logIn(bobLogin);
    const contactsAfterLogin = await firstValueFrom(
      testUtils.chatService.contactListService.contacts$
    );
    expect(contactsAfterLogin.length).toEqual(3);
    await testUtils.chatService.logOut();

    await ensureNoRegisteredUser(bobLogin);

    contactsSubscription.unsubscribe();
  });

  it('should handle presence available as villain', async () => {
    const contacts = testUtils.chatService.contactListService.contacts$.subscribe();
    await ensureRegisteredUser(testUtils.villain);
    await testUtils.chatService.logIn(testUtils.villain);
    await testUtils.chatService.contactListService.addContact(testUtils.hero.jid);

    const contact = await testUtils.chatService.contactListService.getContactById(
      testUtils.hero.jid
    );

    if (contact == null) {
      throw new Error('No contact for hero jid found');
    }

    expect(await firstValueFrom(contact.presence$)).toEqual(Presence.unavailable);

    const newPresence = firstValueFrom(
      contact.presence$.pipe(filter((pres) => pres !== Presence.unavailable))
    );

    const presenceStanza = `<presence from="${testUtils.hero.jid}"></presence>`;
    await testUtils.fakeWebsocketInStanza(presenceStanza);

    expect(await newPresence).toEqual(Presence.present);

    await testUtils.logOut();
    await ensureNoRegisteredUser(testUtils.villain);
    contacts.unsubscribe();
  });

  it('should handle presence unavailable stanzas as villain', async () => {
    await ensureRegisteredUser(testUtils.villain);
    const contacts = testUtils.chatService.contactListService.contacts$.subscribe();
    await testUtils.chatService.logIn(testUtils.villain);
    await testUtils.chatService.contactListService.addContact(testUtils.hero.jid);

    const presenceStanza = `<presence from="${testUtils.hero.jid}" to="${testUtils.villain.jid}" type="unavailable"></presence>`;
    await testUtils.fakeWebsocketInStanza(presenceStanza);

    const contact = await chatService.contactListService.getContactById(testUtils.hero.jid);

    if (contact == null) {
      throw new Error('No contact for hero jid found');
    }

    expect(await firstValueFrom(contact.presence$.pipe(skip(1)))).toEqual(Presence.unavailable);

    await testUtils.logOut();
    await ensureNoRegisteredUser(testUtils.villain);
    contacts.unsubscribe();
  });

  it('should handle multiple resources and summarize the status as villain', async () => {
    await ensureRegisteredUser(testUtils.villain);
    const contacts = testUtils.chatService.contactListService.contacts$.subscribe();
    await testUtils.chatService.logIn(testUtils.villain);
    await testUtils.chatService.contactListService.addContact(testUtils.hero.jid);

    const contact = await chatService.contactListService.getContactById(testUtils.hero.jid);

    if (contact == null) {
      throw new Error('No contact for hero jid found');
    }

    const jidString = contact.jid.toString();
    contact.updateResourcePresence(jidString + '/foo', Presence.away);
    expect(await firstValueFrom(contact.presence$.pipe(skip(1)))).toEqual(Presence.away);

    contact.updateResourcePresence(jidString + '/bar', Presence.present);
    expect(await firstValueFrom(contact.presence$.pipe(skip(1)))).toEqual(Presence.present);

    contact.updateResourcePresence(jidString + '/bar', Presence.unavailable);
    expect(await firstValueFrom(contact.presence$.pipe(skip(1)))).toEqual(Presence.away);

    contact.updateResourcePresence(jidString + '/foo', Presence.unavailable);
    expect(await firstValueFrom(contact.presence$.pipe(skip(1)))).toEqual(Presence.unavailable);

    await testUtils.logOut();
    await ensureNoRegisteredUser(testUtils.villain);
    contacts.unsubscribe();
  });

  it('should handle subscribe to a contact and recognize a "to" subscription as villain', async () => {
    await ensureRegisteredUser(testUtils.villain);
    const contacts = testUtils.chatService.contactListService.contacts$.subscribe();
    await testUtils.chatService.logIn(testUtils.villain);

    const testJid = 'test@example.com';
    await chatService.contactListService.addContact(testJid);
    const contact = await chatService.contactListService.getContactById(testJid);

    if (contact == null) {
      throw new Error('No contact for test jid found');
    }

    expect(contact.jid.toString()).toEqual(testJid);
    expect(await firstValueFrom(contact.subscription$)).toEqual(ContactSubscription.to);

    await testUtils.logOut();
    await ensureNoRegisteredUser(testUtils.villain);
    contacts.unsubscribe();
  });

  it('should handle subscribe from a contact and promote subscription from "to" to "both" as villain', async () => {
    await ensureRegisteredUser(testUtils.villain);
    const contacts = testUtils.chatService.contactListService.contacts$.subscribe();
    await testUtils.chatService.logIn(testUtils.villain);

    const testJid = 'test@example.com';
    await chatService.contactListService.addContact(testJid);
    const contact = await chatService.contactListService.getContactById(testJid);

    if (contact == null) {
      throw new Error('No contact for test jid found');
    }

    await testUtils.fakeWebsocketInStanza(
      $pres({
        from: testJid,
        to: testUtils.villain.jid,
        type: 'subscribe',
      }).toString()
    );
    expect(contact.jid.toString()).toEqual(testJid);
    expect(await firstValueFrom(contact.subscription$)).toEqual(ContactSubscription.both);

    await testUtils.logOut();
    await ensureNoRegisteredUser(testUtils.villain);
    contacts.unsubscribe();
  });

  it('should handle subscribe from a contact and promote subscription from "none" to "from" as villain', async () => {
    await ensureRegisteredUser(testUtils.villain);
    const contactsSubscription = testUtils.chatService.contactListService.contacts$.subscribe();
    await testUtils.chatService.logIn(testUtils.villain);

    const newSubJid = 'new-sub-jid@example.com';

    await testUtils.fakeWebsocketInStanza(
      $pres({
        from: newSubJid,
        to: testUtils.villain.jid,
        type: 'subscribe',
      }).toString()
    );

    const contacts = await firstValueFrom(chatService.contactListService.contacts$);
    const contact = contacts[0];

    if (contact == null) {
      fail('contact is undefined');
      return;
    }
    expect(contact.jid.toString()).toEqual(newSubJid);
    expect(await firstValueFrom(contact.subscription$)).toEqual(ContactSubscription.from);

    await testUtils.logOut();
    await ensureNoRegisteredUser(testUtils.villain);
    contactsSubscription.unsubscribe();
  });

  it('should not handle muc presence stanzas as villain', async () => {
    await ensureRegisteredUser(testUtils.villain);
    const contactsSubscription = testUtils.chatService.contactListService.contacts$.subscribe();
    await testUtils.chatService.logIn(testUtils.villain);

    const unknownJid = 'unkown@example.com';

    await testUtils.fakeWebsocketInStanza(
      $pres({
        from: unknownJid,
        to: testUtils.villain.jid,
        type: 'subscribe',
      })
        .c('x', { xmlns: 'http://jabber.org/protocol/muc#user' })
        .toString()
    );
    const contacts = await firstValueFrom(chatService.contactListService.contacts$);
    const contact = contacts.find((c) => c.jid.toString() === unknownJid);

    expect(contact).toBeUndefined();

    await testUtils.logOut();
    await ensureNoRegisteredUser(testUtils.villain);
    contactsSubscription.unsubscribe();
  });
});
