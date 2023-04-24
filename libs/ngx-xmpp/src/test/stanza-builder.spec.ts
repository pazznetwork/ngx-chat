// SPDX-License-Identifier: AGPL-3.0-or-later
import { $iq } from '@pazznetwork/strophets';
import { TestUtils } from './helpers/test-utils';
import { TestBed } from '@angular/core/testing';
import { XmppAdapterTestModule } from '../xmpp-adapter-test.module';
import type { XmppService } from '@pazznetwork/xmpp-adapter';
import { CHAT_SERVICE_TOKEN } from '@pazznetwork/ngx-xmpp';

describe('stanza builder should behave as expected', () => {
  let testUtils: TestUtils;

  beforeAll(() => {
    const testBed = TestBed.configureTestingModule({
      imports: [XmppAdapterTestModule],
    });
    testUtils = new TestUtils(testBed.inject<XmppService>(CHAT_SERVICE_TOKEN));
  });

  const expected = '<iq test="test" xmlns="jabber:client"><child><grandchild/></child></iq>';

  it('building iq stanzas with $iq should result in correct children tree', () => {
    expect($iq({ test: 'test' }).c('child').c('grandchild').toString()).toEqual(expected);
  });

  it('building iq stanzas with StanzaBuilder should result in correct children tree', () => {
    expect(
      testUtils.chatService.chatConnectionService
        .$iq({ test: 'test' })
        .c('child')
        .c('grandchild')
        .toString()
    ).toEqual(expected);
  });
});
