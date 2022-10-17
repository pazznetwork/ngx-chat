import { xml } from '@xmpp/client';
import { Element } from 'ltx';
import { IqResponseStanza, Stanza } from '../../../../core/stanza';
import { removeDuplicates } from '../../../../core/utils-array';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { PublishSubscribePlugin } from './publish-subscribe.plugin';

export interface SavedConference {
    name: string;
    jid: string;
    autojoin: boolean;
}

export const STORAGE_BOOKMARKS = 'storage:bookmarks';

/**
 * XEP-0048 Bookmarks (https://xmpp.org/extensions/xep-0048.html)
 */
export class BookmarkPlugin extends AbstractXmppPlugin {

    private pendingAddConference: Promise<IqResponseStanza<'result'>> | null = null;

    constructor(private readonly publishSubscribePlugin: PublishSubscribePlugin) {
        super();
    }

    onOffline(): void {
        this.pendingAddConference = null;
    }

    async retrieveMultiUserChatRooms(): Promise<SavedConference[]> {
        const itemNode = await this.publishSubscribePlugin.retrieveNodeItems(STORAGE_BOOKMARKS);
        const storageNode = itemNode && itemNode[0] && itemNode[0].getChild('storage', STORAGE_BOOKMARKS);
        const conferenceNodes = itemNode && storageNode.getChildren('conference');
        if (!conferenceNodes) {
            return [];
        }
        return conferenceNodes.map(c => this.convertElementToSavedConference(c));
    }

    private convertElementToSavedConference(conferenceNode: Element): SavedConference {
        return {
            name: conferenceNode.attrs.name,
            jid: conferenceNode.attrs.jid,
            autojoin: conferenceNode.attrs.autojoin === 'true',
        };
    }

    saveConferences(conferences: SavedConference[]): Promise<IqResponseStanza<'result'>> {
        const deduplicatedConferences = removeDuplicates(conferences, (x, y) => x.jid === y.jid);
        return this.publishSubscribePlugin.storePrivatePayloadPersistent(
            STORAGE_BOOKMARKS,
            null,
            xml('storage', {xmlns: STORAGE_BOOKMARKS},
                ...deduplicatedConferences.map(c => this.convertSavedConferenceToElement(c)),
            ),
        );
    }

    async addConference(conferenceToSave: SavedConference): Promise<IqResponseStanza<'result'>> {
        while (this.pendingAddConference) {
            try {
                await this.pendingAddConference; // serialize the writes, so that in case of multiple conference adds all get added
            } catch {}
        }

        this.pendingAddConference = this.addConferenceInternal(conferenceToSave);

        try {
            return await this.pendingAddConference;
        } finally {
            this.pendingAddConference = null;
        }
    }

    private async addConferenceInternal(conferenceToSave: SavedConference): Promise<IqResponseStanza<'result'>> {
        const savedConferences = await this.retrieveMultiUserChatRooms();
        const conferences = [...savedConferences, conferenceToSave];

        return await this.saveConferences(conferences);
    }

    private convertSavedConferenceToElement({name, autojoin, jid}: SavedConference): Stanza {
        return xml('conference', {name, jid, autojoin: autojoin.toString()}) as Stanza;
    }

}
