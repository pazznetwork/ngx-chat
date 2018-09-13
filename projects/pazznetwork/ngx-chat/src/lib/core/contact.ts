import { JID, jid as parseJid } from '@xmpp/jid';
import { BehaviorSubject, Subject } from 'rxjs';
import { LogService } from '../services/log.service';
import { dummyAvatar } from './contact-avatar';
import { Message } from './message';
import { MessageStore } from './message-store';
import { Presence } from './presence';
import { ContactSubscription } from './subscription';

export interface ContactMetadata {
    [key: string]: any;
}

export class Contact {

    public avatar = dummyAvatar;
    public metadata: ContactMetadata = {};

    public jidBare: JID;
    public presence$ = new BehaviorSubject<Presence>(Presence.unavailable);
    public subscription$ = new BehaviorSubject<ContactSubscription>(ContactSubscription.none);
    public pendingOut = false;
    public pendingIn = false;

    private messageStore: MessageStore<Message>;

    get messages$(): Subject<Message> {
        return this.messageStore.messages$;
    }

    get messages() {
        return this.messageStore.messages;
    }

    /**
     * Do not call directly, use {@link ContactFactoryService#createContact} instead.
     * @deprecated
     */
    constructor(jidPlain: string,
                public name: string,
                logService?: LogService,
                avatar?: string) {
        if (avatar) {
            this.avatar = avatar;
        }
        this.jidBare = parseJid(jidPlain).bare();
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

}
