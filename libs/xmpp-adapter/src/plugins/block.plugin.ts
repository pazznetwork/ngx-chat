// SPDX-License-Identifier: MIT
import type { XmppService } from '../xmpp.service';
import { firstValueFrom, map, merge, mergeMap, Observable, ReplaySubject, scan } from 'rxjs';
import type { ChatPlugin } from '../core';
import { shareReplay, switchMap } from 'rxjs/operators';
import { getUniqueId, NS } from '@pazznetwork/strophets';

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

    xmppService.onOnline$.pipe(switchMap(() => this.initializeHandler())).subscribe();
  }

  async initializeHandler(): Promise<void> {
    await this.xmppService.chatConnectionService.addHandler((stanza) => this.handlePush(stanza), {
      ns: NS.CLIENT,
      name: 'iq',
      type: 'set',
    });
  }

  async blockJid(jid: string): Promise<void> {
    const blockPromise = firstValueFrom(this.blockContactJIDSubject);

    const from = await firstValueFrom(this.xmppService.userJid$);
    await this.xmppService.chatConnectionService
      .$iq({ type: 'set', id: getUniqueId('block') })
      .c('block', { xmlns: this.nameSpace })
      .c('item', { from, jid })
      .sendResponseLess();

    await blockPromise;
  }

  async unblockJid(jid: string): Promise<void> {
    const unblockPromise = firstValueFrom(this.unblockContactJIDSubject);

    await this.xmppService.chatConnectionService
      .$iq({ type: 'set', id: getUniqueId('block') })
      .c('unblock', { xmlns: this.nameSpace })
      .c('item', { jid })
      .sendResponseLess();
    await unblockPromise;
  }

  private async requestBlockedJIDs(): Promise<Set<string>> {
    const blockListResponse = await this.xmppService.chatConnectionService
      .$iq({ type: 'get' })
      .c('blocklist', { xmlns: this.nameSpace })
      .send();

    const blockListItems = blockListResponse.querySelector('blocklist')?.querySelectorAll('item');

    console.log('requestBlockedJIDs');

    if (blockListItems == null) {
      return new Set<string>();
    }

    const blockedJids = Array.from(blockListItems)
      .map((e) => e.getAttribute('jid'))
      .filter((val) => val != null) as string[];

    return new Set<string>(blockedJids);
  }

  private handlePush(stanza: Element): boolean {
    const unblock = stanza.querySelector('iq > unblock');
    const block = stanza.querySelector('iq > block');
    if (block) {
      const jids = Array.from(block.querySelectorAll('item')).map(
        (item) => item?.getAttribute('jid') as string
      );
      for (const jid of jids) {
        this.blockContactJIDSubject.next(jid);
      }
    } else if (unblock) {
      const jids = Array.from(unblock.querySelectorAll('item')).map(
        (item) => item?.getAttribute('jid') as string
      );
      for (const jid of jids) {
        this.unblockContactJIDSubject.next(jid);
      }
    }
    return true;
  }
}
