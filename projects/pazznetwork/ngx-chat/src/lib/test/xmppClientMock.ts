export function createXmppClientMock() {
    const spyObj = jasmine.createSpyObj('Client', ['getValue', 'on', 'plugin', 'send', 'start', 'handle']);
    spyObj.send.and.callFake(() => Promise.resolve());
    return spyObj;
}
