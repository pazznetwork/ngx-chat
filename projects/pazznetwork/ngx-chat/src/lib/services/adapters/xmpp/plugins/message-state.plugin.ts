import { jid as parseJid, xml } from '@xmpp/client';
import { JID } from '@xmpp/jid';
import { Element } from 'ltx';
import { filter } from 'rxjs/operators';
import { Direction, Message, MessageState } from '../../../../core/message';
import { MessageWithBodyStanza, Stanza } from '../../../../core/stanza';
import { ChatMessageListRegistryService } from '../../../chat-message-list-registry.service';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { EntityTimePlugin } from './entity-time.plugin';
import { MessageUuidPlugin } from './message-uuid.plugin';
import { MessageReceivedEvent } from './message.plugin';
import { PublishSubscribePlugin } from './publish-subscribe.plugin';

export interface StateDate {
    lastRecipientReceived: Date;
    lastRecipientSeen: Date;
    lastSent: Date;
}

export interface JidToMessageStateDate {
    [jid: string]: StateDate;
}

const STORAGE_NGX_CHAT_CONTACT_MESSAGE_STATES = 'ngxchat:contactmessagestates';
const wrapperNodeName = 'entries';
const nodeName = 'contact-message-state';

/**
 * Plugin using PubSub to persist message read states.
 */
export class MessageStatePlugin extends AbstractXmppPlugin {

    private jidToMessageStateDate: JidToMessageStateDate = {};

    constructor(
        private publishSubscribePlugin: PublishSubscribePlugin,
        private xmppChatAdapter: XmppChatAdapter,
        private chatMessageListRegistry: ChatMessageListRegistryService,
        private logService: LogService,
        private entityTimePlugin: EntityTimePlugin,
    ) {
        super();

        this.chatMessageListRegistry.openChats$
            .pipe(
                filter(() => xmppChatAdapter.state$.getValue() === 'online'),
            )
            .subscribe(contacts => {
                contacts.forEach(async contact => {
                    if (contact.mostRecentMessageReceived) {
                        await this.sendMessageStateNotification(
                            contact.jidBare,
                            contact.mostRecentMessageReceived.id,
                            MessageState.RECIPIENT_SEEN);
                    }
                });
            });

        this.publishSubscribePlugin.publish$
            .subscribe((event) => this.handlePubSubEvent(event));
    }

    async onBeforeOnline(): Promise<any> {
        this.parseContactMessageStates().catch(err => this.logService.error('error parsing contact message states', err));
    }

    private async parseContactMessageStates() {
        const itemElement = await this.publishSubscribePlugin.retrieveNodeItems(STORAGE_NGX_CHAT_CONTACT_MESSAGE_STATES);
        this.processPubSub(itemElement);
    }

    private processPubSub(itemElement: Element[]) {
        const results: JidToMessageStateDate = {};
        if (itemElement.length === 1) {
            for (const lastReadEntry of itemElement[0].getChild(wrapperNodeName).getChildren(nodeName)) {
                const {lastRecipientReceived, lastRecipientSeen, lastSent, jid} = lastReadEntry.attrs;
                results[jid] = {
                    lastRecipientSeen: new Date(+lastRecipientSeen || 0),
                    lastRecipientReceived: new Date(+lastRecipientReceived || 0),
                    lastSent: new Date(+lastSent || 0),
                };
            }
        }
        this.jidToMessageStateDate = results;
    }

    private async persistContactMessageStates() {
        const wrapperNode = xml(wrapperNodeName);

        for (const jid in this.jidToMessageStateDate) {
            if (this.jidToMessageStateDate.hasOwnProperty(jid)) {
                const stateDates = this.jidToMessageStateDate[jid];
                wrapperNode.c(nodeName, {
                    jid,
                    lastRecipientReceived: stateDates.lastRecipientReceived.getTime(),
                    lastRecipientSeen: stateDates.lastRecipientSeen.getTime(),
                    lastSent: stateDates.lastSent.getTime(),
                });
            }
        }

        await this.publishSubscribePlugin.storePrivatePayloadPersistent(
            STORAGE_NGX_CHAT_CONTACT_MESSAGE_STATES,
            'current',
            wrapperNode);
    }

    onOffline() {
        this.jidToMessageStateDate = {};
    }

    beforeSendMessage(messageStanza: Element, message: Message): void {
        const {type} = messageStanza.attrs;
        if (type === 'chat' && message) {
            message.state = MessageState.SENDING;
        }
    }

