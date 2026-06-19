import mongoose from "mongoose";
export const connection = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string, { dbName: "SMART_AUCTION" });
    console.log("✅ MongoDB connected.");
  } catch (err) {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  }
};
