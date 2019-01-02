import { Subject } from 'rxjs';
import { LogService } from '../services/log.service';
import { Message } from './message';
import { insertSortedLast } from './utils-array';

export class MessageStore<T extends Message> {

    public messages$: Subject<T>;
    public messages: T[] = [];
    private messageIdToMessage: { [key: string]: T } = {};

    constructor(private logService: LogService) {
        this.messages$ = new Subject<T>();
    }

    addMessage(message: T) {
        if (message.id && this.messageIdToMessage[message.id]) {
            if (this.logService) {
                this.logService.info(`received message but message with id ${message.id} already exists`);
            }
            return false;
        }
        insertSortedLast(message, this.messages, m => m.datetime);
        this.messageIdToMessage[message.id] = message;
        this.messages$.next(message);
        return true;
    }

}
