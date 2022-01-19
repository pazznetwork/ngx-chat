import { jid as parseJid } from '@xmpp/client';
import { JID } from '@xmpp/jid';
import { BehaviorSubject, Subject } from 'rxjs';
import { LogService } from '../services/log.service';
import { dummyAvatarContact } from './contact-avatar';
import { Message } from './message';
import { DateMessagesGroup, MessageStore } from './message-store';
import { Presence } from './presence';
import { isJid, Recipient } from './recipient';
import { ContactSubscription } from './subscription';

export interface ContactMetadata {
    [key: string]: any;
}

export type JidToPresence = Map<string, Presence>;

export class Contact {

    readonly recipientType = 'contact';
    public avatar = dummyAvatarContact;
    public metadata: ContactMetadata = {};

    /** use {@link jidBare}, jid resource is only set for chat room contacts */
    public readonly jidFull: JID;
    public readonly jidBare: JID;
    public readonly presence$ = new BehaviorSubject<Presence>(Presence.unavailable);
    public readonly subscription$ = new BehaviorSubject<ContactSubscription>(ContactSubscription.none);
    public readonly pendingOut$ = new BehaviorSubject(false);
    public readonly pendingIn$ = new BehaviorSubject(false);
    public readonly resources$ = new BehaviorSubject<JidToPresence>(new Map());
    readonly pendingRoomInvite$ = new BehaviorSubject(false);

    private readonly messageStore: MessageStore<Message>;

    get messages$(): Subject<Message> {
        return this.messageStore.messages$;
    }

    get messages(): Message[] {
        return this.messageStore.messages;
    }

    get dateMessagesGroups(): DateMessagesGroup<Message>[] {
        return this.messageStore.dateMessageGroups;
    }

    get oldestMessage(): Message | undefined {
        return this.messageStore.oldestMessage;
    }

    get mostRecentMessage(): Message | undefined {
        return this.messageStore.mostRecentMessage;
    }

    get mostRecentMessageReceived(): Message | undefined {
        return this.messageStore.mostRecentMessageReceived;
    }

    get mostRecentMessageSent(): Message | undefined {
        return this.messageStore.mostRecentMessageSent;
    }

    /**
     * Do not call directly, use {@link ContactFactoryService#createContact} instead.
     */
    constructor(jidPlain: string,
                public name: string,
                logService?: LogService,
                avatar?: string) {
        if (avatar) {
            this.avatar = avatar;
        }
        const jid = parseJid(jidPlain);
        this.jidFull = jid;
        this.jidBare = jid.bare();
        this.messageStore = new MessageStore(logService);
    }

    addMessage(message: Message): void {
        this.messageStore.addMessage(message);
    }

    public equalsBareJid(other: Recipient | JID): boolean {
        if (other instanceof Contact || isJid(other)) {
            const otherJid = other instanceof Contact ? other.jidBare : other.bare();
            return this.jidBare.equals(otherJid);
        }
        return false;
    }

    isSubscribed(): boolean {
        const subscription = this.subscription$.getValue();
        return subscription === ContactSubscription.both || subscription === ContactSubscription.to;
    }

    isUnaffiliated(): boolean {
        return !this.isSubscribed() && !this.pendingIn$.getValue() && !this.pendingOut$.getValue();
    }

    updateResourcePresence(jid: string, presence: Presence): void {
        const resources = this.resources$.getValue();
        resources.set(jid, presence);
        this.presence$.next(this.determineOverallPresence(resources));
        this.resources$.next(resources);
    }

    getMessageById(id: string): Message | null {
        return this.messageStore.messageIdToMessage.get(id);
    }

    private determineOverallPresence(jidToPresence: JidToPresence): Presence {
        let result = Presence.unavailable;

        [...jidToPresence.values()].some((presence) => {
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

}
