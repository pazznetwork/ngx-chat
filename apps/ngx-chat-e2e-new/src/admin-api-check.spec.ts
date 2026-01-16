import { test, expect } from '@playwright/test';
import { EjabberdAdminPage } from './page-objects/ejabberd-admin.po';
import { devXmppJid, devXmppDomain, devXmppPassword } from '../secrets';

test.describe('Admin API Check', () => {
    let ejabberdAdminPage: EjabberdAdminPage;

    test.beforeAll(async ({ playwright }) => {
        // Explicitly pass full JID as adminUserName
        ejabberdAdminPage = await EjabberdAdminPage.create(playwright, devXmppDomain, devXmppJid, devXmppPassword);
    });

    test('should be able to list registered users', async () => {
        try {
            console.log('Attempting to fetch registered users...');
            const users = await ejabberdAdminPage.registeredUsers();
            console.log('SUCCESS: Fetched users object:', JSON.stringify(users, null, 2));
            // expect(users).toBeInstanceOf(Array); // structure check later
        } catch (error) {
            console.error('FAILED: API call failed', error);
            throw error;
        }
    });

    test('should be able to list MUC rooms', async () => {
        try {
            console.log('Attempting to fetch MUC rooms...');
            const rooms = await ejabberdAdminPage.getMucRooms();
            console.log('SUCCESS: Fetched MUC rooms object:', JSON.stringify(rooms, null, 2));
            // expect(rooms).toBeInstanceOf(Array); // structure check later
        } catch (error) {
            console.error('FAILED: API call failed', error);
            throw error;
        }
    });
});
