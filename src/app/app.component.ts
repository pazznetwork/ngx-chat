import { Component, Inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { filter, first } from 'rxjs/operators';
import { ChatService, ChatServiceToken, Contact, ContactFactoryService } from './ngx-chat-imports';

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
    public contacts: Observable<Contact[]> = this.chatService.contactsSubscribed$;

    constructor(@Inject(ChatServiceToken) public chatService: ChatService,
                private contactFactory: ContactFactoryService) {
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

        this.chatService.state$.pipe(
            filter(state => state === 'online'),
            first()
        ).subscribe(() => {
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

    onToggleContactList() {
        if (this.contacts === this.chatService.contactsSubscribed$) {
            this.contacts = of([
                this.contactFactory.createContact('user@host', 'user1'),
                this.contactFactory.createContact('user2@host', 'user2'),
            ]);
        } else {
            this.contacts = this.chatService.contactsSubscribed$;
        }
    }
}
