import { Contact } from './contact';
import { Direction } from './message';

describe('contact', () => {

    it('#equalsBareJid should return true if bare jids match', () => {
        const contact1 = new Contact('test@example.com/resource', 'john doe');
        const contact2 = new Contact('test@example.com/some-other-resource', 'jane dane');
        expect(contact1.equalsBareJid(contact2)).toBeTruthy();
    });

    it('#equalsBareJid should return false if local parts of jid do not match', () => {
        const contact1 = new Contact('test1@example.com/resource', 'john doe');
        const contact2 = new Contact('test2@example.com/some-other-resource', 'jane dane');
        expect(contact1.equalsBareJid(contact2)).toBeFalsy();
    });

    it('#equalsBareJid should return false if host part of jids do not match', () => {
        const contact1 = new Contact('test@example1.com/resource', 'john doe');
        const contact2 = new Contact('test@example2.com/some-other-resource', 'jane dane');
        expect(contact1.equalsBareJid(contact2)).toBeFalsy();
    });

    it('should append messages with same id only once', () => {
        const contact = new Contact('test@example1.com/resource', 'john doe');
        const message = {
            datetime: new Date(),
            body: '',
            direction: Direction.in,
            id: '1',
            delayed: false
        };
        contact.addMessage(message);
        contact.addMessage(message);
        expect(contact.messages.length).toEqual(1);
    });

    it('should append duplicate messages if no id is given', () => {
        const contact = new Contact('test@example1.com/resource', 'john doe');
        const message = {
            datetime: new Date(),
            body: '',
            direction: Direction.in,
            delayed: false
        };
        contact.addMessage(message);
        contact.addMessage(message);
        expect(contact.messages.length).toEqual(2);
    });

    it('should append messages in correct order 1', () => {
        const contact = new Contact('test@example1.com/resource', 'john doe');
        contact.addMessage(createMessageForDate(1500));
        contact.addMessage(createMessageForDate(1400));
        contact.addMessage(createMessageForDate(1700));
        expect(contact.messages.map(m => m.datetime.getTime())).toEqual([1400, 1500, 1700]);
    });

    it('should append messages in correct order 2', () => {
        const contact = new Contact('test@example1.com/resource', 'john doe');
        contact.addMessage(createMessageForDate(1400));
        contact.addMessage(createMessageForDate(1500));
        contact.addMessage(createMessageForDate(1700));
        expect(contact.messages.map(m => m.datetime.getTime())).toEqual([1400, 1500, 1700]);
    });

    it('should append messages in correct order 3', () => {
        const contact = new Contact('test@example1.com/resource', 'john doe');
        contact.addMessage(createMessageForDate(1700));
        contact.addMessage(createMessageForDate(1500));
        contact.addMessage(createMessageForDate(1400));
        expect(contact.messages.map(m => m.datetime.getTime())).toEqual([1400, 1500, 1700]);
    });

    it('should append messages in correct order 4', () => {
        const contact = new Contact('test@example1.com/resource', 'john doe');
        contact.addMessage(createMessageForDate(1400));
        contact.addMessage(createMessageForDate(1700));
        contact.addMessage(createMessageForDate(1500));
        expect(contact.messages.map(m => m.datetime.getTime())).toEqual([1400, 1500, 1700]);
    });

    function createMessageForDate(date) {
        return {
            datetime: new Date(new Date(date)),
            body: '',
            direction: Direction.in,
            delayed: false
        };
    }

});
