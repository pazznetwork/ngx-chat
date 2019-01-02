import { browser } from 'protractor';

it('should define configuration', () => {
    if (!browser.params || !browser.params.xmppJid) {
        fail('no e2e configuration given, populate the environment variables mentioned in protractor.conf.js with valid xmpp credentials');
    }
});

export const suiteConfig = {
    jid: browser.params.xmppJid,
    password: browser.params.xmppPassword,
    domain: browser.params.xmppDomain,
    uri: browser.params.xmppUri,
};
