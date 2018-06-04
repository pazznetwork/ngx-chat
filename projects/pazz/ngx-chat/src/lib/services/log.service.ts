import { Injectable } from '@angular/core';

@Injectable()
export class LogService {

    private readonly enableLogging = true;

    constructor() {
    }

    public warn(...messages: any[]) {
        if (this.enableLogging) {
            console.warn('ChatService:', ...messages);
        }
    }

    public error(...messages: any[]) {
        if (this.enableLogging) {
            console.error('ChatService:', ...messages);
        }
    }

    public debug(...messages: any[]) {
        if (this.enableLogging) {
            console.log('ChatService:', ...messages);
        }
    }


}
