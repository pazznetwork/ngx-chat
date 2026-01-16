import { expect, test } from '@playwright/test';
import { AppPage } from './page-objects/app.po';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';
// Default test credentials matching local dev environment
const devXmppDomain = 'local-jabber.entenhausen.pazz.de';
const devXmppJid = 'local-admin@local-jabber.entenhausen.pazz.de';
const devXmppPassword = 'AdminLocalPassword123!';

const fooUser = 'foouser';
const barUser = 'baruser';
const testPassword = 'somepassword';
const fooUserJid = fooUser + '@local-jabber.entenhausen.pazz.de';
const barUserJid = barUser + '@local-jabber.entenhausen.pazz.de';

test.describe('ngx-chat', () => {
  let appPage: AppPage;
  let ejabberdAdminPage: EjabberdAdminPage;

  test.beforeAll(async ({ browser, playwright }) => {
    appPage = await AppPage.create(browser);
    ejabberdAdminPage = await EjabberdAdminPage.create(
      playwright,
      devXmppDomain,
      devXmppJid,
      devXmppPassword
    );
    await ejabberdAdminPage.deleteUsers([fooUser, barUser]);

    await ejabberdAdminPage.register(fooUser, testPassword);
    await ejabberdAdminPage.register(barUser, testPassword);
    await appPage.setupForTest();
  });

  test('should be able to submit message with enter key and button', async () => {
    test.setTimeout(60000);
    await appPage.logIn(fooUser, testPassword);
    await appPage.addContact(barUserJid);
    await appPage.addContact(fooUserJid);

    const buttonSubmitMessage = 'message submitted with button';
    const enterKeySubmitMessage = 'message submitted with enter key';

    const chatWindow = await appPage.selectChatWithContact(barUserJid);
    await chatWindow.open();

    await chatWindow.write(buttonSubmitMessage, 'button');
    await expect(async () => {
      // Robust check: ensure message exists in outgoing list
      const messages = await chatWindow.getOutMessagesText();
      expect(messages.some(m => m.includes(buttonSubmitMessage))).toBeTruthy();
    }).toPass({ timeout: 10000 });

    await chatWindow.write(enterKeySubmitMessage, 'enter');
    await expect(async () => {
      const messages = await chatWindow.getOutMessagesText();
      expect(messages.some(m => m.includes(enterKeySubmitMessage))).toBeTruthy();
    }).toPass({ timeout: 10000 });

    await appPage.logOut();
  });
});
