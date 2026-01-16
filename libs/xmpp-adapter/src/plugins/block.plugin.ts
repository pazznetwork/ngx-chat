// SPDX-License-Identifier: MIT
import type { XmppService } from '../xmpp.service';
import { firstValueFrom, map, merge, mergeMap, Observable, ReplaySubject, startWith } from 'rxjs';
import type { ChatPlugin } from '../core';
import { shareReplay, switchMap } from 'rxjs/operators';
import { getUniqueId, NS } from '@pazznetwork/strophe-ts';
import { parseJid } from '@pazznetwork/ngx-chat-shared';

export const nsBlocking = 'urn:xmpp:blocking';

/**
 * XEP-0191: Blocking Command
 * https://xmpp.org/extensions/xep-0191.html
 */
export class BlockPlugin implements ChatPlugin {
  nameSpace = nsBlocking;

  private readonly blockContactJIDSubject = new ReplaySubject<string>(1);
  private readonly unblockContactJIDSubject = new ReplaySubject<string>(1);
  private blockedContactMap = new Set<string>();
  readonly blockedContactJIDs$: Observable<Set<string>>;

  constructor(private xmppService: XmppService) {
    this.blockedContactJIDs$ = merge(
      this.xmppService.onOnline$.pipe(
        mergeMap(() => this.requestBlockedJIDs()),
        map((blocked) => {
          blocked.forEach((b) => this.blockedContactMap.add(parseJid(b).bare().toString()));
          return new Set(this.blockedContactMap);
        })
      ),
      this.blockContactJIDSubject.pipe(
        map((value) => {
          this.blockedContactMap.add(parseJid(value).bare().toString());
          return new Set(this.blockedContactMap);
        })
      ),
      this.unblockContactJIDSubject.pipe(
        map((jid) => {
          this.blockedContactMap.delete(jid);
          return new Set(this.blockedContactMap);
        })
      ),
      xmppService.onOffline$.pipe(
        map(() => {
          this.blockedContactMap = new Set<string>();
          return new Set(this.blockedContactMap);
        })
      )
    ).pipe(shareReplay({ bufferSize: 1, refCount: false }), startWith(new Set(this.blockedContactMap)));

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
    const from = await firstValueFrom(this.xmppService.userJid$);
    await this.xmppService.chatConnectionService
      .$iq({ type: 'set', id: getUniqueId('block') })
      .c('block', { xmlns: this.nameSpace })
      .c('item', { from, jid })
      .send();

    this.blockContactJIDSubject.next(jid);
  }

  async unblockJid(jid: string): Promise<void> {
    await this.xmppService.chatConnectionService
      .$iq({ type: 'set', id: getUniqueId('block') })
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
