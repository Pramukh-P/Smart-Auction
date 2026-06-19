import * as SibApiV3Sdk from "sib-api-v3-sdk";
import { SendEmailParams } from "../types";

let apiInstance: any = null;

function getApi() {
  if (apiInstance) return apiInstance;
  if (!process.env.BREVO_API_KEY) {
    console.warn("⚠️ BREVO_API_KEY not set — emails will be logged only");
    return null;
  }
  const defaultClient = SibApiV3Sdk.ApiClient.instance;

  defaultClient.authentications["api-key"].apiKey =
    process.env.BREVO_API_KEY;

  apiInstance = new SibApiV3Sdk.SMTPApi();

  return apiInstance;
}

const brandedHtml = (content: string) => `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8f9fa;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:30px 0">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
      <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 32px">
        <h1 style="color:white;margin:0;font-size:22px">⚡ SmartAuction</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">AI-Powered Auction Platform</p>
      </td></tr>
      <tr><td style="padding:32px">${content}</td></tr>
      <tr><td style="background:#f8f9fa;padding:16px 32px;text-align:center">
        <p style="color:#9ca3af;font-size:12px;margin:0">© ${new Date().getFullYear()} SmartAuction. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;

export const sendEmail = async ({ email, subject, message, html }: SendEmailParams): Promise<void> => {
  const api = getApi();
  const htmlContent = html || brandedHtml(`<p style="color:#374151;line-height:1.6;white-space:pre-wrap">${message}</p>`);

  if (!api) {
    console.log(`[EMAIL DEV] To: ${email} | Subject: ${subject}\n${message}`);
    return;
  }

  const emailData = new SibApiV3Sdk.SendSmtpEmail();
  emailData.to = [{ email }];
  emailData.sender = {
    name: process.env.BREVO_SENDER_NAME || "SmartAuction",
    email: process.env.BREVO_SENDER_EMAIL || "noreply@smartauction.com"
  };
  emailData.subject = subject;
  emailData.htmlContent = htmlContent;

  try {
    await api.sendTransacEmail(emailData);
    console.log(`✅ Email → ${email}: ${subject}`);
  } catch (err: any) {
    console.error(`❌ Email failed → ${email}:`, err?.response?.body || err.message);
  }
};

export const sendBulkEmails = async (emails: string[], subject: string, message: string, html?: string) => {
  await Promise.allSettled(emails.map(email => sendEmail({ email, subject, message, html })));
};

export const emailTemplates = {
  welcome: (name: string) => brandedHtml(`
    <h2 style="color:#1f2937">Welcome, ${name}! 🎉</h2>
    <p style="color:#6b7280">Your SmartAuction account is verified and ready.</p>
    <a href="${process.env.FRONTEND_URL}/auctions" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Browse Auctions</a>`),

  otp: (otp: string) => brandedHtml(`
    <h2 style="color:#1f2937">Verify Your Account</h2>
    <p style="color:#6b7280">Your OTP code:</p>
    <div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#6366f1;padding:20px;background:#eef2ff;border-radius:8px;text-align:center;margin:16px 0">${otp}</div>
    <p style="color:#9ca3af;font-size:13px">Expires in 10 minutes. Do not share this code.</p>`),

  auctionWon: (name: string, title: string, amount: number, orderId: string, deadline: string) => brandedHtml(`
    <h2 style="color:#1f2937">🎉 Congratulations, ${name}!</h2>
    <p style="color:#6b7280">You won the auction for <strong>${title}</strong>.</p>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:4px 0;color:#166534"><strong>Amount Due:</strong> ₹${amount.toLocaleString()}</p>
      <p style="margin:4px 0;color:#166534"><strong>Order ID:</strong> ${orderId}</p>
      <p style="margin:4px 0;color:#dc2626"><strong>Pay by:</strong> ${deadline}</p>
    </div>
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;border-radius:4px">
      ⚠️ <strong>Action Required:</strong> Complete payment within 24 hours or the auction will be relisted.
    </div>
    <a href="${process.env.FRONTEND_URL}/my-orders" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Pay Now</a>`),

  secondChance: (title: string, startingBid: number, auctionId: string) => brandedHtml(`
    <h2 style="color:#1f2937">🔔 Second Chance Alert!</h2>
    <p style="color:#6b7280"><strong>${title}</strong> has been relisted — the previous winner didn't pay!</p>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:4px 0;color:#166534"><strong>Starting Bid:</strong> ₹${startingBid.toLocaleString()}</p>
    </div>
    <a href="${process.env.FRONTEND_URL}/auction/item/${auctionId}" style="display:inline-block;background:#10b981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">Bid Now →</a>`),

  shipped: (title: string, courier: string, trackingId: string) => brandedHtml(`
    <h2 style="color:#1f2937">📦 Your Order Has Shipped!</h2>
    <p style="color:#6b7280">Your item <strong>${title}</strong> is on its way.</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:4px 0;color:#1e40af"><strong>Courier:</strong> ${courier}</p>
      <p style="margin:4px 0;color:#1e40af"><strong>Tracking ID:</strong> ${trackingId}</p>
    </div>`)
};
