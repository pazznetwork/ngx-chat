// SPDX-License-Identifier: MIT
import type { XmppService } from '../xmpp.service';
import { firstValueFrom, map, merge, mergeMap, Observable, ReplaySubject, scan } from 'rxjs';
import type { ChatPlugin } from '../core';
import { shareReplay } from 'rxjs/operators';

export const nsBlocking = 'urn:xmpp:blocking';

/**
 * XEP-0191: Blocking Command
 * https://xmpp.org/extensions/xep-0191.html
 */
export class BlockPlugin implements ChatPlugin {
  nameSpace = nsBlocking;

  private readonly blockContactJIDSubject = new ReplaySubject<string>(1);
  private readonly unblockContactJIDSubject = new ReplaySubject<string>(1);
  readonly blockedContactJIDs$: Observable<Set<string>>;

  constructor(private xmppService: XmppService) {
    this.blockedContactJIDs$ = merge(
      this.xmppService.onOnline$.pipe(
        mergeMap(() => this.requestBlockedJIDs()),
        map((blocked) => () => {
          const state = new Set<string>();
          blocked.forEach((b) => state.add(b));
          return state;
        })
      ),
      this.blockContactJIDSubject.pipe(map((value) => (state: Set<string>) => state.add(value))),
      this.unblockContactJIDSubject.pipe(
        map((jid) => (state: Set<string>) => state.delete(jid) ? state : state)
      ),
      xmppService.onOffline$.pipe(map(() => () => new Set<string>()))
    ).pipe(
      scan((state, innerFun) => innerFun(state), new Set<string>()),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }

  async blockJid(jid: string): Promise<void> {
    const from = await firstValueFrom(this.xmppService.userJid$);
    await this.xmppService.chatConnectionService
      .$iq({ type: 'set' })
      .c('block', { xmlns: this.nameSpace })
      .c('item', { from, jid })
      .send();

    this.blockContactJIDSubject.next(jid);
  }

  async unblockJid(jid: string): Promise<void> {
    await this.xmppService.chatConnectionService
      .$iq({ type: 'set' })
      .c('unblock', { xmlns: this.nameSpace })
      .c('item', { jid })
      .send();

    this.unblockContactJIDSubject.next(jid);
  }

  private async requestBlockedJIDs(): Promise<Set<string>> {
    const blockListResponse = await this.xmppService.chatConnectionService
      .$iq({ type: 'get' })
      .c('blocklist', { xmlns: this.nameSpace })
      .send();

    const blockListItems = blockListResponse.querySelector('blocklist')?.querySelectorAll('item');

    if (blockListItems == null) {
      return new Set<string>();
    }

    const blockedJids = Array.from(blockListItems)
      .map((e) => e.getAttribute('jid'))
      .filter((val) => val != null) as string[];

    return new Set<string>(blockedJids);
  }
}
