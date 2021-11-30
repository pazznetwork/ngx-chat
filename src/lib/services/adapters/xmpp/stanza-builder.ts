import { xml } from '@xmpp/client';
import { Element } from 'ltx';

export class StanzaBuilder {

    static buildRoomMessage(from: string, roomJid: string, content: Element[] = []): Element {
        return xml('message', {from, to: roomJid, type: 'groupchat'},
            ...content,
        );
    }

    static buildRoomMessageWithBody(from: string, roomJid: string, body: string, content: Element[] = []): Element {
        return StanzaBuilder.buildRoomMessage(from, roomJid, [
            xml('body', {}, body),
            ...content]);
    }

    static buildRoomMessageWithThread(from: string, roomJid: string, body: string, thread: string): Element {
        return StanzaBuilder.buildRoomMessageWithBody(from, roomJid, body, [
            xml('thread', {}, thread)
           ]);
    }
}
