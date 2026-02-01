import 'dotenv/config';
import { emailSync } from './server/services/email-sync';

async function testLoopsSync() {
    console.log('--- Insydetradar Loops Sync Test ---');

    const testOperative = {
        email: 'test_operative@insydetradar.com',
        name: 'Tactical Test',
        metadata: {
            source: 'Neural Test Script',
            userId: 'test_uid_777'
        }
    };

    console.log(`[Input] Email: ${testOperative.email}`);
    console.log('Synchronizing with Loops.so...');

    await emailSync.syncUser(testOperative);

    console.log('\n[SYNC STATUS]');
    console.log('Check your Loops.so dashboard for the new contact.');
    console.log('-------------------------------------');
}

testLoopsSync().catch(console.error);
