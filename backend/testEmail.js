// testEmail.js
import { config } from "dotenv";
import { sendEmail } from "./utils/sendEmail.js";

// Load env variables
config({ path: "./config/config.env" });

const runTest = async () => {
  await sendEmail({
    email: "pramukh.p1404@gmail.com", // replace with your real email
    subject: "Test Email",
    message: "Hello! This is a test email."
  });
};

runTest();
