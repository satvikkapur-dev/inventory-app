# Inventory Tracker — Setup Guide

This is a real installable app (PWA) for tracking inventory across UrbnFettch and Homecare,
shared live between you and your storekeeper. No app-store submission needed — it installs
straight from a web link.

## What you'll do (4 steps, ~20-30 minutes total)

### Step 1 — Create a free Firebase project (this stores your data)
1. Go to https://console.firebase.google.com and sign in with any Google account.
2. Click **"Add project"**, name it (e.g. `urbnfettch-inventory`), continue through the prompts.
3. Once inside the project, click the **`</>`** (web) icon to register a web app. Give it any nickname.
4. Firebase will show you a `firebaseConfig` object — copy it.
5. Open `src/firebase.js` in this project and paste your config over the placeholder values.
6. In the left sidebar, go to **Build > Firestore Database > Create database**.
   Choose **"Start in test mode"** for now (fine while it's just you and your storekeeper — for
   real security later, set rules so only signed-in users can read/write, and consider adding
   Firebase Authentication).

### Step 2 — Push this project to GitHub
1. Create a free GitHub account if you don't have one (https://github.com).
2. Create a new repository (e.g. `inventory-app`), and upload all the files in this folder to it
   (GitHub's web "upload files" button works fine — no command line needed).
   

### Step 3 — Deploy it for free on Vercel
1. Go to https://vercel.com and sign up (use "Continue with GitHub").
2. Click **"Add New > Project"**, select the repo you just created.
3. Leave all settings as default (Vercel auto-detects Vite) and click **Deploy**.
4. In a minute or two, you'll get a live URL like `inventory-app.vercel.app` — this is your app's
   permanent address.

### Step 4 — Install it on your phone (and your storekeeper's)
1. Open the Vercel URL in Chrome (Android) or Safari (iPhone).
2. Tap the browser menu → **"Add to Home Screen"** (or you may see an automatic install prompt).
3. It now behaves like a real app — its own icon, opens full-screen, no browser bar.
4. Send the same link to your storekeeper — they do the same on their phone.
5. First time either of you opens it, it'll ask for a name — that name gets tagged on every
   stock movement so the history stays accurate.

## After that
Both phones read and write the same live data — a stock-out logged by your storekeeper shows
up on your phone right away, and vice versa.

## If you get stuck
Any of these steps can be pasted into Claude ("I'm on Step 2 and GitHub is asking me X") and
I can walk you through it directly.

## AI Secretary (optional)

There's an "AI Secretary" chat button (bottom-left, robot icon) built into the app. Ask it
questions about stock/orders/samples, tell it to log something, or ask it to remind you of
something later — it replies via a Make.com automation and can ping you on Telegram for
proactive alerts (low stock, overdue orders, due reminders).

The Make.com scenario ("AI Secretary Backend") is already built and active. Webhook URL:

```
https://hook.eu1.make.com/m9bnpoy9pomx5l87uv2g8kkgkze78858
```

To turn it on:

1. **Point the app at the Make webhook.** In Vercel, go to your project → Settings →
   Environment Variables, add `VITE_SECRETARY_WEBHOOK_URL` set to the URL above, then
   redeploy. (For local dev, put the same value in a `.env.local` file at the project root.)
2. **Enable the proactive checker.** In this repo, go to Settings → Secrets and variables →
   Actions, and add a secret named `AI_SECRETARY_WEBHOOK_URL` with the same URL. A scheduled
   workflow (`.github/workflows/ai-secretary-tick.yml`) pings it every 6 hours so it can
   check for low stock, overdue orders, and due reminders — that interval is tuned to stay
   within Make's free-plan usage limits (1000 operations/month); shorten it in the workflow
   file if you upgrade your Make plan.
3. **Connect Telegram for notifications.**
   - Create a bot via [@BotFather](https://t.me/BotFather) on Telegram and copy its token.
   - Open this Make authorization link and paste the token in:
     `https://eu1.make.com/2236317/credentials-requests/inbox?requestId=6f659601-8365-42ac-b228-9d47e3970b53`
   - Send `/start` to your new bot once, then get your numeric chat ID (message
     [@userinfobot](https://t.me/userinfobot), or open
     `https://api.telegram.org/bot<your-token>/getUpdates` in a browser after messaging the bot).
   - Tell Claude the connection is authorized and your chat ID — the last step (wiring the
     actual "send Telegram message" action into the scenario) is a single quick follow-up.

**Current limitation:** natural-language data entry (e.g. "log 5kg used from X") is not
wired up to actually save yet — the secretary understands the request and will tell you so,
but you still need to log it in the app for now. Everything else (answering questions,
reminders, and — once Telegram is connected — proactive low-stock/overdue alerts) is live.

If the webhook isn't configured, the chat button still shows but replies that it isn't
connected yet.
