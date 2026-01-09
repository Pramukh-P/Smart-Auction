// backend / automation / verifyCommissionCorn.js

import { User } from "../models/userSchema.js";
import { PaymentProof } from "../models/commissionProofSchema.js";
import { Commission } from "../models/commissionSchema.js";
import cron from "node-cron";
import { sendEmail } from "../utils/sendEmail.js";

export const verifyCommissionCron = () => {
  cron.schedule("*/1 * * * *", async () => {
    console.log("Running Verify Commission Cron...");
    const approvedProofs = await PaymentProof.find({ status: "Approved" });
    for (const proof of approvedProofs) {
      try {
        const user = await User.findById(proof.userId);
        if (user) {
          if (user.unpaidCommission >= proof.amount) {
            await User.findByIdAndUpdate(
              user._id,
              { $inc: { unpaidCommission: -proof.amount } },
              { new: true }
            );
          } else {
            await User.findByIdAndUpdate(
              user._id,
              { unpaidCommission: 0 },
              { new: true }
            );
          }
          await PaymentProof.findByIdAndUpdate(proof._id, { status: "Settled" });
          await Commission.create({ amount: proof.amount, user: user._id });

          const settlementDate = new Date(Date.now()).toString().substring(0, 15);

          const subject = `Your Payment Has Been Successfully Verified And Settled`;
          const message = `Dear ${user.userName},\n\nWe are pleased to inform you that your recent payment has been successfully verified and settled. Your account has been updated, and you can proceed with your platform activities.\n\nPayment Details:\nAmount Settled: ${proof.amount}\nUnpaid Amount: ${user.unpaidCommission}\nDate of Settlement: ${settlementDate}\n\nBest regards,\nSmart Auction Team`;

          await sendEmail({ email: user.email, subject, message });
        }
        console.log(`User ${proof.userId} paid commission of ${proof.amount}`);
      } catch (error) {
        console.error(`Error processing commission proof for user ${proof.userId}: ${error.message}`);
      }
    }
  });
};
