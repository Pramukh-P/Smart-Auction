// backend / automation / userRegisteredCron.js

import cron from "node-cron";
import { sendEmail } from "../utils/sendEmail.js";
import { User } from "../models/userSchema.js";

export const sendWelcomeEmailCron = () => {
  cron.schedule("*/1 * * * *", async () => {
    console.log("🔄 Running User Registration Cron...");
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    try {
      const newUsers = await User.find({
        createdAt: { $gte: oneHourAgo },
        welcomeEmailSent: { $ne: true },
        verified: true,
      });

      for (let user of newUsers) {
        try {
          let subject = "🎉 Welcome to Smart Auction!";
          let message = `Hi ${user.userName},\n\nWelcome to Smart Auction! 🚀\n\n`;

          if (user.role === "Auctioneer") {
            message += `You're registered as an Auctioneer.\nNext Step: Create your first auction`;
          } else if (user.role === "Bidder") {
            message += `You're registered as a Bidder.\nNext Step: Browse auctions and place bids`;
          }

          message += "\nHappy Auctioning,\nSmart Auction Team";
          await sendEmail({
            email: user.email,
            subject,
            message,
          });

          user.welcomeEmailSent = true;
          await user.save();
          console.log(`📧 Welcome email sent to ${user.email}`);
        } catch (err) {
          console.error(`❌ Failed to send email to ${user.email}:`, err.message);
        }
      }
    } catch (err) {
      console.error("❌ Error fetching new users:", err.message);
    }
  });
};
