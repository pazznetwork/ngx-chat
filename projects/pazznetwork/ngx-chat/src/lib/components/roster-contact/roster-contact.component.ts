import { Component, Inject, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Contact, Presence } from '../../core';
import { UnreadMessageCountPlugin } from '../../services/adapters/xmpp/plugins';
import { ChatService, ChatServiceToken } from '../../services/chat-service';

@Component({
    selector: 'ngx-chat-roster-contact',
    templateUrl: './roster-contact.component.html',
    styleUrls: ['./roster-contact.component.less']
})
export class RosterContactComponent implements OnInit {

    @Input()
    contact: Contact;

    presence = Presence;

    unreadMessageCount$: Observable<number>;

    constructor(@Inject(ChatServiceToken) private chatService: ChatService) {
    }

    ngOnInit() {
        this.unreadMessageCount$ = this.chatService.getPlugin(UnreadMessageCountPlugin).jidToUnreadCount$
            .pipe(
                map(jidToUnreadCount => jidToUnreadCount[this.contact.jidBare.toString()] || 0),
            );
    }

}
