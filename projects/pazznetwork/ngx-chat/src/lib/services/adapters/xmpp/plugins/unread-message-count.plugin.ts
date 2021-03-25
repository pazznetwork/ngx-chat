import { xml } from '@xmpp/client';
import { Element } from 'ltx';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { debounceTime, delay, distinctUntilChanged, map, share } from 'rxjs/operators';
import { Contact } from '../../../../core/contact';
import { Direction } from '../../../../core/message';
import { findSortedInsertionIndexLast } from '../../../../core/utils-array';
import { ChatMessageListRegistryService } from '../../../chat-message-list-registry.service';
import { AbstractStanzaBuilder } from '../abstract-stanza-builder';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { EntityTimePlugin } from './entity-time.plugin';
import { PublishSubscribePlugin } from './publish-subscribe.plugin';

const STORAGE_NGX_CHAT_LAST_READ_DATE = 'ngxchat:unreadmessagedate';
const wrapperNodeName = 'entries';
const nodeName = 'last-read';

export interface JidToDate {
    [jid: string]: Date;
}

export interface JidToNumber {
    [jid: string]: number;
}

class LastReadEntriesNodeBuilder extends AbstractStanzaBuilder {

    private lastReadNodes = [] as Element[];

    addLastReadNode(jid: string, date: string) {
        this.lastReadNodes.push(
            xml(nodeName, {jid, date}),
        );
    }

    toStanza(): Element {
        return xml(wrapperNodeName, {}, this.lastReadNodes);
    }

}

/**
 * Unofficial plugin using XEP-0163 / PubSub to track count of unread messages per contact
 *
 * It publishes entries to a private PubSub-Node 'ngxchat:unreadmessagedate'
 * The stored elements look like this:
 * <item id="current">
 *     <entries>
 *         <last-read jid="user1@host1.tld" date="1546419050584"/>
 *         <last-read jid="user2@host1.tld" date="1546419050000"/>
 *     </entries>
 * </item>
 */
export class UnreadMessageCountPlugin extends AbstractXmppPlugin {

    /**
     * already debounced to prevent the issues described in {@link UnreadMessageCountPlugin.jidToUnreadCount$}.
     */
    public unreadMessageCountSum$: Observable<number>;
    /**
     * emits as soon as the unread message count changes, you might want to debounce it with e.g. half a a second, as
     * new messages might be acknowledged in another session.
     */
    public jidToUnreadCount$: BehaviorSubject<JidToNumber> = new BehaviorSubject({});
    private jidToLastReadDate: JidToDate = {};
    private contactIdToMessageSubscription = new Map<string, Subscription>();

    constructor(
        private chatService: XmppChatAdapter,
        private chatMessageListRegistry: ChatMessageListRegistryService,
        private publishSubscribePlugin: PublishSubscribePlugin,
        private entityTimePlugin: EntityTimePlugin,
    ) {
        super();

        this.chatMessageListRegistry.chatOpened$
            .pipe(
                delay(0), // prevent 'Expression has changed after it was checked'
            )
            .subscribe(contact => this.checkForUnreadCountChange(contact));

        this.chatService.contactCreated$
            .subscribe(contact => {
                const jid = contact.jidBare.toString();
                if (!this.contactIdToMessageSubscription.has(jid)) {
                    this.contactIdToMessageSubscription.set(jid,
                        contact.messages$
                            .pipe(debounceTime(20))
                            .subscribe(() => this.checkForUnreadCountChange(contact)),
                    );
                }
            });

        this.publishSubscribePlugin.publish$
            .subscribe((event) => this.handlePubSubEvent(event));

        this.unreadMessageCountSum$ = combineLatest([this.jidToUnreadCount$, this.chatService.notBlockedContacts$])
            .pipe(
                debounceTime(20),
                map(([jidToUnreadCount, notBlockedContacts]) => {
                    let sum = 0;
                    for (const contact of notBlockedContacts) {
                        const unreadMessageCount = jidToUnreadCount[contact.jidBare.toString()] ?? 0;
                        sum += unreadMessageCount;
                    }
                    return sum;
                }),
                distinctUntilChanged(),
                share(),
            );
    }

