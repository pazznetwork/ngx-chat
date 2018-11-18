import { browser } from 'protractor';

export const suiteConfig = {
    jid: browser.params.xmppJid,
    password: browser.params.xmppPassword,
    domain: browser.params.xmppDomain,
    uri: browser.params.xmppUri,
};
