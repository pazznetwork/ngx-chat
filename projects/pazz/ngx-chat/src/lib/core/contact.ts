import { JID, jid as parseJid } from '@xmpp/jid';
import { Subject } from 'rxjs';
import { dummyAvatar } from './contact-avatar';
import { Message } from './message';

export class Contact {

    public messages$: Subject<Message>;
    public messages: Message[] = [];
    public avatar = dummyAvatar;
    public jidBare: JID;
    public jid: JID;
    private messageIdToMessage: { [key: string]: Message } = {};


    constructor(public jidPlain: string,
                public name: string,
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
            console.log(`message with id ${message.id} already exists`);
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