    private async checkForUnreadCountChange(contact: Contact) {
        if (this.chatMessageListRegistry.isChatOpen(contact)) {
            this.jidToLastReadDate[contact.jidBare.toString()] = new Date(await this.entityTimePlugin.getNow());
            this.persistLastSeenDates();
        }
        this.updateContactUnreadMessageState(contact);
    }

    async onBeforeOnline(): Promise<any> {
        this.jidToLastReadDate = await this.fetchLastSeenDates();
        for (const jid of Object.keys(this.jidToLastReadDate)) {
            const contact = this.chatService.getOrCreateContactById(jid);
            this.updateContactUnreadMessageState(contact);
        }
    }

    onOffline() {
        for (const subscription of this.contactIdToMessageSubscription.values()) {
            subscription.unsubscribe();
        }
        this.contactIdToMessageSubscription.clear();
        this.jidToUnreadCount$.next({});
    }

    private async fetchLastSeenDates(): Promise<JidToDate> {
        const entries = await this.publishSubscribePlugin.retrieveNodeItems(STORAGE_NGX_CHAT_LAST_READ_DATE);
        return this.parseLastSeenDates(entries);
    }

    private parseLastSeenDates(topLevelElements: Element[]): JidToDate {
        const result: JidToDate = {};

        if (topLevelElements.length === 1) {
            const [itemElement] = topLevelElements;
            for (const lastReadEntry of itemElement.getChild(wrapperNodeName).getChildren(nodeName)) {
                const {jid, date} = lastReadEntry.attrs;
                const parsedDate = new Date(+date);
                if (!isNaN(parsedDate.getTime())) {
                    result[jid] = parsedDate;
                }
            }
        }

        return result;
    }

    updateContactUnreadMessageState(contact: Contact) {
        const contactJid = contact.jidBare.toString();
        const lastReadDate = this.jidToLastReadDate[contactJid] || new Date(0);
        const contactUnreadMessageCount = this.calculateUnreadMessageCount(contact, lastReadDate);
        const jidToCount = this.jidToUnreadCount$.getValue();

        if (jidToCount[contactJid] !== contactUnreadMessageCount) {
            jidToCount[contactJid] = contactUnreadMessageCount;
            this.jidToUnreadCount$.next(jidToCount);
        }
    }

    private calculateUnreadMessageCount(contact: Contact, lastReadDate: Date) {
        const firstUnreadMessageIndex = findSortedInsertionIndexLast(lastReadDate, contact.messages, message => message.datetime);
        return contact.messages.slice(firstUnreadMessageIndex)
            .filter(message => message.direction === Direction.in)
            .length;
    }

    private persistLastSeenDates() {
        const lastReadNodeBuilder = new LastReadEntriesNodeBuilder();
        for (const jid in this.jidToLastReadDate) {
            if (this.jidToLastReadDate.hasOwnProperty(jid)) {
                const date = this.jidToLastReadDate[jid].getTime().toString();
                lastReadNodeBuilder.addLastReadNode(jid, date);
            }
        }

        this.publishSubscribePlugin.storePrivatePayloadPersistent(
            STORAGE_NGX_CHAT_LAST_READ_DATE,
            'current',
            lastReadNodeBuilder.toStanza());
    }

    private handlePubSubEvent(event: Element) {
        const items = event.getChild('items');
        const itemsNode = items && items.attrs.node;
        const item = items && items.getChildren('item');
        if (itemsNode === STORAGE_NGX_CHAT_LAST_READ_DATE && item) {
            const publishedLastJidToDate = this.parseLastSeenDates(item);
            this.mergeJidToDates(publishedLastJidToDate);
        }
    }

    private mergeJidToDates(newJidToDate: JidToDate) {
        for (const jid in newJidToDate) {
            if (!this.jidToLastReadDate[jid] || this.jidToLastReadDate[jid] < newJidToDate[jid]) {
                this.jidToLastReadDate[jid] = newJidToDate[jid];
                this.updateContactUnreadMessageState(this.chatService.getOrCreateContactById(jid));
            }
        }
    }
}
