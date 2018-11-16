import { browser, by, element } from 'protractor';
import { LogInRequest } from '../../projects/pazznetwork/ngx-chat/src/lib/core';

export class AppPage {

    private readonly domainInput = element(by.name('domain'));
    private readonly uriInput = element(by.name('uri'));
    private readonly jidInput = element(by.name('jid'));
    private readonly passwordInput = element(by.name('password'));
    private readonly loginButton = element(by.name('login'));
    private readonly logoutButton = element(by.name('logout'));
    private readonly registerButton = element(by.name('register'));

    navigateTo() {
        return browser.get('/');
    }

    logIn(logInRequest: LogInRequest) {
        this.domainInput.clear();
        this.domainInput.sendKeys(logInRequest.domain);
        this.uriInput.clear();
        this.uriInput.sendKeys(logInRequest.uri);
        this.jidInput.clear();
        this.jidInput.sendKeys(logInRequest.jid);
        this.passwordInput.clear();
        this.passwordInput.sendKeys(logInRequest.password);
        this.loginButton.click();
    }

    logOut() {
        this.logoutButton.click();
    }

}
