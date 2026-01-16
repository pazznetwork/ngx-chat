import { cleanServerBesidesAdmin } from './helpers/admin-actions';

console.log('Global cleanup file loaded.');

/*
 * This file is intended to run before other tests to ensure a clean server state.
 * While Karma execution order isn't strictly guaranteed by file name, loading this
 * helps ensure cleanup happens early or at least is registered.
 */
beforeAll(async () => {
    // console.log('Starting global server cleanup...');
    await cleanServerBesidesAdmin();
    // console.log('Global server cleanup completed.');
});
