import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    ElementRef,
    Inject,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Optional,
    QueryList,
    SimpleChanges,
    ViewChild,
    ViewChildren,
} from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, filter, takeUntil } from 'rxjs/operators';
import { Contact } from '../../core/contact';
import { Direction, Message } from '../../core/message';
import { BlockPlugin } from '../../services/adapters/xmpp/plugins/block.plugin';
import { MessageArchivePlugin } from '../../services/adapters/xmpp/plugins/message-archive.plugin';
import { ChatListStateService } from '../../services/chat-list-state.service';
import { ChatMessageListRegistryService } from '../../services/chat-message-list-registry.service';
import { ChatService, ChatServiceToken } from '../../services/chat-service';
import { REPORT_USER_INJECTION_TOKEN, ReportUserService } from '../../services/report-user-service';
import { ChatMessageComponent } from '../chat-message/chat-message.component';

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
export class ChatMessageListComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {

    @Input()
    contact: Contact;

    @Input()
    showAvatars: boolean;

    @ViewChild('messageArea')
    chatMessageAreaElement: ElementRef<HTMLElement>;

    @ViewChildren(ChatMessageComponent)
    chatMessageViewChildrenList: QueryList<ChatMessageComponent>;

    Direction = Direction;
    SubscriptionAction = SubscriptionAction;
    blockPlugin: BlockPlugin;
    subscriptionAction = SubscriptionAction.NO_PENDING_REQUEST;
    onTop$ = new Subject<IntersectionObserverEntry>();

    private ngDestroy = new Subject<void>();
    private isAtBottom = true;
    private oldestVisibleMessageBeforeLoading: Message = null;

    constructor(
        public chatListService: ChatListStateService,
        @Inject(ChatServiceToken) public chatService: ChatService,
        private chatMessageListRegistry: ChatMessageListRegistryService,
        @Optional() @Inject(REPORT_USER_INJECTION_TOKEN) public reportUserService: ReportUserService,
        private changeDetectorRef: ChangeDetectorRef,
    ) {
        this.blockPlugin = this.chatService.getPlugin(BlockPlugin);
    }

    async ngOnInit() {

        this.onTop$
            .pipe(filter(event => event.isIntersecting), debounceTime(1000))
            .subscribe(() => this.loadOlderMessagesBeforeViewport());

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

    async ngAfterViewInit() {
        this.chatMessageViewChildrenList.changes
            .pipe(filter(() => !!this.oldestVisibleMessageBeforeLoading))
            .subscribe(() => {
                this.scrollToMessage(this.oldestVisibleMessageBeforeLoading);
                this.oldestVisibleMessageBeforeLoading = null;
            });

        this.contact.messages$
            .pipe(takeUntil(this.ngDestroy), debounceTime(10))
            .subscribe(() => {
                if (this.isAtBottom) {
                    this.scheduleScrollToLastMessage();
                }
            });

        if (this.contact.messages.length < 10) {
            await this.loadMessages(); // in case insufficient old messages are displayed
        }
        this.scrollToLastMessage();
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
            this.isAtBottom = true; // in some browsers the intersection observer does not emit when scrolling programmatically
        }
    }

    private scrollToMessage(message: Message) {
        if (this.chatMessageAreaElement) {
            const htmlIdAttribute = 'message-' + message.id;
            const messageElement = document.getElementById(htmlIdAttribute);
            messageElement.scrollIntoView(false);
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

    subscriptionActionShown() {
        return this.subscriptionAction === SubscriptionAction.PENDING_REQUEST
            || (this.blockPlugin.supportsBlock$.getValue() === true && this.subscriptionAction === SubscriptionAction.SHOW_BLOCK_ACTIONS);
    }

    async loadOlderMessagesBeforeViewport() {
        if (this.isLoadingHistory()) {
            return;
        }

        try {
            this.oldestVisibleMessageBeforeLoading = this.contact.oldestMessage;
            await this.loadMessages();
        } catch (e) {
            this.oldestVisibleMessageBeforeLoading = null;
        }
    }

    private async loadMessages() {
        try {
            // improve performance when loading lots of old messages
            this.changeDetectorRef.detach();
            await this.chatService.getPlugin(MessageArchivePlugin).loadMostRecentUnloadedMessages(this.contact);
        } finally {
            this.changeDetectorRef.reattach();
        }
    }

    onBottom(event: IntersectionObserverEntry) {
        this.isAtBottom = event.isIntersecting;
    }

    private isLoadingHistory(): boolean {
        return !!this.oldestVisibleMessageBeforeLoading;
    }

}