    async afterSendMessage(message: Message, messageStanza: Element) {
        const {type, to} = messageStanza.attrs;
        if (type === 'chat') {
            this.updateContactMessageState(
                parseJid(to).bare().toString(),
                MessageState.SENT,
                new Date(await this.entityTimePlugin.getNow()));
            delete message.state;
        }
    }

    afterReceiveMessage(messageReceived: Message, stanza: MessageWithBodyStanza, messageReceivedEvent: MessageReceivedEvent): void {
        const messageStateElement = stanza.getChild('message-state', STORAGE_NGX_CHAT_CONTACT_MESSAGE_STATES);
        if (messageStateElement) {
            // we received a message state or a message via carbon from another resource, discard it
            messageReceivedEvent.discard = true;
        } else if (messageReceived.direction === Direction.in && stanza.attrs.type !== 'groupchat') {
            this.acknowledgeReceivedMessage(stanza);
        }
    }

    private acknowledgeReceivedMessage(stanza: MessageWithBodyStanza) {
        const {from} = stanza.attrs;
        const isChatWithContactOpen = this.chatMessageListRegistry.isChatOpen(this.xmppChatAdapter.getOrCreateContactById(from));
        const state = isChatWithContactOpen ? MessageState.RECIPIENT_SEEN : MessageState.RECIPIENT_RECEIVED;
        const messageId = MessageUuidPlugin.extractIdFromStanza(stanza);
        this.sendMessageStateNotification(parseJid(from), messageId, state).catch(e => this.logService.error('error sending state notification', e));
    }

    private async sendMessageStateNotification(recipient: JID, messageId: string, state: MessageState) {
        const messageStateResponse = xml('message', {
                to: recipient.bare().toString(),
                from: this.xmppChatAdapter.chatConnectionService.userJid.toString(),
                type: 'chat'
            },
            xml('message-state', {
                xmlns: STORAGE_NGX_CHAT_CONTACT_MESSAGE_STATES,
                messageId,
                date: new Date(await this.entityTimePlugin.getNow()).toISOString(),
                state
            })
        );
        await this.xmppChatAdapter.chatConnectionService.send(messageStateResponse);
    }

    handleStanza(stanza: Stanza) {
        const {type, from} = stanza.attrs;
        const stateElement = stanza.getChild('message-state', STORAGE_NGX_CHAT_CONTACT_MESSAGE_STATES);
        if (type === 'chat' && stateElement) {
            this.handleStateNotificationStanza(stateElement, from);
            return true;
        }
    }

    private handleStateNotificationStanza(stateElement: Element, from: string) {
        const {state, date} = stateElement.attrs;
        const contact = this.xmppChatAdapter.getOrCreateContactById(from);
        const stateDate = new Date(date);
        this.updateContactMessageState(contact.jidBare.toString(), state, stateDate);
    }

    private updateContactMessageState(contactJid: string, state: MessageState, stateDate: Date) {
        const current = this.getContactMessageState(contactJid);
        let changed = false;
        if (state === MessageState.RECIPIENT_RECEIVED && current.lastRecipientReceived < stateDate) {
            current.lastRecipientReceived = stateDate;
            changed = true;
        } else if (state === MessageState.RECIPIENT_SEEN && current.lastRecipientSeen < stateDate) {
            current.lastRecipientReceived = stateDate;
            current.lastRecipientSeen = stateDate;
            changed = true;
        } else if (state === MessageState.SENT && current.lastSent < stateDate) {
            current.lastSent = stateDate;
            changed = true;
        }
        if (changed) {
            this.persistContactMessageStates().catch(err => this.logService.error('error persisting contact message states', err));
        }
    }

    public getContactMessageState(contactJid: string) {
        if (!this.jidToMessageStateDate[contactJid]) {
            this.jidToMessageStateDate[contactJid] = {
                lastRecipientReceived: new Date(0),
                lastRecipientSeen: new Date(0),
                lastSent: new Date(0),
            };
        }
        return this.jidToMessageStateDate[contactJid];
    }

    private handlePubSubEvent(event: Stanza) {
        const items = event.getChild('items');
        const itemsNode = items && items.attrs.node;
        const item = items && items.getChildren('item');
        if (itemsNode === STORAGE_NGX_CHAT_CONTACT_MESSAGE_STATES && item) {
            this.processPubSub(item);
        }
    }
}
