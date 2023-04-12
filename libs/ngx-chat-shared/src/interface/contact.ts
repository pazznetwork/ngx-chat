// SPDX-License-Identifier: AGPL-3.0-or-later
import { firstValueFrom, map, Observable, ReplaySubject, scan, startWith } from 'rxjs';
import { MessageStore } from './message-store';
import { Presence } from './presence';
import type { Recipient } from './recipient';
import { ContactSubscription } from './contact-subscription';
import { JID, parseJid } from '../jid';
import type { Invitation } from './invitation';

export type JidToPresence = Map<string, Presence>;

export function isContact(recipient: Recipient): recipient is Contact {
  return recipient.recipientType === 'contact';
}

export class Contact implements Recipient {
  readonly messageStore: MessageStore = new MessageStore();

  readonly recipientType = 'contact';

  readonly jid: JID;

  private readonly subscriptionSubject = new ReplaySubject<ContactSubscription>(1);
  readonly subscription$ = this.subscriptionSubject.asObservable();

  private readonly resourcesSubject = new ReplaySubject<[string, Presence]>(1);
  readonly resources$ = this.resourcesSubject.pipe(
    scan((acc, [key, value]) => acc.set(key, value), new Map<string, Presence>())
  );

  readonly presence$ = this.resources$.pipe(
    map((resources): Presence => this.determineOverallPresence(resources)),
    startWith(Presence.unavailable)
  );

  private readonly pendingRoomInviteSubject = new ReplaySubject<Invitation | null>(1);
  readonly pendingRoomInvite$ = this.pendingRoomInviteSubject.asObservable();

  constructor(
    jid: string,
    public name: string,
    public avatar: string = '',
    subscription = ContactSubscription.none
  ) {
    this.jid = parseJid(jid);
    this.subscriptionSubject.next(subscription);
  }

  equalsJid(other: JID | Contact): boolean {
    const otherJid = other instanceof Contact ? other.jid : other.bare();
    return this.jid.equals(otherJid);
  }

  isSubscribed(): Observable<boolean> {
    return this.subscription$.pipe(
      map((sub): boolean => [ContactSubscription.both, ContactSubscription.to].includes(sub))
    );
  }

  isUnaffiliated(): Observable<boolean> {
    return this.subscription$.pipe(map((sub): boolean => sub === ContactSubscription.none));
  }

  updateResourcePresence(jid: string, presence: Presence): void {
    this.resourcesSubject.next([jid, presence]);
  }

  clearRoomInvitation(): void {
    this.pendingRoomInviteSubject.next(null);
  }

  newRoomInvitation(invitation: Invitation): void {
    this.pendingRoomInviteSubject.next(invitation);
  }

  private determineOverallPresence(jidToPresence: JidToPresence): Presence {
    let result = Presence.unavailable;

    [...jidToPresence.values()].some((presence): boolean => {
      if (presence === Presence.present) {
        result = presence;
        return true;
      } else if (presence === Presence.away) {
        result = Presence.away;
      }
      return false;
    });

    return result;
  }

  async updateSubscriptionOnReceived(): Promise<void> {
    this.subscriptionSubject.next(
      this.transitionSubscriptionRequestReceivedAccepted(await firstValueFrom(this.subscription$))
    );
  }

  async updateSubscriptionOnRequestSent(): Promise<void> {
    this.subscriptionSubject.next(
      this.transitionSubscriptionRequestSentAccepted(await firstValueFrom(this.subscription$))
    );
  }

  private transitionSubscriptionRequestReceivedAccepted(
    subscription: ContactSubscription
  ): ContactSubscription.from | ContactSubscription.both {
    switch (subscription) {
      case ContactSubscription.none:
        return ContactSubscription.from;
      case ContactSubscription.to:
        return ContactSubscription.both;
      default:
        return subscription;
    }
  }

  private transitionSubscriptionRequestSentAccepted(
    subscription: ContactSubscription
  ): ContactSubscription.both | ContactSubscription.to {
    switch (subscription) {
      case ContactSubscription.none:
        return ContactSubscription.to;
      case ContactSubscription.from:
        return ContactSubscription.both;
      default:
        return subscription;
    }
  }
}
