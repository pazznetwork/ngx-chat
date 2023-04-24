// SPDX-License-Identifier: MIT
import type { XmppService } from '../xmpp.service';
import { combineLatest, concatMap, interval } from 'rxjs';
import { filter } from 'rxjs/operators';
import type { ChatPlugin } from '../core';

const nsPing = 'urn:xmpp:ping';

/**
 * XEP-0199 XMPP Ping (https://xmpp.org/extensions/xep-0199.html)
 */
export class PingPlugin implements ChatPlugin {
  nameSpace = nsPing;

  constructor(private readonly xmppChatAdapter: XmppService) {
    combineLatest([this.xmppChatAdapter.isOnline$, interval(15_000)])
      .pipe(
        filter(([isOnline]) => isOnline),
        concatMap(() =>
          this.xmppChatAdapter.chatConnectionService
            .$iq({ type: 'get' })
            .c('ping', { xmlns: this.nameSpace })
            .send()
        )
      )
      .subscribe();
  }
}
