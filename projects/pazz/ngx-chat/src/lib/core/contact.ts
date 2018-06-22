import { JID, jid as parseJid } from '@xmpp/jid';
import { Subject } from 'rxjs';
import { LogService } from '../services/log.service';
import { dummyAvatar } from './contact-avatar';
import { Message } from './message';

export interface ContactMetadata {
    [key: string]: any;
}

export class Contact {

    public messages$: Subject<Message>;
    public messages: Message[] = [];
    public avatar = dummyAvatar;
    public jidBare: JID;
    public jid: JID;
    public metadata: ContactMetadata = {};
    private messageIdToMessage: { [key: string]: Message } = {};

    /**
     * Do not call directly, use {@link ContactFactoryService#createContact} instead.
     * @deprecated
     */
    constructor(public readonly jidPlain: string,
                public name: string,
                private logService: LogService,
                avatar?: string) {
        this.messages$ = new Subject();
        if (avatar) {
            this.avatar = avatar;
        }
        this.jid = parseJid(jidPlain);
        this.jidBare = this.jid.bare();
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

    public equalsBareJid(other: Contact) {
        return this.jidBare.equals(other.jidBare);
    }
}
