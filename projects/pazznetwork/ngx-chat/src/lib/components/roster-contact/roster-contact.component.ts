import { Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { Contact, Presence } from '../../core';
import { UnreadMessageCountPlugin } from '../../services/adapters/xmpp/plugins';
import { ChatService, ChatServiceToken } from '../../services/chat-service';

@Component({
    selector: 'ngx-chat-roster-contact',
    templateUrl: './roster-contact.component.html',
    styleUrls: ['./roster-contact.component.less']
})
export class RosterContactComponent implements OnInit, OnDestroy {

    @Input()
    contact: Contact;

    presence = Presence;

    unreadCount = 0;

    private ngDestroy = new Subject<void>();

    constructor(@Inject(ChatServiceToken) private chatService: ChatService) {
    }

    ngOnInit() {
        this.chatService.getPlugin(UnreadMessageCountPlugin).jidToUnreadCount$
            .pipe(
                map(jidToUnreadCount => jidToUnreadCount[this.contact.jidBare.toString()] || 0),
                distinctUntilChanged(),
                debounceTime(500),
                takeUntil(this.ngDestroy),
            ).subscribe(unreadCount => this.unreadCount = unreadCount);
    }

    ngOnDestroy(): void {
        this.ngDestroy.next();
        this.ngDestroy.complete();
    }

}
