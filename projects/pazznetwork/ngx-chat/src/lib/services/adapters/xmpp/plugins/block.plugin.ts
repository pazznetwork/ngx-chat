import { xml } from '@xmpp/client';
import { BehaviorSubject } from 'rxjs';
import { Stanza } from '../../../../core/stanza';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { ServiceDiscoveryPlugin } from './service-discovery.plugin';

/**
 * XEP-0191: Blocking Command
 * https://xmpp.org/extensions/xep-0191.html
 */
export class BlockPlugin extends AbstractXmppPlugin {

    public supportsBlock$ = new BehaviorSubject<boolean | 'unknown'>('unknown');

    constructor(
        private xmppChatAdapter: XmppChatAdapter,
        private serviceDiscoveryPlugin: ServiceDiscoveryPlugin,
    ) {
        super();
    }

    async onBeforeOnline() {
        const supportsBlock = await this.determineSupportForBlock();
        this.supportsBlock$.next(supportsBlock);
        if (supportsBlock) {
            await this.requestBlockedJids();
        }
    }

    private async determineSupportForBlock() {
        try {
            return await this.serviceDiscoveryPlugin.supportsFeature(
                this.xmppChatAdapter.chatConnectionService.userJid.domain,
                'urn:xmpp:blocking');
        } catch (e) {
            return false;
        }
    }

    onOffline() {
        this.supportsBlock$.next('unknown');
        this.xmppChatAdapter.blockedContactIds$.next([]);
    }

    blockJid(jid: string) {
        return this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'set'},
                xml('block', {xmlns: 'urn:xmpp:blocking'},
                    xml('item', {jid}))));
    }

    unblockJid(jid: string) {
        return this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'set'},
                xml('unblock', {xmlns: 'urn:xmpp:blocking'},
                    xml('item', {jid}))));
    }

    private async requestBlockedJids() {
        const blockListResponse = await this.xmppChatAdapter.chatConnectionService.sendIq(
            xml('iq', {type: 'get'},
                xml('blocklist', {xmlns: 'urn:xmpp:blocking'})
            )
        );

        const blockedJids = blockListResponse
            .getChild('blocklist')
            .getChildren('item')
            .map(e => e.attrs.jid);

        this.xmppChatAdapter.blockedContactIds$.next(blockedJids);
    }

    handleStanza(stanza: Stanza): boolean {
        const {from} = stanza.attrs;
        if (from && from === this.xmppChatAdapter.chatConnectionService.userJid?.bare().toString()) {
            const blockPush = stanza.getChild('block', 'urn:xmpp:blocking');
            const unblockPush = stanza.getChild('unblock', 'urn:xmpp:blocking');
            const blockList = this.xmppChatAdapter.blockedContactIds$.getValue();
            if (blockPush) {
                const jidsToBlock = blockPush.getChildren('item')
                    .map(e => e.attrs.jid)
                    .filter(jidToBlock => blockList.indexOf(jidToBlock) === -1);
                this.xmppChatAdapter.blockedContactIds$.next(blockList.concat(jidsToBlock));
                return true;
            } else if (unblockPush) {
                const jidsToUnblock = unblockPush.getChildren('item').map(e => e.attrs.jid);
                if (jidsToUnblock.length === 0) {
                    // unblock everyone
                    this.xmppChatAdapter.blockedContactIds$.next([]);
                } else {
                    // unblock individually
                    const newBlockList = blockList.filter(blockedJid => jidsToUnblock.indexOf(blockedJid) === -1);
                    this.xmppChatAdapter.blockedContactIds$.next(newBlockList);
                }
                return true;
            }
        }
        return false;
    }

}
