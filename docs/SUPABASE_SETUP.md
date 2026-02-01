# Supabase Production Setup Checklist

To ensure **Insydetradar** is production-ready, follow these steps in your [Supabase Dashboard](https://supabase.com/dashboard).

## 1. Apply Security Policies (RLS)
Open the **SQL Editor** in Supabase and run the script found in:
`Insydetradar/.tmp/SUPABASE_RLS_POLICIES.sql`

This script will:
- Enable Row Level Security on all tables.
- Create a helper function `get_internal_user_id()`.
- Add policies to ensure users can only see their own data (Trades, Positions, Accounts, etc.).
- Allow public read access to Market Data and Signals.

## 2. Configure Authentication
Go to **Authentication > Settings**:

### Email Auth
- [ ] **Enable Email Provider**: ON
- [ ] **Confirm Email**: ON (Highly recommended for production)
- [ ] **Secure Email Change**: ON
- [ ] **Site URL**: Set to your production domain (e.g., `https://insydetradar.com`)
- [ ] **Redirect URLs**: Add `https://insydetradar.com/*` and your development URL (e.g., `exp://localhost:19000`)

### SMTP (Production Only)
Supabase provides a default SMTP with a low limit. For production:
- [ ] Configure a custom SMTP provider (Resend, SendGrid, Postmark).

## 3. Database & Performance
- [ ] **Connection Pooling**: Use the Transaction pooler (Port 6543) for Node.js connections.
- [ ] **Backups**: Ensure automated backups are active (Standard on Pro plan).

## 4. Environment Variables
Ensure the following are added to your server environment (and `.env` for local testing):
- `DATABASE_URL` (Use the London Pooler URL)
- `SUPABASE_SERVICE_ROLE_KEY` (Required for administrative tasks)
- `ALPACA_API_KEY`
- `ALPACA_SECRET_KEY`
- `STRIPE_SECRET_KEY`
