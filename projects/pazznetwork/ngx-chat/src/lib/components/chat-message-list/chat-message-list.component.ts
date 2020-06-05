import { Component, ElementRef, Inject, Input, OnChanges, OnDestroy, OnInit, Optional, SimpleChanges, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { Contact } from '../../core/contact';
import { Direction } from '../../core/message';
import { BlockPlugin } from '../../services/adapters/xmpp/plugins/block.plugin';
import { ChatListStateService } from '../../services/chat-list-state.service';
import { ChatMessageListRegistryService } from '../../services/chat-message-list-registry.service';
import { ChatService, ChatServiceToken } from '../../services/chat-service';
import { REPORT_USER_INJECTION_TOKEN, ReportUserService } from '../../services/report-user-service';

enum SubscriptionAction {
    PENDING_REQUEST,
    SHOW_BLOCK_ACTIONS,
    NO_PENDING_REQUEST,
}

@Component({
    selector: 'ngx-chat-message-list',
    templateUrl: './chat-message-list.component.html',
    styleUrls: ['./chat-message-list.component.less'],
})
export class ChatMessageListComponent implements OnInit, OnDestroy, OnChanges {

    @Input()
    contact: Contact;

    @Input()
    showAvatars: boolean;

    @ViewChild('messageArea')
    chatMessageAreaElement: ElementRef<HTMLElement>;

    Direction = Direction;
    SubscriptionAction = SubscriptionAction;
    blockPlugin: BlockPlugin;
    subscriptionAction = SubscriptionAction.NO_PENDING_REQUEST;

    private ngDestroy = new Subject<void>();

    constructor(
        public chatListService: ChatListStateService,
        @Inject(ChatServiceToken) public chatService: ChatService,
        private chatMessageListRegistry: ChatMessageListRegistryService,
        @Optional() @Inject(REPORT_USER_INJECTION_TOKEN) public reportUserService: ReportUserService,
    ) {
        this.blockPlugin = this.chatService.getPlugin(BlockPlugin);
    }

    ngOnInit() {
        this.contact.messages$
            .pipe(takeUntil(this.ngDestroy))
            .subscribe(() => this.scheduleScrollToLastMessage());

        this.contact.pendingIn$
            .pipe(
                filter(pendingIn => pendingIn === true),
                takeUntil(this.ngDestroy),
            ).subscribe(() => {
                this.subscriptionAction = SubscriptionAction.PENDING_REQUEST;
                this.scheduleScrollToLastMessage();
            });

        this.chatMessageListRegistry.incrementOpenWindowCount(this.contact);
    }

    ngOnChanges(changes: SimpleChanges): void {
        const contact = changes.contact;

        if (contact && contact.previousValue && contact.currentValue) {
            this.chatMessageListRegistry.decrementOpenWindowCount(contact.previousValue);
            this.chatMessageListRegistry.incrementOpenWindowCount(contact.currentValue);
        }

        if (contact && contact.currentValue) {
            this.scheduleScrollToLastMessage();
        }
    }

    ngOnDestroy(): void {
        this.ngDestroy.next();
        this.chatMessageListRegistry.decrementOpenWindowCount(this.contact);
    }

    acceptSubscriptionRequest(event: Event) {
        event.preventDefault();
        if (this.subscriptionAction === SubscriptionAction.PENDING_REQUEST) {
            this.chatService.addContact(this.contact.jidBare.toString());
            this.subscriptionAction = SubscriptionAction.NO_PENDING_REQUEST;
            this.scheduleScrollToLastMessage();
        }
    }

    denySubscriptionRequest(event: Event) {
        event.preventDefault();
        if (this.subscriptionAction === SubscriptionAction.PENDING_REQUEST) {
            this.chatService.removeContact((this.contact.jidBare.toString()));
            this.subscriptionAction = SubscriptionAction.SHOW_BLOCK_ACTIONS;
            this.scheduleScrollToLastMessage();
        }
    }

    private scheduleScrollToLastMessage() {
        setTimeout(() => this.scrollToLastMessage(), 0);
    }

    private scrollToLastMessage() {
        if (this.chatMessageAreaElement) {
            this.chatMessageAreaElement.nativeElement.scrollTop = this.chatMessageAreaElement.nativeElement.scrollHeight;
        }
    }

    blockContact($event: MouseEvent) {
        $event.preventDefault();
        this.blockPlugin.blockJid(this.contact.jidBare.toString());
        this.chatListService.closeChat(this.contact);
        this.subscriptionAction = SubscriptionAction.NO_PENDING_REQUEST;
    }

    blockContactAndReport($event: MouseEvent) {
        $event.preventDefault();
        this.reportUserService.reportUser(this.contact);
        this.blockContact($event);
    }

    dismissOptions($event: MouseEvent) {
        $event.preventDefault();
        this.subscriptionAction = SubscriptionAction.NO_PENDING_REQUEST;
    }
}
