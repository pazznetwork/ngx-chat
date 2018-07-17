import { Contact } from './contact';

describe('contact', () => {

    it('#equalsBareJid should return true if bare jids match', () => {
        const contact1 = new Contact('test@example.com/resource', 'john doe', null);
        const contact2 = new Contact('test@example.com/some-other-resource', 'jane dane', null);
        expect(contact1.equalsBareJid(contact2)).toBeTruthy();
    });

    it('#equalsBareJid should return false if local parts of jid do not match', () => {
        const contact1 = new Contact('test1@example.com/resource', 'john doe', null);
        const contact2 = new Contact('test2@example.com/some-other-resource', 'jane dane', null);
        expect(contact1.equalsBareJid(contact2)).toBeFalsy();
    });

    it('#equalsBareJid should return false if host part of jids do not match', () => {
        const contact1 = new Contact('test@example1.com/resource', 'john doe', null);
        const contact2 = new Contact('test@example2.com/some-other-resource', 'jane dane', null);
        expect(contact1.equalsBareJid(contact2)).toBeFalsy();
    });

});
