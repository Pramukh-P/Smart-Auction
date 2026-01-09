// backend/utils/sendEmail.js
import nodemailer from "nodemailer";

/**
 * ✅ UNIVERSAL sendEmail
 * Supports BOTH:
 * 1) sendEmail({ email, subject, message })
 * 2) sendEmail(email, subject, message)
 */
export const sendEmail = async (arg1, arg2, arg3) => {
  try {
    // ================= NORMALIZE INPUT =================
    let to, subject, message;

    // Case 1: Object-based call (old code)
    if (typeof arg1 === "object" && arg1 !== null) {
      to = arg1.email;
      subject = arg1.subject;
      message = arg1.message;
    }
    // Case 2: Positional call (new code)
    else {
      to = arg1;
      subject = arg2;
      message = arg3;
    }

    if (!to || !subject || !message) {
      throw new Error("Invalid email parameters");
    }

    // ================= TRANSPORTER =================
    const transporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || "gmail",
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true, // ✅ SSL for 465
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV !== "development",
      },
    });

    // ================= VERIFY SMTP =================
    await transporter.verify();
    console.log("✅ SMTP server ready");

    // ================= MAIL OPTIONS =================
    const mailOptions = {
      from: `"SmartAuction 👋" <${process.env.SMTP_MAIL}>`,
      to,
      subject,
      text: message,
      html: message
        .replace(/\n/g, "<br>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n\n/g, "<br><br>"),
    };

    // ================= SEND =================
    const result = await transporter.sendMail(mailOptions);

    console.log(`📧 Email sent to ${to}: ${subject}`);
    console.log(`🆔 Message ID: ${result.messageId}`);

    return result;
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    throw error;
  }
};
