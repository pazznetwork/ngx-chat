import { x as xml } from '@xmpp/xml';
import { Element } from 'ltx';
import { IqResponseStanza } from '../../../../core';
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
 * XEP-0048
 */
export class BookmarkPlugin extends AbstractXmppPlugin {

    private pendingAddConference: Promise<IqResponseStanza>;

    constructor(private publishSubscribePlugin: PublishSubscribePlugin) {
        super();
    }

    onOffline() {
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
            autojoin: conferenceNode.attrs.autojoin === 'true'
        };
    }

    saveConferences(conferences: SavedConference[]): Promise<IqResponseStanza> {
        const deduplicatedConferences = removeDuplicates(conferences, (x, y) => x.jid === y.jid);
        return this.publishSubscribePlugin.storePrivatePayloadPersistent(
            STORAGE_BOOKMARKS,
            null,
            xml('storage', {xmlns: STORAGE_BOOKMARKS},
                deduplicatedConferences.map(c => this.convertSavedConferenceToElement(c))
            )
        );
    }

    async addConference(conferenceToSave: SavedConference): Promise<IqResponseStanza> {

        while (this.pendingAddConference) {
            try {
                await this.pendingAddConference; // serialize the writes, so that in case of multiple conference adds all get added
            } catch {}
        }

        return this.pendingAddConference = new Promise(async (resolve, reject) => {
            const savedConferences = await this.retrieveMultiUserChatRooms();
            const conferences = [...savedConferences, conferenceToSave];

            let response: IqResponseStanza;
            try {
                response = await this.saveConferences(conferences);
            } finally {
                this.pendingAddConference = null;
            }

            if (response) {
                resolve(response);
            } else {
                reject();
            }
        });

    }

    private convertSavedConferenceToElement(savedConference: SavedConference) {
        const {name, autojoin, jid} = savedConference;
        return xml('conference', {name, jid, autojoin: autojoin.toString()});
    }

}
