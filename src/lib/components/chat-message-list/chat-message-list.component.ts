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
import { Observable, Subject } from 'rxjs';
import { debounceTime, filter, takeUntil } from 'rxjs/operators';
import { Direction, Message } from '../../core/message';
import { Recipient } from '../../core/recipient';
import { BlockPlugin } from '../../services/adapters/xmpp/plugins/block.plugin';
import { MessageArchivePlugin } from '../../services/adapters/xmpp/plugins/message-archive.plugin';
import { ChatListStateService } from '../../services/chat-list-state.service';
import { ChatMessageListRegistryService } from '../../services/chat-message-list-registry.service';
import { CHAT_SERVICE_TOKEN, ChatService } from '../../services/chat-service';
import { ContactFactoryService } from '../../services/contact-factory.service';
import { REPORT_USER_INJECTION_TOKEN, ReportUserService } from '../../services/report-user-service';
import { ChatMessageComponent } from '../chat-message/chat-message.component';
import { RoomMessage } from '../../services/adapters/xmpp/plugins/multi-user-chat/room-message';
import { MultiUserChatPlugin } from '../../services/adapters/xmpp/plugins/multi-user-chat/multi-user-chat.plugin';
import { Contact } from '../../core/contact';

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
    recipient: Recipient;

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
    private bottomLeftAt = 0;
    private oldestVisibleMessageBeforeLoading: Message = null;
    private pendingRoomInvite = false;

    constructor(
        public chatListService: ChatListStateService,
        @Inject(CHAT_SERVICE_TOKEN) public chatService: ChatService,
        private chatMessageListRegistry: ChatMessageListRegistryService,
        @Optional() @Inject(REPORT_USER_INJECTION_TOKEN) public reportUserService: ReportUserService,
        private changeDetectorRef: ChangeDetectorRef,
        private contactFactory: ContactFactoryService,
    ) {
        this.blockPlugin = this.chatService.getPlugin(BlockPlugin);
    }

    async ngOnInit() {

        this.onTop$
            .pipe(filter(event => event.isIntersecting), debounceTime(1000))
            .subscribe(() => this.loadOlderMessagesBeforeViewport());

        if (this.recipient.recipientType === 'contact') {
            this.recipient.pendingIn$
                .pipe(
                    filter(pendingIn => pendingIn === true),
                    takeUntil(this.ngDestroy),
                )
                .subscribe(() => {
                    this.subscriptionAction = SubscriptionAction.PENDING_REQUEST;
                    this.scheduleScrollToLastMessage();
                });

            this.recipient.pendingRoomInvite$
                .pipe(
                    filter(invite => invite === true),
                    takeUntil(this.ngDestroy),
                ).subscribe(() => {
                this.pendingRoomInvite = true;
            });
        }

        this.chatMessageListRegistry.incrementOpenWindowCount(this.recipient);
    }

    async ngAfterViewInit() {
        this.chatMessageViewChildrenList.changes
            .subscribe(() => {
                if (this.oldestVisibleMessageBeforeLoading) {
                    this.scrollToMessage(this.oldestVisibleMessageBeforeLoading);
                }
                this.oldestVisibleMessageBeforeLoading = null;
            });

        const messages$: Observable<Message> = this.recipient.messages$;
        messages$
            .pipe(
                debounceTime(10),
                filter(() => this.isNearBottom()),
                takeUntil(this.ngDestroy),
            )
            .subscribe((_) => this.scheduleScrollToLastMessage());

        if (this.recipient.messages.length < 10) {
            await this.loadMessages(); // in case insufficient old messages are displayed
        }
        this.scheduleScrollToLastMessage();
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
        this.chatMessageListRegistry.decrementOpenWindowCount(this.recipient);
    }

    acceptSubscriptionRequest(event: Event) {
        event.preventDefault();
        if (this.subscriptionAction === SubscriptionAction.PENDING_REQUEST) {
            this.chatService.addContact(this.recipient.jidBare.toString());
            this.subscriptionAction = SubscriptionAction.NO_PENDING_REQUEST;
            this.scheduleScrollToLastMessage();
        }
    }

    denySubscriptionRequest(event: Event) {
        event.preventDefault();
        if (this.subscriptionAction === SubscriptionAction.PENDING_REQUEST) {
            this.chatService.removeContact(this.recipient.jidBare.toString());
            this.subscriptionAction = SubscriptionAction.SHOW_BLOCK_ACTIONS;
            this.scheduleScrollToLastMessage();
        }
    }

    scheduleScrollToLastMessage() {
        setTimeout(() => this.scrollToLastMessage(), 0);
    }

    blockContact($event: MouseEvent) {
        $event.preventDefault();
        this.blockPlugin.blockJid(this.recipient.jidBare.toString());
        this.chatListService.closeChat(this.recipient);
        this.subscriptionAction = SubscriptionAction.NO_PENDING_REQUEST;
    }

    blockContactAndReport($event: MouseEvent) {
        if (this.recipient.recipientType !== 'contact') {
            return;
        }
        $event.preventDefault();
        this.reportUserService.reportUser(this.recipient);
        this.blockContact($event);
    }

    dismissBlockOptions($event: MouseEvent) {
        $event.preventDefault();
        this.subscriptionAction = SubscriptionAction.NO_PENDING_REQUEST;
    }

    subscriptionActionShown() {
        if (this.recipient.recipientType !== 'contact') {
            return false;
        }
        return this.subscriptionAction === SubscriptionAction.PENDING_REQUEST
            || (this.blockPlugin.supportsBlock$.getValue() === true && this.subscriptionAction === SubscriptionAction.SHOW_BLOCK_ACTIONS);
    }

    async loadOlderMessagesBeforeViewport() {
        if (this.isLoadingHistory() || this.isNearBottom()) {
            return;
        }

        try {
            this.oldestVisibleMessageBeforeLoading = this.recipient.oldestMessage;
            await this.loadMessages();
        } catch (e) {
            this.oldestVisibleMessageBeforeLoading = null;
        }
    }

    onBottom(event: IntersectionObserverEntry) {
        this.isAtBottom = event.isIntersecting;

        if (event.isIntersecting) {
            this.isAtBottom = true;
        } else {
            this.isAtBottom = false;
            this.bottomLeftAt = Date.now();
        }
    }

    getOrCreateContactWithFullJid(message: Message | RoomMessage): Recipient {
        if (this.recipient.recipientType === 'contact') {
            // this is not a multi user chat, just use recipient as contact
            return this.recipient;
        }

        const roomMessage = message as RoomMessage;

        let matchingContact = this.chatService.contacts$.getValue().find(
            contact => contact.jidFull.equals(roomMessage.from),
        );

        if (!matchingContact) {
            matchingContact = this.contactFactory.createContact(roomMessage.from.toString(), roomMessage.from.resource);
            this.chatService.contacts$.next([matchingContact].concat(this.chatService.contacts$.getValue()));
        }

        return matchingContact;
    }

    showPendingRoomInvite() {
        if (this.recipient.recipientType !== 'contact') {
            return false;
        }
        return this.pendingRoomInvite;
    }

    async acceptRoomInvite(event: MouseEvent) {
        event.preventDefault();
        await this.chatService.getPlugin(MultiUserChatPlugin).joinRoom(this.recipient.jidBare);
        (this.recipient as Contact).pendingRoomInvite$.next(false);
        this.pendingRoomInvite = false;
    }

    async declineRoomInvite(event: MouseEvent) {
        event.preventDefault();
        await this.chatService.getPlugin(MultiUserChatPlugin).declineRoomInvite(this.recipient.jidBare);
        (this.recipient as Contact).pendingRoomInvite$.next(false);
        this.pendingRoomInvite = false;
        this.chatService.removeContact(this.recipient.jidBare.toString());
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

    private async loadMessages() {
        try {
            // improve performance when loading lots of old messages
            this.changeDetectorRef.detach();
            await this.chatService.getPlugin(MessageArchivePlugin).loadMostRecentUnloadedMessages(this.recipient);
        } finally {
            this.changeDetectorRef.reattach();
        }
    }

    private isNearBottom() {
        return this.isAtBottom || Date.now() - this.bottomLeftAt < 1000;
    }

    private isLoadingHistory(): boolean {
        return !!this.oldestVisibleMessageBeforeLoading;
    }
}
