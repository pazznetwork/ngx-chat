// SPDX-License-Identifier: MIT
import {
  BehaviorSubject,
  combineLatest,
  firstValueFrom,
  merge,
  mergeMap,
  Observable,
  pairwise,
  Subscription,
  switchMap,
} from 'rxjs';
import { debounceTime, delay, distinctUntilChanged, filter, map, share } from 'rxjs/operators';
import type { JidToNumber, OpenChatsService, Recipient } from '@pazznetwork/ngx-chat-shared';
import { Direction, findSortedInsertionIndexLast, Message } from '@pazznetwork/ngx-chat-shared';
import type { XmppService } from '../xmpp.service';
import type { BlockPlugin, MultiUserChatPlugin, PublishSubscribePlugin } from '../plugins';
import { EntityTimePlugin } from '../plugins';
import { StanzaBuilder } from '../stanza-builder';

const STORAGE_NGX_CHAT_LAST_READ_DATE = 'ngxchat:unreadmessagedate';

type JidToLastReadTimestamp = Map<string, number>;

/**
 * Unofficial plugin using XEP-0163 / PubSub to track count of unread messages per recipient
 *
 * It publishes entries to a private PubSub-Node 'ngxchat:unreadmessagedate'
 * The stored elements look like this:
 * <item id="current">
 *     <entries>
 *         <last-read jid="user1@host1.tld" date="1546419050584"/>
 *         <last-read jid="user2@host1.tld" date="1546419050000"/>
 *     </entries>
 * </item>
 */
export class UnreadMessageCountService {
  /**
   * already debounced to prevent the issues described in {@link UnreadMessageCountService.jidToUnreadCount$}.
   */
  unreadMessageCountSum$!: Observable<number>;

  private jidToUnreadCountSubject: BehaviorSubject<JidToNumber> = new BehaviorSubject(
    new Map<string, number>()
  );

  /**
   * emits as soon as the unread message count changes, you might want to debounce it with e.g. half a second, as
   * new messages might be acknowledged in another session.
   */
  readonly jidToUnreadCount$ = this.jidToUnreadCountSubject.asObservable();
  private readonly jidToLastReadTimestamp: JidToLastReadTimestamp = new Map<string, number>();
  private readonly recipientIdToMessageSubscription = new Map<string, Subscription>();

  constructor(
    private chatService: XmppService,
    private chatMessageListRegistry: OpenChatsService,
    private pubSub: PublishSubscribePlugin,
    private entityTimePlugin: EntityTimePlugin,
    muc: MultiUserChatPlugin,
    private block: BlockPlugin
  ) {
    this.chatService.zone.run(() => {
      this.chatMessageListRegistry.chatMessagesViewed$
        .pipe(
          delay(0), // prevent 'Expression has changed after it was checked'
          mergeMap((recipient): Promise<void> => this.checkForUnreadCountChange(recipient))
        )
        .subscribe();

      chatService.onOnline$
        .pipe(
          switchMap(() =>
            merge(
              muc.rooms$,
              this.chatService.contactListService.contacts$.pipe(
                pairwise(),
                filter(([a, b]) => a?.length < b?.length),
                map(([, b]) => b.at(b.length - 1)),
                map((contact) => [contact])
              )
            )
          )
        )
        .subscribe((recipients): void => {
          for (const recipient of recipients) {
            if (!recipient) {
              continue;
            }
            const jid = recipient.jid.bare().toString();
            if (!this.recipientIdToMessageSubscription.has(jid)) {
              const messages$: Observable<Message[]> = recipient.messageStore.messages$;
              const updateUnreadCountSubscription = messages$
                .pipe(
                  debounceTime(20),
                  mergeMap(() => this.checkForUnreadCountChange(recipient))
                )
                // eslint-disable-next-line rxjs/no-nested-subscribe
                .subscribe();
              this.recipientIdToMessageSubscription.set(jid, updateUnreadCountSubscription);
            }
          }
        });

      chatService.onOnline$.pipe(switchMap(() => this.fillJidToLastSeenDates())).subscribe();

      pubSub.publish$.subscribe((event): void => {
        this.handlePubSubEvent(event);
      });

      this.unreadMessageCountSum$ = combineLatest([
        this.jidToUnreadCount$,
        this.block.blockedContactJIDs$,
      ]).pipe(
        debounceTime(20),
        map(([jidToUnreadCount, blockedContactIdSet]): number => {
          let sum = 0;
          for (const [recipientJid, count] of jidToUnreadCount) {
            if (!blockedContactIdSet.has(recipientJid)) {
              sum += count;
            }
          }
          return sum;
        }),
        distinctUntilChanged(),
        share()
      );
    });

    chatService.onOffline$.subscribe(() => this.onOffline());
  }

