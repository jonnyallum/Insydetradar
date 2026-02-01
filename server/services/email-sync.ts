import axios from 'axios';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export const emailSync = {
    /**
     * Synchronize a new tactical user to the mailing list protocol.
     */
    async syncUser(user: { email: string; name: string | null }) {
        if (!RESEND_API_KEY) {
            console.warn('[EmailSync] RESEND_API_KEY missing. Tactical sync bypassed.');
            return;
        }

        try {
            console.log(`[EmailSync] Synchronizing operative: ${user.email}`);

            // Resend Audience ID should be in env
            const audienceId = process.env.RESEND_AUDIENCE_ID;

            if (!audienceId) {
                console.warn('[EmailSync] RESEND_AUDIENCE_ID missing.');
                return;
            }

            await axios.post(
                `https://api.resend.com/audiences/${audienceId}/contacts`,
                {
                    email: user.email,
                    first_name: user.name?.split(' ')[0] || '',
                    last_name: user.name?.split(' ').slice(1).join(' ') || '',
                    unsubscribed: false,
                },
                {
                    headers: {
                        Authorization: `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log('[EmailSync] Operative successfully listed in mailing protocol.');
        } catch (error) {
            console.error('[EmailSync] Sync failed:', error);
        }
    },

    /**
     * Send a tactical welcome sequence.
     */
    async sendWelcome(email: string, name: string) {
        if (!RESEND_API_KEY) return;

        try {
            await axios.post(
                'https://api.resend.com/emails',
                {
                    from: 'Insydetradar <tactical@insydetradar.com>',
                    to: [email],
                    subject: 'PROTOCOL ESTABLISHED: Welcome to the Future of Trading',
                    html: `<p>Welcome, Operative ${name}. Your neural link to Insydetradar is now active.</p>`,
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
