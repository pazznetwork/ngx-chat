// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Inject, OnInit } from '@angular/core';
import {
  Contact,
  Direction,
  JID,
  Log,
  LOG_SERVICE_TOKEN,
  type Message,
  MessageState,
  parseJid,
  type Recipient,
  Room,
} from '@pazznetwork/ngx-chat-shared';
import { ChatHistoryComponent, ChatMessageOutComponent } from '@pazznetwork/ngx-chat';
import { NgForOf } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'ngx-chat-ui',
    templateUrl: './ui.component.html',
    styleUrls: ['./ui.component.less'],
    imports: [ChatMessageOutComponent, ChatHistoryComponent, NgForOf, RouterLink]
})
export class UiComponent implements OnInit {
  readonly dummyAvatarContact =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iNjAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDYwMCA2MDAiPgogIDxkZWZzPgogICAgPGNsaXBQYXRoIGlkPSJjbGlwLV8xIj4KICAgICAgPHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSI2MDAiLz4KICAgIDwvY2xpcFBhdGg+CiAgPC9kZWZzPgogIDxnIGlkPSJfMSIgZGF0YS1uYW1lPSIxIiBjbGlwLXBhdGg9InVybCgjY2xpcC1fMSkiPgogICAgPHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSI2MDAiIGZpbGw9IiNmZmYiLz4KICAgIDxnIGlkPSJHcnVwcGVfNzcxNyIgZGF0YS1uYW1lPSJHcnVwcGUgNzcxNyI+CiAgICAgIDxyZWN0IGlkPSJSZWNodGVja18xMzk3IiBkYXRhLW5hbWU9IlJlY2h0ZWNrIDEzOTciIHdpZHRoPSI2MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjZTVlNmU4Ii8+CiAgICAgIDxlbGxpcHNlIGlkPSJFbGxpcHNlXzI4MyIgZGF0YS1uYW1lPSJFbGxpcHNlIDI4MyIgY3g9IjExNi4yMzEiIGN5PSIxMjUuNjcxIiByeD0iMTE2LjIzMSIgcnk9IjEyNS42NzEiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDE4NS4yMzEgMTExLjQ4NSkiIGZpbGw9IiNhZmI0YjgiLz4KICAgICAgPHBhdGggaWQ9IlBmYWRfMjQ5NjIiIGRhdGEtbmFtZT0iUGZhZCAyNDk2MiIgZD0iTTU0Ni4zNTksNTk1LjI3NnMwLTIxNy41NjMtMjQ0LjkwOS0yMTcuNTYzaC0xLjQ1N2MtMjQ0LjkwOSwwLTI0NC45MDksMjE3LjU2My0yNDQuOTA5LDIxNy41NjMiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgNC43MjQpIiBmaWxsPSIjYWZiNGI4Ii8+CiAgICA8L2c+CiAgPC9nPgo8L3N2Zz4K';

  contact!: Contact;
  Direction = Direction;
  MessageState = MessageState;
  room!: Room;
  private myJid: JID = parseJid('me@example.com');
  private otherContactJid: JID = parseJid('other@example.com');
  outMessages: { contact: Recipient; message: Message }[] = [
    {
      // Object were made fast against error may not be in correct state
      contact: new Contact(this.myJid.toString(), 'chat partner', this.dummyAvatarContact),
      message: {
        id: '1',
        from: this.myJid,
        direction: Direction.in,
        body: '',
        datetime: new Date(),
        delayed: false,
        fromArchive: false,
        /**
         * if no explicit state is set for the message, use implicit contact message states instead.
         */
        state: MessageState.SENT,
      },
    },
    // <ngx-chat-message-out class="chat-message--out"
    //     [avatar]="dummyAvatarContact"
    // formattedDate="2020-06-04 18:35"
    // nick="chat partner"
    //     [messageState]="MessageState.SENDING">
    //     Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
    //     Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
    // dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
    // proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
    // </ngx-chat-message-out>
    // <ngx-chat-message-out class="chat-message--out"
    //     [avatar]="dummyAvatarContact"
    //     [direction]="Direction.out"
    // formattedDate="2020-06-04 18:35"
    // nick="chat partner"
    //     [messageState]="MessageState.SENDING">
    //     sending
    //     </ngx-chat-message-out>
    //     <ngx-chat-message-out class="chat-message--out"
    //     [avatar]="dummyAvatarContact"
    //     [direction]="Direction.out"
    // formattedDate="2020-06-04 18:35"
    // nick="chat partner"
    //     [messageState]="MessageState.SENT">
    //     sent
    //     </ngx-chat-message-out>
    //     <ngx-chat-message-out class="chat-message--out"
    //     [avatar]="dummyAvatarContact"
    //     [direction]="Direction.out"
    // formattedDate="2020-06-04 18:35"
    // nick="chat partner"
    //     [messageState]="MessageState.RECIPIENT_RECEIVED">
    //     recipient received
    // </ngx-chat-message-out>
    // <ngx-chat-message-out class="chat-message--out"
    //     [avatar]="dummyAvatarContact"
    // formattedDate="2020-06-04 18:36"
    // nick="chat partner"
    //     [messageState]="MessageState.RECIPIENT_SEEN">
    //     recipient seen
    // </ngx-chat-message-out>
    // <ngx-chat-message-out class="chat-message--out"
    //     [direction]="Direction.out"
    // formattedDate="2020-06-04 18:37"
    // imageLink="https://dummyimage.com/600x400/000/fff"
    // nick="chat partner">
    //     content goes here
    // </ngx-chat-message-out>
  ];

  constructor(@Inject(LOG_SERVICE_TOKEN) readonly logService: Log) {}

  ngOnInit(): void {
    this.contact = new Contact(this.otherContactJid.toString(), 'chat partner name');
    this.room = new Room(this.logService, this.myJid);

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

  private add(message: { body: string; datetime: Date; direction: Direction }): void {
    let startIndex = 0;
    this.contact?.messageStore.addMessage({
      ...message,
      delayed: false,
      fromArchive: false,
      id: (startIndex++).toString(10),
    });

    this.room?.messageStore.addMessage({
      ...message,
      delayed: false,
      fromArchive: false,
      from: message.direction === Direction.in ? this.otherContactJid : this.myJid,
      id: (startIndex++).toString(10),
    });
  }
}
