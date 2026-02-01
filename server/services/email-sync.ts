import axios from 'axios';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const LOOPS_API_KEY = process.env.LOOPS_API_KEY;

export const emailSync = {
    /**
     * Synchronize a new tactical user to the Loops mailing list protocol.
     */
    async syncUser(user: { email: string; name: string | null; metadata?: any }) {
        if (!LOOPS_API_KEY) {
            console.warn('[EmailSync] LOOPS_API_KEY missing. Audience sync bypassed.');
            return;
        }

        try {
            console.log(`[EmailSync] Synchronizing operative to Loops: ${user.email} `);

            await axios.post(
                'https://app.loops.so/api/v1/contacts/create',
                {
                    email: user.email,
                    firstName: user.name?.split(' ')[0] || '',
                    lastName: user.name?.split(' ').slice(1).join(' ') || '',
                    source: user.metadata?.source || 'Insydetradar App',
                    userGroup: 'Operative',
                    userId: user.metadata?.userId || undefined,
                },
                {
                    headers: {
                        Authorization: `Bearer ${LOOPS_API_KEY} `,
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log('[EmailSync] Operative successfully listed in Loops protocol.');
        } catch (error: any) {
            console.error('[EmailSync] Loops sync failed:', error.response?.data || error.message);
        }
    },

    /**
     * Send a tactical welcome sequence via Resend.
     */
    async sendWelcome(email: string, name: string) {
        if (!RESEND_API_KEY) {
            console.warn('[EmailSync] RESEND_API_KEY missing. Welcome email bypassed.');
            return;
        }

        try {
            await axios.post(
                'https://api.resend.com/emails',
                {
                    from: 'Insydetradar <tactical@insydetradar.com>',
                    to: [email],
                    subject: 'PROTOCOL ESTABLISHED: Welcome to the Future of Trading',
                    html: `< p > Welcome, Operative ${name}. Your neural link to Insydetradar is now active.</p>`,
                },
                {
                    headers: {
                        Authorization: `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
        } catch (error) {
            console.error('[EmailSync] Welcome email failed:', error);
        }
    }
};
