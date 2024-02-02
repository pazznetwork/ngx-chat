// SPDX-License-Identifier: MIT
import { TestBed } from '@angular/core/testing';
import { TestUtils } from './helpers/test-utils';
import { XmppAdapterTestModule } from '../xmpp-adapter-test.module';
import type { XmppService } from '@pazznetwork/xmpp-adapter';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import { ensureRegisteredUser } from './helpers/admin-actions';
import { firstValueFrom } from 'rxjs';
import { Direction } from '@pazznetwork/ngx-chat-shared';
import { filter } from 'rxjs/operators';

describe('message carbons plugin', () => {
  let testUtils: TestUtils;

  beforeEach(() => {
    const testBed = TestBed.configureTestingModule({
      imports: [XmppAdapterTestModule],
    });
    testUtils = new TestUtils(testBed.inject<XmppService>(CHAT_SERVICE_TOKEN));
  });

  it('should add the message to the contact', async () => {
    const validIncomingCarbonMessage = `
            <message xmlns='jabber:client'
                     from='${testUtils.hero.jid}'
                     to='${testUtils.hero.jid}/home'
                     type='chat'>
              <received xmlns='urn:xmpp:carbons:2'>
                <forwarded xmlns='urn:xmpp:forward:0'>
                  <message xmlns='jabber:client'
                           from='juliet@capulet.example/balcony'
                           to='${testUtils.hero.jid}/garden'
                           type='chat'>
                    <body>What man art thou that, thus bescreen'd in night, so stumblest on my counsel?</body>
                    <thread>0e3141cd80894871a68e6fe6b1ec56fa</thread>
                  </message>
                </forwarded>
              </received>
            </message>`;

    const contactsPromise = firstValueFrom(
      testUtils.chatService.contactListService.contacts$.pipe(
        filter((contacts) => contacts.length > 0)
      )
    );
    await ensureRegisteredUser(testUtils.hero);
    await testUtils.logIn.hero();

    await testUtils.fakeWebsocketInStanza(validIncomingCarbonMessage);

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
  });
});
