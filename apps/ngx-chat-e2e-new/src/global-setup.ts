import { request } from '@playwright/test';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';
import { devXmppDomain, devXmppJid, devXmppPassword } from '../secrets';

async function globalSetup() {
    console.log('Global Setup: Cleaning up Ejabberd users...');

    // Mock the playwright object expected by the PO
    const playwrightMock = { request };

    const ejabberdAdminPage = await EjabberdAdminPage.create(
        playwrightMock as any,
        devXmppDomain,
        devXmppJid,
        devXmppPassword
    );

    try {
        await ejabberdAdminPage.deleteAllBesidesAdminUser();
        console.log('Global Setup: Cleanup complete.');
    } catch (error) {
        console.error('Global Setup: Failed to clean up users', error);
    }
}

export default globalSetup;
