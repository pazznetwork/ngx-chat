// SPDX-License-Identifier: AGPL-3.0-or-later
import { Contact, Direction } from '@pazznetwork/ngx-chat-shared';

describe('contact', () => {
  it('#equalsBareJid should return true if bare jids match', () => {
    const contact1 = new Contact('test@example.com/resource', 'john doe');
    const contact2 = new Contact('test@example.com/some-other-resource', 'jane dane');
    expect(contact1.equalsJid(contact2)).toBeTruthy();
  });

  it('#equalsBareJid should return false if local parts of jid do not match', () => {
    const contact1 = new Contact('test1@example.com/resource', 'john doe');
    const contact2 = new Contact('test2@example.com/some-other-resource', 'jane dane');
    expect(contact1.equalsJid(contact2)).toBeFalsy();
  });

  it('#equalsBareJid should return false if host part of jids do not match', () => {
    const contact1 = new Contact('test@example1.com/resource', 'john doe');
    const contact2 = new Contact('test@example2.com/some-other-resource', 'jane dane');
    expect(contact1.equalsJid(contact2)).toBeFalsy();
  });

  it('should append messages with same id only once', () => {
    const contact = new Contact('test@example1.com/resource', 'john doe');
    const message = {
      id: getId(),
      datetime: new Date(),
      body: '',
      direction: Direction.in,
      delayed: false,
      fromArchive: false,
    };
    contact.messageStore.addMessage(message);
    expect(() => contact.messageStore.addMessage(message)).toThrow();
    expect(contact.messageStore.messages.length).toEqual(1);
  });

  it('should append messages in correct order 1', () => {
    const contact = new Contact('test@example1.com/resource', 'john doe');
    contact.messageStore.addMessage(createMessageForDate(1500));
    contact.messageStore.addMessage(createMessageForDate(1400));
    contact.messageStore.addMessage(createMessageForDate(1700));
    expect(contact.messageStore.messages.map((m) => m.datetime.getTime())).toEqual([
      1400, 1500, 1700,
    ]);
  });

  it('should append messages in correct order 2', () => {
    const contact = new Contact('test@example1.com/resource', 'john doe');
    contact.messageStore.addMessage(createMessageForDate(1400));
    contact.messageStore.addMessage(createMessageForDate(1500));
    contact.messageStore.addMessage(createMessageForDate(1700));
    expect(contact.messageStore.messages.map((m) => m.datetime.getTime())).toEqual([
      1400, 1500, 1700,
    ]);
  });

  it('should append messages in correct order 3', () => {
    const contact = new Contact('test@example1.com/resource', 'john doe');
    contact.messageStore.addMessage(createMessageForDate(1700));
    contact.messageStore.addMessage(createMessageForDate(1500));
    contact.messageStore.addMessage(createMessageForDate(1400));
    expect(contact.messageStore.messages.map((m) => m.datetime.getTime())).toEqual([
      1400, 1500, 1700,
    ]);
  });

  it('should append messages in correct order 4', () => {
    const contact = new Contact('test@example1.com/resource', 'john doe');
    contact.messageStore.addMessage(createMessageForDate(1400));
    contact.messageStore.addMessage(createMessageForDate(1700));
    contact.messageStore.addMessage(createMessageForDate(1500));
    expect(contact.messageStore.messages.map((m) => m.datetime.getTime())).toEqual([
      1400, 1500, 1700,
    ]);
  });

  let id = 0;
  function getId(): string {
    return (id++).toString(10);
  }

  function createMessageForDate(date: number): {
    datetime: Date;
    fromArchive: false;
    delayed: false;
    id: string;
    body: '';
    direction: Direction;
  } {
    return {
      id: getId(),
      datetime: new Date(new Date(date)),
      body: '',
      direction: Direction.in,
      delayed: false,
      fromArchive: false,
    };
  }
});
