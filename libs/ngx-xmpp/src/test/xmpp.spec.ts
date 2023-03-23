// SPDX-License-Identifier: AGPL-3.0-or-later
import { isEmpty } from 'rxjs/operators';
import { TestUtils } from './helpers/test-utils';
import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { XmppAdapterTestModule } from '../xmpp-adapter-test.module';
import type { XmppService } from '@pazznetwork/xmpp-adapter';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';

xdescribe('XmppChatAdapter', () => {
  let testUtils: TestUtils;

  beforeAll(() => {
    const testBed = TestBed.configureTestingModule({
      imports: [XmppAdapterTestModule],
    });
    testUtils = new TestUtils(testBed.inject<XmppService>(CHAT_SERVICE_TOKEN));
  });

  describe('contact management', () => {
    it('#getContactById() should ignore resources', async () => {
      await testUtils.register.princess();
      await testUtils.register.father();
      await testUtils.register.hero();

      await testUtils.logIn.hero();
      await testUtils.chatService.contactListService.addContact(testUtils.princess.jid.toString());
      const savedContact = await testUtils.chatService.contactListService.getContactById(
        testUtils.princess.jid.toString() + '/test123'
      );

      if (savedContact == null) {
        fail(new Error('Could not get the contact'));
        return;
      }

      expect(savedContact.jid.toString()).toEqual(testUtils.princess.jid);
    });

    it('#getContactById() should return the correct contact', async () => {
      await testUtils.chatService.contactListService.addContact(testUtils.father.jid.toString());
      const fatherContact = await testUtils.chatService.contactListService.getContactById(
        testUtils.father.jid.toString()
      );

      expect(fatherContact?.jid?.toString()).toEqual(testUtils.father.jid);

      const princessContact = await testUtils.chatService.contactListService.getContactById(
        testUtils.princess.jid.toString()
      );
      expect(princessContact?.jid.toString()).toEqual(testUtils.princess.jid);
    });

    it('#getContactById() should return undefined when no such contact exists', async () => {
      expect(
        await testUtils.chatService.contactListService.getContactById(
          testUtils.friend.jid.toString()
        )
      ).toBeUndefined();
    });
  });

  describe('messages', () => {
    it('#messages$ should emit contact on received messages', async () => {
      await testUtils.register.hero();
      await testUtils.logIn.hero();

      await testUtils.register.villain();
      await testUtils.logIn.villain();
      const recipient = await testUtils.chatService.contactListService.getOrCreateContactById(
        testUtils.hero.jid.toString()
      );
      const villainMessage = 'I will destroy you HERO!!!';
      await testUtils.chatService.messageService.sendMessage(recipient, villainMessage);

      const contact = await firstValueFrom(testUtils.chatService.messageService.message$);

      expect(contact.jid.toString()).toEqual(recipient.jid.toString());
      expect(contact.messageStore.messages.length).toEqual(1);
      expect(contact.messageStore.mostRecentMessage?.body).toEqual(villainMessage);
      expect(contact.messageStore.messages?.[0]?.direction).toEqual(testUtils.direction.in);
    });

    it('#messages$ should not emit contact on sending messages', async () => {
      expect(
        await firstValueFrom(testUtils.chatService.messageService.message$.pipe(isEmpty()))
      ).toBeTruthy();
    });

    it('#messages$ in contact should emit message on received messages', async () => {
      const heroContact = await testUtils.chatService.contactListService.getOrCreateContactById(
        testUtils.hero.jid.toString()
      );
      const villainContact = await testUtils.chatService.contactListService.getOrCreateContactById(
        testUtils.villain.jid.toString()
      );
      const heroMessage = 'Never! Justice always prevails!';

      await testUtils.chatService.messageService.sendMessage(villainContact, heroMessage);
      const messages = await firstValueFrom(heroContact.messageStore.messages$);
      const message = messages[0];

      expect(message?.body).toEqual(heroMessage);
      expect(message?.direction).toEqual(testUtils.direction.in);
    });

    it('#messages$ in contact should emit on sending messages', async () => {
      const villainContact = await testUtils.chatService.contactListService.getOrCreateContactById(
        testUtils.villain.jid.toString()
      );
      const heroMessage =
        'For our next fight you should not forget to bring the cheese wheel of doom';

      await testUtils.chatService.messageService.sendMessage(villainContact, heroMessage);
      const messages = await firstValueFrom(villainContact.messageStore.messages$);
      const message = messages[0];

      expect(message?.direction).toEqual(testUtils.direction.out);
      expect(message?.body).toEqual(heroMessage);
    });
  });

  describe('states', () => {
    it('should clear contacts when logging out', async () => {
      await testUtils.register.princess();
      await testUtils.register.father();
      await testUtils.register.friend();
      await testUtils.register.hero();

      await testUtils.logIn.hero();

      await testUtils.chatService.contactListService.addContact(testUtils.princess.jid.toString());
      await testUtils.chatService.contactListService.addContact(testUtils.father.jid.toString());
      await testUtils.chatService.contactListService.addContact(testUtils.friend.jid.toString());

      expect(
        (await firstValueFrom(testUtils.chatService.contactListService.contacts$)).length
      ).toEqual(3);

      await testUtils.logOut();

      expect(
        (await firstValueFrom(testUtils.chatService.contactListService.contacts$)).length
      ).toEqual(0);

      await testUtils.logIn.hero();

      expect(
        (await firstValueFrom(testUtils.chatService.contactListService.contacts$)).length
      ).toEqual(3);
    });
  });
});
