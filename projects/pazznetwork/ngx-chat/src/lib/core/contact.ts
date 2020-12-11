import { jid as parseJid } from '@xmpp/client';
import { JID } from '@xmpp/jid';
import { BehaviorSubject, Subject } from 'rxjs';
import { LogService } from '../services/log.service';
import { dummyAvatar } from './contact-avatar';
import { Direction, Message } from './message';
import { DateMessagesGroup, MessageStore } from './message-store';
import { Presence } from './presence';
import { ContactSubscription } from './subscription';
import { findLast } from './utils-array';

export interface ContactMetadata {
    [key: string]: any;
}

export interface JidToPresence {
    [jid: string]: Presence;
}

export class Contact {

    public avatar = dummyAvatar;
    public metadata: ContactMetadata = {};

    /** use {@link jidBare}, jid resource is only set for chat room contacts */
    public jidFull: JID;
    public jidBare: JID;
    public presence$ = new BehaviorSubject<Presence>(Presence.unavailable);
    public subscription$ = new BehaviorSubject<ContactSubscription>(ContactSubscription.none);
    public pendingOut$ = new BehaviorSubject(false);
    public pendingIn$ = new BehaviorSubject(false);
    public resources$ = new BehaviorSubject<JidToPresence>({});

    private messageStore: MessageStore<Message>;

    get messages$(): Subject<Message> {
        return this.messageStore.messages$;
    }

    get messages(): Message[] {
        return this.messageStore.messages;
    }

    get dateMessagesGroups(): DateMessagesGroup<Message>[] {
        return this.messageStore.dateMessageGroups;
    }

    get oldestMessage() {
        return this.messageStore.messages[0];
    }

    get mostRecentMessage() {
        return this.messageStore.messages[this.messageStore.messages.length - 1];
    }

    get mostRecentMessageReceived() {
        return findLast(this.messageStore.messages, msg => msg.direction === Direction.in);
    }

    get mostRecentMessageSent() {
        return findLast(this.messageStore.messages, msg => msg.direction === Direction.out);
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

    addMessage(message: Message) {
        this.messageStore.addMessage(message);
    }

    public equalsBareJid(other: Contact | JID) {
        const otherJid = other instanceof Contact ? other.jidBare : other.bare();
        return this.jidBare.equals(otherJid);
    }

    isSubscribed() {
        const subscription = this.subscription$.getValue();
        return subscription === ContactSubscription.both || subscription === ContactSubscription.to;
    }

    isUnaffiliated() {
        return !this.isSubscribed() && !this.pendingIn$.getValue() && !this.pendingOut$.getValue();
    }

    updateResourcePresence(jid: string, presence: Presence) {
        const resources = this.resources$.getValue();
        resources[jid] = presence;
        this.presence$.next(this.reducePresences(resources));
        this.resources$.next(resources);
    }

    getMessageById(id: string) {
        return this.messageStore.messageIdToMessage[id];
    }

    private reducePresences(jidToPresence: JidToPresence): Presence {
        let result = Presence.unavailable;
        for (const jid in jidToPresence) {
            if (jidToPresence.hasOwnProperty(jid)) {
                const presence = jidToPresence[jid];
                if (presence === Presence.present) {
                    return presence;
                } else if (presence === Presence.away) {
                    result = Presence.away;
                }
            }
        }
        return result;
    }

}
