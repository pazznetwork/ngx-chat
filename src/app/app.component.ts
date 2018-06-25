import { Component, Inject } from '@angular/core';
import { filter, first } from 'rxjs/operators';
import { ChatService, ChatServiceToken, ContactFactoryService } from './ngx-chat-imports';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {

    public domain: string;
    public uri: string;
    public password: string;
    public jid: string;
    public otherJid: any;

    constructor(@Inject(ChatServiceToken) private chatService: ChatService, private contactFactory: ContactFactoryService) {
        const contactData: any = JSON.parse(localStorage.getItem('data')) || {};
        this.domain = contactData.domain;
        this.uri = contactData.uri;
        this.password = contactData.password;
        this.jid = contactData.jid;
    }

    onLogin() {
        const logInRequest = {
            domain: this.domain,
            uri: this.uri,
            password: this.password,
            jid: this.jid,
        };
        localStorage.setItem('data', JSON.stringify(logInRequest));

        this.chatService.logIn(logInRequest);

        // either: set contacts explicitly
        this.chatService.setContacts([
            this.contactFactory.createContact('user@host', 'user1'),
            this.contactFactory.createContact('user2@host', 'user2'),
        ]);

        // or: fetch the contact list from the server
        this.chatService.state$.pipe(
            filter(state => state === 'online'),
            first()
        ).subscribe(() => {
            this.chatService.reloadContacts();
        });
    }

    onLogout() {
        this.chatService.logOut();
    }


    onAddContact() {
        this.chatService.addContact(this.otherJid);
    }

    onRemoveContact() {
        this.chatService.removeContact(this.otherJid);
    }

}
