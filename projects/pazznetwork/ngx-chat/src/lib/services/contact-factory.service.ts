import { Injectable } from '@angular/core';
import { Contact } from '../core';
import { LogService } from './log.service';

@Injectable()
export class ContactFactoryService {

    constructor(private logService: LogService) { }

    createContact(jidPlain: string,
                  name?: string,
                  avatar?: string) {
        if (!name) {
            name = jidPlain;
        }
        return new Contact(jidPlain, name, this.logService, avatar);
    }

}