  private async checkForUnreadCountChange(recipient: Recipient): Promise<void> {
    if (this.chatMessageListRegistry.isChatOpen(recipient)) {
      this.jidToLastReadTimestamp.set(
        recipient.jid.bare().toString(),
        await firstValueFrom(this.entityTimePlugin.getNow())
      );
      await this.persistLastSeenDates();
    }
    this.updateContactUnreadMessageState(recipient);
  }

  async fillJidToLastSeenDates(): Promise<void> {
    try {
      const fetchedDates = await this.fetchLastSeenDates();
      this.mergeJidToDates(fetchedDates);
    } catch (e) {
      if (e?.toString().includes('item-not-found')) {
        return;
      }

      throw e;
    }
  }

  onOffline(): void {
    for (const subscription of this.recipientIdToMessageSubscription.values()) {
      subscription.unsubscribe();
    }
    this.recipientIdToMessageSubscription.clear();
    this.jidToLastReadTimestamp.clear();
    this.jidToUnreadCountSubject.next(new Map<string, number>());
  }

  private async fetchLastSeenDates(): Promise<JidToLastReadTimestamp> {
    const entries = await this.pubSub.retrieveNodeItems(STORAGE_NGX_CHAT_LAST_READ_DATE);
    return this.parseLastSeenDates(entries);
  }

  private parseLastSeenDates(topLevelElements: Element[]): JidToLastReadTimestamp {
    const result: JidToLastReadTimestamp = new Map<string, number>();

    if (topLevelElements.length === 1 && topLevelElements[0]) {
      const itemElement = topLevelElements[0];
      itemElement
        .querySelector('entries')
        ?.querySelectorAll('last-read')
        .forEach((lastReadEntry): void => {
          if (!lastReadEntry) {
            return;
          }
          const jid = lastReadEntry.getAttribute('jid') as string;
          const date = Number.parseInt(lastReadEntry.getAttribute('date') as string, 10);
          if (!isNaN(date)) {
            result.set(jid, date);
          }
        });
    }

    return result;
  }

  updateContactUnreadMessageState(recipient: Recipient): void {
    const contactJid = recipient.jid.bare().toString();
    const lastReadDate = this.jidToLastReadTimestamp.get(contactJid) || 0;
    const contactUnreadMessageCount = this.calculateUnreadMessageCount(recipient, lastReadDate);
    const jidToCount = this.jidToUnreadCountSubject.getValue();
    if (jidToCount.get(contactJid) !== contactUnreadMessageCount) {
      this.jidToUnreadCountSubject.next(jidToCount.set(contactJid, contactUnreadMessageCount));
    }
  }

  private calculateUnreadMessageCount(recipient: Recipient, lastReadTimestamp: number): number {
    const firstUnreadMessageIndex = findSortedInsertionIndexLast(
      lastReadTimestamp,
      recipient.messageStore.messages,
      (message): number => message.datetime.getTime()
    );
    return recipient.messageStore.messages
      .slice(firstUnreadMessageIndex)
      .filter((message): boolean => message.direction === Direction.in).length;
  }

  private async persistLastSeenDates(): Promise<void> {
    await this.chatService.pluginMap.pubSub.storePrivatePayloadPersistent(
      STORAGE_NGX_CHAT_LAST_READ_DATE,
      'current',
      (builder): StanzaBuilder => {
        const wrapperBuilder = builder.c('entries');
        for (const [jid, date] of this.jidToLastReadTimestamp) {
          wrapperBuilder.c('last-read', { jid, date: date.toString() }).up();
        }
        return wrapperBuilder;
      }
    );
  }

  private handlePubSubEvent(event: Element): void {
    const itemsWrapper = event.querySelector('items');
    const itemsNode = itemsWrapper?.getAttribute('node');
    const items = itemsWrapper?.querySelectorAll('item');
    if (itemsNode === STORAGE_NGX_CHAT_LAST_READ_DATE && items) {
      const publishedLastJidToDate = this.parseLastSeenDates(Array.from(items));
      this.mergeJidToDates(publishedLastJidToDate);
    }
  }

  private mergeJidToDates(newJidToDate: JidToLastReadTimestamp): void {
    for (const [jid, date] of newJidToDate) {
      const oldLastReadDate = this.jidToLastReadTimestamp.get(jid);
      if (!oldLastReadDate || oldLastReadDate < date) {
        this.jidToLastReadTimestamp.set(jid, date);
      }
    }
  }
}
