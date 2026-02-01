import 'dotenv/config';
import { emailSync } from './server/services/email-sync';

async function testResendWelcome() {
    console.log('--- Insydetradar Resend Welcome Email Test ---');

    const testOperative = {
        email: 'jonnyallum@gmail.com', // Using your email for the test
        name: 'Jonny Allum'
    };

    console.log(`[Input] Email: ${testOperative.email}`);
    console.log(`[Input] Name: ${testOperative.name}`);
    console.log('Sending welcome email via Resend...');

    await emailSync.sendWelcome(testOperative.email, testOperative.name);

    console.log('\n[EMAIL STATUS]');
    console.log('Check your inbox for the welcome email.');
    console.log('-------------------------------------');
}

testResendWelcome().catch(console.error);
