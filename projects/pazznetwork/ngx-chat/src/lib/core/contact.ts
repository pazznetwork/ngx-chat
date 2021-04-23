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

export interface JidToPresence {
    [jid: string]: Presence;
}

export class Contact {

    readonly recipientType = 'contact';
    public avatar = dummyAvatarContact;
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
        return this.messageStore.oldestMessage;
    }

    get mostRecentMessage() {
        return this.messageStore.mostRecentMessage;
    }

    get mostRecentMessageReceived() {
        return this.messageStore.mostRecentMessageReceived;
    }

    get mostRecentMessageSent() {
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

    addMessage(message: Message) {
        this.messageStore.addMessage(message);
    }

    public equalsBareJid(other: Recipient | JID): boolean {
        if (other instanceof Contact || isJid(other)) {
            const otherJid = other instanceof Contact ? other.jidBare : other.bare();
            return this.jidBare.equals(otherJid);
        }
        return false;
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
