# SmartAuction Platform v2

AI-powered online auction platform built with TypeScript, React, WebSockets, and Python ML.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js · Express · TypeScript · WebSockets (ws) |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS · Redux Toolkit |
| Database | MongoDB · Mongoose |
| ML Service | Python · FastAPI · scikit-learn |
| Emails | Brevo (Sendinblue) API |
| Payments | Razorpay |
| Images | Cloudinary |
| AI | OpenAI GPT-4o-mini |
| Auth | JWT (cookie) + Google Sign-In (OAuth 2.0) |

## Key Features

- ⚡ **Real-time bidding** — WebSocket rooms per auction, zero polling
- 🛡️ **Anti-snipe** — last-minute bids extend auction by 3 minutes
- 🔒 **Race condition handling** — per-auction mutex prevents simultaneous bid conflicts
- 📧 **Auto-relist** — unpaid winners trigger bulk Brevo emails to all previous bidders
- 🔐 **Sign up / Login with Google** — one-click OAuth alongside the existing email + OTP flow
- 🤖 **AI chatbot** — floating assistant powered by OpenAI GPT-4o-mini
- 💬 **Q&A** — bidders ask, auctioneers answer, updates in real-time
- ❤️ **Wishlist** — save auctions, view in dedicated page
- 💳 **Payments** — Razorpay with auto-payout after delivery confirmation
- 📊 **Admin dashboard** — full control with charts, user mgmt, complaint resolution

## Quick Start

See [instructions.md](./instructions.md) for complete setup guide.

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
cd ml && pip install -r requirements.txt && python train_model.py && uvicorn api.main:app --reload --port 8000
```

## Google Sign-In Setup

"Sign up with Google" / "Login with Google" use Google Identity Services and require one OAuth Client ID shared by both apps:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), create an **OAuth 2.0 Client ID** of type **Web application**.
2. Under **Authorized JavaScript origins**, add every origin the frontend runs on (e.g. `http://localhost:5173` and your deployed domain). No redirect URI is needed — sign-in happens via a popup/One Tap token, not a redirect.
3. Copy the generated Client ID into:
   - `backend/.env` → `GOOGLE_CLIENT_ID=...` (used to verify the token server-side)
   - `frontend/.env` → `VITE_GOOGLE_CLIENT_ID=...` (used to render the button and request the token)
4. Restart both dev servers. If `VITE_GOOGLE_CLIENT_ID` is left blank, the Google button simply doesn't render — the rest of the app is unaffected.

Behavior: on the **Register** page, the person picks Bidder/Auctioneer first, then "Sign up with Google" creates a verified account with that role (no OTP needed) and sends the welcome email immediately. On the **Login** page, "Login with Google" only works for an email that already has an account. Email/password login, OTP verification, and password reset are unchanged.
