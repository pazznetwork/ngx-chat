// SPDX-License-Identifier: AGPL-3.0-or-later
import { testUser, TestUtils } from './helpers/test-utils';
import { TestBed } from '@angular/core/testing';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import type { XmppService } from '@pazznetwork/xmpp-adapter';
import { XmppAdapterTestModule } from '../xmpp-adapter-test.module';
import { ensureNoRegisteredUser, ensureRegisteredUser } from './helpers/admin-actions';
import { firstValueFrom } from 'rxjs';
import type { AuthRequest } from '@pazznetwork/ngx-chat-shared';
import { filter } from 'rxjs/operators';

describe('login and logout', () => {
  let testUtils: TestUtils;

  beforeEach(() => {
    const testBed = TestBed.configureTestingModule({
      imports: [XmppAdapterTestModule],
    });
    testUtils = new TestUtils(testBed.inject<XmppService>(CHAT_SERVICE_TOKEN));
  });

  it('should be able to login and logout as testUser', async () => {
    await testLogin(testUser);
  });

  it('should be able to login and logout again as hero', async () => {
    await testLogin(testUtils.hero);
  });

  it('should be able to login and logout and again as villain', async () => {
    await testLogin(testUtils.villain);
  });

  it('should be able to login and logout with 3 users in one test', async () => {
    await testLogin(testUser);
    await testLogin(testUtils.hero);
    await testLogin(testUtils.villain);
  });

  async function testLogin(auth: AuthRequest): Promise<void> {
    await ensureRegisteredUser(auth);

    const userJidPromise = firstValueFrom(
      testUtils.chatService.userJid$.pipe(filter((jid) => jid.includes(auth.username)))
    );
    await testUtils.chatService.logIn(auth);
    const userJid = await userJidPromise;
    expect(userJid).toMatch(auth.username);

    await testUtils.chatService.logOut();
    expect(await firstValueFrom(testUtils.chatService.isOnline$)).toBeFalsy();

    await ensureNoRegisteredUser(auth);
  }
});
