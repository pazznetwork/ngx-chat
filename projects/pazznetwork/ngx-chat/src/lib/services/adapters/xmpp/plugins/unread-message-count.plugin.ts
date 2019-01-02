import { x as xml } from '@xmpp/xml';
import { Element } from 'ltx';
import { BehaviorSubject, Observable } from 'rxjs';
import { delay, filter, map, share } from 'rxjs/operators';
import { Contact } from '../../../../core';
import { findSortedInsertionIndexLast } from '../../../../core/utils-array';
import { extractValues, sum } from '../../../../core/utils-object';
import { ChatMessageListRegistryService } from '../../../chat-message-list-registry.service';
import { AbstractStanzaBuilder } from '../abstract-stanza-builder';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { PublishSubscribePlugin } from './publish-subscribe.plugin';

const STORAGE_NGX_CHAT_LAST_CLIENTS = 'ngxchat:unreadmessagedate';
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
            xml(nodeName, {jid, date})
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

    public unreadMessageCountSum$: Observable<number>;
    public jidToUnreadCount$: BehaviorSubject<JidToNumber> = new BehaviorSubject({});
    private jidToLastReadDate: JidToDate = {};

    constructor(private chatService: XmppChatAdapter,
                private chatMessageListRegistry: ChatMessageListRegistryService,
                private publishSubscribePlugin: PublishSubscribePlugin,
    ) {
        super();

        this.chatMessageListRegistry.openChats$
            .pipe(
                filter(() => this.chatService.state$.getValue() === 'online'),
                delay(0), // prevent 'Expression has changed after it was checked'
            )
            .subscribe(contacts => {
                contacts.forEach(contact => {
                    this.jidToLastReadDate[contact.jidBare.toString()] = new Date();
                    this.updateContactUnreadMessageState(contact);
                });
                this.persistLastSeenDates();
            });

        this.chatService.message$
            .pipe(
                filter(() => this.chatService.state$.getValue() === 'online')
            )
            .subscribe(contact => {
                if (this.chatMessageListRegistry.isChatOpen(contact)) {
                    this.jidToLastReadDate[contact.jidBare.toString()] = new Date();
                    this.persistLastSeenDates();
                }
                this.updateContactUnreadMessageState(contact);
            });

        this.unreadMessageCountSum$ = this.jidToUnreadCount$.pipe(
            map(jidToCount => sum(extractValues(jidToCount))),
            share()
        );
    }

    async onBeforeOnline(): Promise<any> {
        this.jidToLastReadDate = await this.fetchLastSeenDates();
        for (const jid of Object.keys(this.jidToLastReadDate)) {
            const contact = this.chatService.getOrCreateContactById(jid);
            this.updateContactUnreadMessageState(contact);
        }
    }

    private async fetchLastSeenDates(): Promise<JidToDate> {
        const entries = await this.publishSubscribePlugin.retrieveNodeItems(STORAGE_NGX_CHAT_LAST_CLIENTS);

        const result: JidToDate = {};

        if (entries.length === 1) {
            for (const lastReadEntry of entries[0].getChild(wrapperNodeName).getChildren(nodeName)) {
                const {jid, date} = lastReadEntry.attrs;
                const parsedDate = new Date(+date);
                if (!isNaN(parsedDate.getTime())) {
                    result[jid] = parsedDate;
                }
            }
        }

        return result;
    }

    onOffline() {
        this.jidToUnreadCount$.next({});
    }

    updateContactUnreadMessageState(contact: Contact) {
        const contactJid = contact.jidBare.toString();
        const date = this.jidToLastReadDate[contactJid] || new Date(0);
        const contactUnreadMessageCount = this.calculateUnreadMessageCount(contact, date);
        const jidToCount = this.jidToUnreadCount$.getValue();

        if (jidToCount[contactJid] !== contactUnreadMessageCount) {
            jidToCount[contactJid] = contactUnreadMessageCount;
            this.jidToUnreadCount$.next(jidToCount);
        }
    }

    private calculateUnreadMessageCount(contact: Contact, date: Date) {
        return contact.messages.length - findSortedInsertionIndexLast(date, contact.messages, message => message.datetime);
    }

    private persistLastSeenDates() {
        const lastReadNodeBuilder = new LastReadEntriesNodeBuilder();
        for (const jid in this.jidToLastReadDate) {
            if (this.jidToLastReadDate.hasOwnProperty(jid)) {
                const date = this.jidToLastReadDate[jid].getTime().toString();
                lastReadNodeBuilder.addLastReadNode(jid, date);
            }
        }

        this.publishSubscribePlugin.publishPrivate(STORAGE_NGX_CHAT_LAST_CLIENTS, 'current', lastReadNodeBuilder.toStanza());
    }

}
