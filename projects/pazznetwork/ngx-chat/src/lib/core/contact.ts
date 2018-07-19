import { JID, jid as parseJid } from '@xmpp/jid';
import { BehaviorSubject, Subject } from 'rxjs';
import { LogService } from '../services/log.service';
import { dummyAvatar } from './contact-avatar';
import { Message } from './message';
import { Presence } from './presence';
import { ContactSubscription } from './subscription';

export interface ContactMetadata {
    [key: string]: any;
}

export class Contact {

    public avatar = dummyAvatar;
    public metadata: ContactMetadata = {};

    public messages$: Subject<Message>;
    public messages: Message[] = [];
    private messageIdToMessage: { [key: string]: Message } = {};

    public jidBare: JID;
    public presence$ = new BehaviorSubject<Presence>(Presence.unavailable);
    public subscription$ = new BehaviorSubject<ContactSubscription>(ContactSubscription.none);
    public pendingOut = false;
    public pendingIn = false;

    /**
     * Do not call directly, use {@link ContactFactoryService#createContact} instead.
     * @deprecated
     */
    constructor(jidPlain: string,
                public name: string,
                private logService: LogService,
                avatar?: string) {
        this.messages$ = new Subject();
        if (avatar) {
            this.avatar = avatar;
        }
        this.jidBare = parseJid(jidPlain).bare();
    }

    appendMessage(message: Message) {
        if (message.id && this.messageIdToMessage[message.id]) {
            this.logService.debug(`message with id ${message.id} already exists`);
            return false;
        }
        this.messages.push(message);
        this.messages$.next(message);
        this.messageIdToMessage[message.id] = message;
        return true;
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
