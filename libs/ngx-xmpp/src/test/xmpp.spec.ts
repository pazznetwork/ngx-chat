// SPDX-License-Identifier: AGPL-3.0-or-later
import { filter, switchMap } from 'rxjs/operators';
import { TestUtils } from './helpers/test-utils';
import { firstValueFrom, map } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { XmppAdapterTestModule } from '../xmpp-adapter-test.module';
import type { XmppService } from '@pazznetwork/xmpp-adapter';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import { ensureNoRegisteredUser, ensureRegisteredUser } from './helpers/admin-actions';

describe('XmppChatAdapter', () => {
  let testUtils: TestUtils;

  beforeAll(() => {
    const testBed = TestBed.configureTestingModule({
      imports: [XmppAdapterTestModule],
    });
    testUtils = new TestUtils(testBed.inject<XmppService>(CHAT_SERVICE_TOKEN));
  });

  describe('contact management', () => {
    it('#getContactById() should ignore resources', async () => {
      await ensureRegisteredUser(testUtils.hero);
      const contactPromise = firstValueFrom(
        testUtils.chatService.contactListService.contacts$.pipe(
          filter((c) => c.length === 1),
          map((c) => c.length)
        )
      );
      await testUtils.logIn.hero();

      await testUtils.chatService.contactListService.addContact(testUtils.princess.jid);
      const savedContact = await testUtils.chatService.contactListService.getContactById(
        testUtils.princess.jid + '/test123'
      );

      if (savedContact == null) {
        fail(new Error('Could not get the contact'));
        return;
      }

      expect(savedContact.jid.toString()).toEqual(testUtils.princess.jid);
      expect(await contactPromise).toEqual(1);

      await testUtils.logOut();
      await ensureNoRegisteredUser(testUtils.hero);
    });

    it('#getContactById() should return the correct contact', async () => {
      await ensureRegisteredUser(testUtils.hero);
      const contactPromise = firstValueFrom(
        testUtils.chatService.contactListService.contacts$.pipe(
          filter((c) => c.length === 2),
          map((c) => c.length)
        )
      );
      await testUtils.logIn.hero();

      await testUtils.chatService.contactListService.addContact(testUtils.princess.jid);
      await testUtils.chatService.contactListService.addContact(testUtils.father.jid);
      const fatherContact = await testUtils.chatService.contactListService.getContactById(
        testUtils.father.jid
      );

      expect(fatherContact?.jid?.toString()).toEqual(testUtils.father.jid);

      const princessContact = await testUtils.chatService.contactListService.getContactById(
        testUtils.princess.jid
      );
      expect(princessContact?.jid.toString()).toEqual(testUtils.princess.jid);
      expect(await contactPromise).toEqual(2);

      await testUtils.logOut();
      await ensureNoRegisteredUser(testUtils.hero);
    });

    it('#getContactById() should return undefined when no such contact exists', async () => {
      await ensureRegisteredUser(testUtils.hero);
      const contactPromise = firstValueFrom(
        testUtils.chatService.contactListService.contacts$.pipe(map((c) => c.length))
      );
      await testUtils.logIn.hero();

      expect(
        await testUtils.chatService.contactListService.getContactById(
          testUtils.friend.jid.toString()
        )
      ).toBeUndefined();
      expect(await contactPromise).toEqual(0);

      await testUtils.logOut();
      await ensureNoRegisteredUser(testUtils.hero);
    });
  });

  describe('messages', () => {
    it('#messages$ should emit contact on received messages', async () => {
      await ensureRegisteredUser(testUtils.hero);
      await ensureRegisteredUser(testUtils.villain);

      const contactsPromise = firstValueFrom(
        testUtils.chatService.contactListService.contacts$.pipe(
          filter((c) => c.length === 1),
          map((c) => c.length)
        )
      );
      const messageContactPromise = firstValueFrom(testUtils.chatService.messageService.message$);
      await testUtils.logIn.villain();

      const recipient = await testUtils.chatService.contactListService.getOrCreateContactById(
        testUtils.hero.jid
      );
      const villainMessage = 'I will destroy you HERO!!!';
      await testUtils.chatService.messageService.sendMessage(recipient, villainMessage);
      expect(await contactsPromise).toEqual(1);
      const contact = await messageContactPromise;

      expect(contact.jid.equals(recipient.jid)).toBeTruthy();
      expect(contact.messageStore.messages.length).toEqual(1);
      expect(contact.messageStore.mostRecentMessage?.body).toEqual(villainMessage);
      expect(contact.messageStore.messages?.[0]?.direction).toEqual(testUtils.direction.out);

      await testUtils.logOut();

      await ensureNoRegisteredUser(testUtils.hero);
      await ensureNoRegisteredUser(testUtils.villain);
    });

    it('#messages$ in contact should emit message on received messages', async () => {
      await ensureRegisteredUser(testUtils.hero);
      await ensureRegisteredUser(testUtils.villain);
      const contactsPromise = firstValueFrom(
        testUtils.chatService.contactListService.contacts$.pipe(
          filter((c) => c.length === 1),
          map((c) => c.length)
        )
      );

      await testUtils.logIn.hero();
      const villainContact = await testUtils.chatService.contactListService.getOrCreateContactById(
        testUtils.villain.jid
      );
      const heroMessage = 'Never! Justice always prevails!';

      await testUtils.chatService.messageService.sendMessage(villainContact, heroMessage);
      await testUtils.logOut();

      const messagePromise = firstValueFrom(
        testUtils.chatService.messageService.message$.pipe(
          filter((c) => c.jid.toString().includes(testUtils.hero.jid)),
          switchMap((c) => c.messageStore.messages$)
        )
      );
      await testUtils.logIn.villain();
      const messages = await messagePromise;
      const message = messages[0];

      expect(message?.body).toEqual(heroMessage);
      expect(message?.direction).toEqual(testUtils.direction.in);
      expect(await contactsPromise).toEqual(1);

      await testUtils.logOut();
      await ensureNoRegisteredUser(testUtils.hero);
      await ensureNoRegisteredUser(testUtils.villain);
    });

    it('#messages$ in contact should emit on sending messages', async () => {
      await ensureRegisteredUser(testUtils.hero);
      await ensureRegisteredUser(testUtils.villain);
      const contactsPromise = firstValueFrom(
        testUtils.chatService.contactListService.contacts$.pipe(
          filter((c) => c.length === 1),
          map((c) => c.length)
        )
      );

      await testUtils.logIn.hero();

      const villainContact = await testUtils.chatService.contactListService.getOrCreateContactById(
        testUtils.villain.jid
      );

      const messagePromise = firstValueFrom(villainContact.messageStore.messages$);
      const heroMessage =
        'For our next fight you should not forget to bring the cheese wheel of doom';

      await testUtils.chatService.messageService.sendMessage(villainContact, heroMessage);
      const messages = await messagePromise;
      const message = messages[0];

      expect(message?.direction).toEqual(testUtils.direction.out);
      expect(message?.body).toEqual(heroMessage);
      expect(await contactsPromise).toEqual(1);

      await testUtils.logOut();
      await ensureNoRegisteredUser(testUtils.hero);
      await ensureNoRegisteredUser(testUtils.villain);
    });
  });

  describe('states', () => {
    it('should clear contacts when logging out', async () => {
      await ensureRegisteredUser(testUtils.princess);
      await ensureRegisteredUser(testUtils.father);
      await ensureRegisteredUser(testUtils.friend);
      await ensureRegisteredUser(testUtils.hero);

      const contactsLength$ = testUtils.chatService.contactListService.contacts$.pipe(
        map((c) => c.length)
      );

      const contactsPromise = firstValueFrom(contactsLength$.pipe(filter((c) => c === 3)));

      await testUtils.logIn.hero();

      await testUtils.chatService.contactListService.addContact(testUtils.princess.jid.toString());
      await testUtils.chatService.contactListService.addContact(testUtils.father.jid.toString());
      await testUtils.chatService.contactListService.addContact(testUtils.friend.jid.toString());

      expect(await contactsPromise).toEqual(3);

      const contactsPromiseAfterLogout = firstValueFrom(
        contactsLength$.pipe(filter((c) => c === 0))
      );
      await testUtils.logOut();

      expect(await contactsPromiseAfterLogout).toEqual(0);

      const contactsPromiseAfterLogin = firstValueFrom(
        contactsLength$.pipe(filter((c) => c === 3))
      );
      await testUtils.logIn.hero();

      expect(await contactsPromiseAfterLogin).toEqual(3);

      await testUtils.logOut();

      await ensureNoRegisteredUser(testUtils.princess);
      await ensureNoRegisteredUser(testUtils.father);
      await ensureNoRegisteredUser(testUtils.friend);
      await ensureNoRegisteredUser(testUtils.hero);
    });
  });
});
