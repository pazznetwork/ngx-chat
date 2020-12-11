import { Component, OnInit } from '@angular/core';
import { Contact, Direction, dummyAvatar, MessageState, Room } from '@pazznetwork/ngx-chat';
import { jid as parseJid } from '@xmpp/client';
import { JID } from '@xmpp/jid';

@Component({
    selector: 'app-ui',
    templateUrl: './ui.component.html',
    styleUrls: ['./ui.component.less'],
})
export class UiComponent implements OnInit {

    contact: Contact;
    Direction = Direction;
    MessageState = MessageState;
    dummyAvatar = dummyAvatar;
    room: Room;
    private myJid: JID = parseJid('me@example.com');
    private otherContactJid: JID = parseJid('other@example.com');

    constructor() { }

    ngOnInit(): void {
        this.contact = new Contact(this.otherContactJid.toString(), 'chat partner name');
        this.room = new Room(this.myJid, null);

        this.add({
            body: 'This is an incoming example message',
            datetime: new Date('2019-12-22T14:00:00'),
            direction: Direction.in,
        });
        this.add({
            body: 'This is an incoming example message on another day',
            datetime: new Date('2019-12-24T14:00:00'),
            direction: Direction.in,
        });
        this.add({
            body: 'This is an incoming example message with a really long link https://forum.golem.de/kommentare/wissenschaft/satelliten-oneweb-macht-der-astronomie-mehr-sorgen-als-starlink/oneweb-ist-doch-bald-pleite/137396,5739317,5739317,read.html#msg-5739317 which has content after the link',
            datetime: new Date('2019-12-24T14:00:00'),
            direction: Direction.in,
        });
        this.add({
            body: 'This is an incoming example message with a really long link https://forum.golem.de/satelliten-oneweb-macht-der-astronomie-mehr-sorgen-als-starlink/ which has content after the link',
            datetime: new Date('2019-12-24T14:00:00'),
            direction: Direction.in,
        });
        this.add({
            body: 'This is an outgoing example message with a really long link https://forum.golem.de/kommentare/wissenschaft/satelliten-oneweb-macht-der-astronomie-mehr-sorgen-als-starlink/oneweb-ist-doch-bald-pleite/137396,5739317,5739317,read.html#msg-5739317 which has content after the link',
            datetime: new Date('2019-12-24T14:00:00'),
            direction: Direction.out,
        });
        this.add({
            body: 'This is an outgoing example message with a really long link https://forum.golem.de/satelliten-oneweb-macht-der-astronomie-mehr-sorgen-als-starlink/ which has content after the link',
            datetime: new Date('2019-12-24T14:00:00'),
            direction: Direction.out,
        });
        this.add({
            body: 'This is an outgoing example message',
            datetime: new Date('2019-12-24T14:05:01'),
            direction: Direction.out,
        });
        this.add({
            body: '123',
            datetime: new Date('2019-12-24T14:05:01'),
            direction: Direction.out,
        });
        this.add({
            body: 'This is an outgoing message with a link to an image https://dummyimage.com/600x400/000/fff and some text after the link',
            datetime: new Date('2019-12-24T14:05:01'),
            direction: Direction.out,
        });
        this.add({
            body: 'This is an incoming message with a link to an image https://dummyimage.com/600x400/000/fff and some text after the link',
            datetime: new Date('2019-12-24T14:05:01'),
            direction: Direction.in,
        });
        this.add({
            body: 'Really tall image https://dummyimage.com/600x4000/000/fff',
            datetime: new Date('2019-12-24T14:05:01'),
            direction: Direction.in,
        });
        this.add({
            body: 'Really wide image https://dummyimage.com/6000x400/000/fff',
            datetime: new Date('2019-12-24T14:05:01'),
            direction: Direction.in,
        });
        this.add({
            body: 'Rinderkennzeichnungs- und Rindfleischetikettierungsüberwachungsaufgabenübertragungsgesetz',
            datetime: new Date('2019-12-24T14:05:01'),
            direction: Direction.in,
        });
    }

    private add(message: { body: string, datetime: Date, direction: Direction }) {
        this.contact.addMessage({
            ...message,
            delayed: false,
            id: null,
        });

        this.room.addMessage({
            ...message,
            delayed: false,
            from: message.direction === Direction.in ? this.otherContactJid : this.myJid,
        });
    }

}
