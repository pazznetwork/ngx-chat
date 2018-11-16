import { browser } from 'protractor';
import { AppPage } from './app.po';

describe('workspace-project App', () => {
    let page: AppPage;

    beforeEach(() => {
        page = new AppPage();
    });

    it('should display welcome message', () => {
        page.navigateTo();

        page.logIn({
            jid: '',
            password: '',
            uri: '',
            domain: ''
        });

        browser.sleep(5000);

        page.logOut();

        browser.sleep(5000);

    });
});
