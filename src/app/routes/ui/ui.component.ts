import { Component, OnInit } from '@angular/core';
import { Contact, Direction, dummyAvatar, MessageState } from '@pazznetwork/ngx-chat';

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

    constructor() { }

    ngOnInit(): void {
        this.contact = new Contact('test@example.com', 'chat partner name');
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

    private add(message: {body: string, datetime: Date, direction: Direction}) {
        this.contact.addMessage({
            ...message,
            delayed: false,
            id: null
        });
    }

}
