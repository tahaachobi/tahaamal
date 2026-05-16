# Deploy Checklist

This project is ready to deploy as a full Next.js app.

## Stack

- App hosting: Vercel
- Database: Railway PostgreSQL

Do not use Railway MySQL for this project. The Prisma datasource in `prisma/schema.prisma` uses `provider = "postgresql"`.

## 1. Create the database

In Railway:

1. Create a new `PostgreSQL` service.
2. Wait until it is online.
3. Copy the service `DATABASE_URL`.

Use the public connection string when the app is hosted on Vercel.

## 2. Add Vercel environment variables

In your Vercel project, add:

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=replace-with-a-random-secret
NEXTAUTH_URL=https://your-project.vercel.app
GOOGLE_CLIENT_ID=google-client-id
GOOGLE_CLIENT_SECRET=google-client-secret
MAIL_FROM=SaaS Booking <no-reply@example.com>
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=smtp-user
SMTP_PASS=smtp-password
SMTP_SECURE=false
BOOKING_AUTOMATION_SECRET=replace-before-cron
WHATSAPP_API_URL=https://your-whatsapp-provider.example/send
WHATSAPP_API_TOKEN=replace-with-provider-token
WHATSAPP_SENDER=salon-booking
```

If you later connect a custom domain, update `NEXTAUTH_URL` to that exact HTTPS domain.
If SMTP is not configured yet, the app falls back to logging email payloads so bookings still succeed safely.
The email-code signup flow needs working SMTP in production. Without SMTP, `/register` will block email-code account creation instead of pretending delivery succeeded.
If a WhatsApp provider webhook is not configured yet, the app falls back to logging WhatsApp events so booking flows still complete safely.
If you want the 3-hour reminders to fire even when nobody opens `/account` or `/dashboard`, schedule a secure POST request to `/api/internal/process-booking-reminders` with `Authorization: Bearer <BOOKING_AUTOMATION_SECRET>`.

## 3. Deploy

This repo includes:

- `vercel.json` with `buildCommand: "npm run vercel-build"`
- `npm run vercel-build` which runs:

```bash
prisma generate
prisma migrate deploy
next build
```

That means Vercel will:

1. generate Prisma Client
2. apply production-safe migrations
3. build the Next.js app

## 4. After deploy

Open:

- `/register` to create a salon owner account
- `/login` to sign in
- `/dashboard` for the owner dashboard
- `/account` for client booking history, confirmations, and contact actions

## Notes

- Do not run `npm run db:seed` in production unless you explicitly want test accounts.
- If you created a Railway MySQL service by mistake, ignore or delete it.
- If any MySQL password or secret was exposed publicly, rotate it in Railway.
- For real booking emails, configure the SMTP variables above. The app uses Nodemailer and degrades safely when SMTP is missing.
- For real WhatsApp delivery, point `WHATSAPP_API_URL` to your provider or custom webhook that accepts `to`, `message`, `context`, and optional metadata in a JSON POST body.
