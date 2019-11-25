import { browser, by, element, ExpectedConditions } from 'protractor';
import { AppPage } from './app.po';

describe('ngx-chat', () => {
    let page: AppPage;

    beforeEach(() => {
        page = new AppPage();
    });

    it('should be able to log in and log out', async () => {
        await page.navigateTo();
        await page.logInWithDefaultCredentials();
        await browser.wait(ExpectedConditions.presenceOf(element(by.css('.roster-list[data-ngx-chat-state="online"]'))), 5000);
        await page.logOut();
        await browser.wait(ExpectedConditions.not(ExpectedConditions.presenceOf(element(by.css('.roster-list')))), 5000);
    });
});
