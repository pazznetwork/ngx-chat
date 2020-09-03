import { LogInRequest } from '@pazznetwork/ngx-chat';
import { browser, by, element } from 'protractor';
import { suiteConfig } from './suite-config';

export class AppPage {

    private readonly domainInput = element(by.name('domain'));
    private readonly serviceInput = element(by.name('service'));
    private readonly usernameInput = element(by.name('username'));
    private readonly passwordInput = element(by.name('password'));
    private readonly loginButton = element(by.name('login'));
    private readonly logoutButton = element(by.name('logout'));
    private readonly registerButton = element(by.name('register'));

    async navigateTo() {
        return browser.get('/');
    }

    async logInWithDefaultCredentials() {
        return await this.logIn(suiteConfig);
    }

    async logIn(logInRequest: LogInRequest) {
        await this.domainInput.clear();
        await this.domainInput.sendKeys(logInRequest.domain);
        await this.serviceInput.clear();
        await this.serviceInput.sendKeys(logInRequest.service);
        await this.usernameInput.clear();
        await this.usernameInput.sendKeys(logInRequest.username);
        await this.passwordInput.clear();
        await this.passwordInput.sendKeys(logInRequest.password);
        await this.loginButton.click();
    }

    async logOut() {
        await this.logoutButton.click();
    }

}
