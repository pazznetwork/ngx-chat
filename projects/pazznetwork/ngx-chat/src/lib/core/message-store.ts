import { Subject } from 'rxjs';
import { LogService } from '../services/log.service';
import { Message } from './message';

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
        this.messages.push(message);
        // TODO: insert on correct index via binary search instead of sorting complete list all the time
        this.messages.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
        this.messages$.next(message);
        this.messageIdToMessage[message.id] = message;
        return true;
    }

}
