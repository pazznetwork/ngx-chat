// SPDX-License-Identifier: MIT
import { BehaviorSubject, mergeMap, Observable, switchMap } from 'rxjs';
import { filter, first, map } from 'rxjs/operators';
import type { XmppService } from '../xmpp.service';
import type { ChatPlugin } from '../core';
import { Finder } from '../core';
import type { Log } from '@pazznetwork/ngx-chat-shared';

export interface TimeReference {
  utcTimestamp: number;
  /**
   * When was utcTimestamp seen locally according to performance.now().
   */
  localReference: number;
}

const nsTime = 'urn:xmpp:time';

/**
 * Request time of entities via XEP-0202.
 */
export class EntityTimePlugin implements ChatPlugin {
  nameSpace = nsTime;
  private serverTimeSubject = new BehaviorSubject<TimeReference | null>(null);
  private serverTime$ = this.serverTimeSubject.asObservable();

  constructor(private xmppService: XmppService, private logService: Log) {
    this.xmppService.onOnline$
      .pipe(
        switchMap(() => this.xmppService.chatConnectionService.userJid$.pipe(first())),
        mergeMap((jid) => {
          return this.requestTime(jid).then((time) => this.serverTimeSubject.next(time));
        })
      )
      .subscribe();
  }

  /**
   * Returns a non-client-specific timestamp if server supports XEP-0202. Fallback to local timestamp in case of missing support.
   */
  getNow(): Observable<number> {
    return this.serverTime$.pipe(
      filter((ref) => !!ref),
      map(
        (reference) =>
          (reference as TimeReference).utcTimestamp +
          (performance.now() - (reference as TimeReference).localReference)
      )
    );
  }

  async requestTime(jid: string): Promise<TimeReference> {
    const response = await this.xmppService.chatConnectionService
      .$iq({ type: 'get', to: jid?.split('@')?.[1]?.split('/')?.[0] as string, from: jid })
      .c('time', { xmlns: this.nameSpace })
      .send();
    const utcString = Finder.create(response)
      ?.searchByTag('time')
      ?.searchByNamespace(this.nameSpace)
      ?.searchByTag('utc')?.result?.textContent;

    if (!utcString) {
      const message = 'invalid time response';
      this.logService.error(message, response.toString());
      throw new Error(message);
    }

    return { utcTimestamp: Date.parse(utcString), localReference: performance.now() };
  }
}
