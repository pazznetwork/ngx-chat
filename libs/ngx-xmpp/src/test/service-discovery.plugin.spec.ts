// SPDX-License-Identifier: AGPL-3.0-or-later
import { testUser, TestUtils } from './helpers/test-utils';
import { TestBed } from '@angular/core/testing';
import { XmppAdapterTestModule } from '../xmpp-adapter-test.module';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';
import type { XmppService } from '@pazznetwork/xmpp-adapter';
import { ensureRegisteredUser } from './helpers/admin-actions';

describe('service discovery plugin', () => {
  let testUtils: TestUtils;

  beforeAll(() => {
    const testBed = TestBed.configureTestingModule({
      imports: [XmppAdapterTestModule],
    });
    testUtils = new TestUtils(testBed.inject<XmppService>(CHAT_SERVICE_TOKEN));
  });

  it('should discover the multi user chat service', async () => {
    await ensureRegisteredUser(testUser);

    await testUtils.chatService.logIn(testUser);

    // when
    const service = await testUtils.chatService.pluginMap.disco.findService('conference', 'text');

    // then
    expect(service.jid).toContain('conference.' + testUtils.xmppDomain);

    await testUtils.chatService.logOut();
  });
});
