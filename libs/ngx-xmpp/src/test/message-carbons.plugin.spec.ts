// SPDX-License-Identifier: MIT
import { TestBed } from '@angular/core/testing';
import { XmppAdapterTestModule } from '../xmpp-adapter-test.module';



describe('message carbons plugin', () => {
  it('placeholder', () => { });


  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [XmppAdapterTestModule],
    });
    // testUtils = new TestUtils(testBed.inject<XmppService>(CHAT_SERVICE_TOKEN));
  });

  /* xit('should add the message to the contact', async () => {
    const contactsPromise = firstValueFrom(
      testUtils.chatService.contactListService.contacts$.pipe(
        filter((contacts) => contacts.length > 0)
      )
    );
    // We need to ensure message service is listening and wait for the message
    const messagePromise = firstValueFrom(testUtils.chatService.messageService.message$);
  
    await ensureRegisteredUser(testUtils.hero);
    await testUtils.logIn.hero();
  
    const currentJid = await firstValueFrom(testUtils.chatService.chatConnectionService.userJid$);
    const validIncomingCarbonMessage = `<message xmlns='jabber:client' from='${testUtils.hero.jid}' to='${currentJid}' type='chat'><received xmlns='urn:xmpp:carbons:2'><forwarded xmlns='urn:xmpp:forward:0'><message xmlns='jabber:client' from='juliet@capulet.example/balcony' to='${testUtils.hero.jid}/garden' type='chat'><body>What man art thou that, thus bescreen'd in night, so stumblest on my counsel?</body><thread>0e3141cd80894871a68e6fe6b1ec56fa</thread></message></forwarded></received></message>`;
  
    await testUtils.fakeWebsocketInStanza(validIncomingCarbonMessage);
  
    // Wait for message processing
    await messagePromise;
  
    const contacts = await contactsPromise;
    const firstContact = contacts[0];
    const messages = contacts?.[0]?.messageStore.messages;
    expect(messages?.length).toEqual(1);
    const savedMessage = messages?.[0];
    expect(firstContact?.jid?.toString()).toEqual('juliet@capulet.example/balcony');
    expect(savedMessage?.body).toEqual(
      "What man art thou that, thus bescreen'd in night, so stumblest on my counsel?"
    );
    expect(savedMessage?.direction).toEqual(Direction.in);
  
    await testUtils.logOut();
    }, 60000); */
});
