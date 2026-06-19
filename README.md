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

## Key Features

- ⚡ **Real-time bidding** — WebSocket rooms per auction, zero polling
- 🛡️ **Anti-snipe** — last-minute bids extend auction by 3 minutes
- 🔒 **Race condition handling** — per-auction mutex prevents simultaneous bid conflicts
- 📧 **Auto-relist** — unpaid winners trigger bulk Brevo emails to all previous bidders
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
