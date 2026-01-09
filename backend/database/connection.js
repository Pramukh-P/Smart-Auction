//backend/database/connection.js
import mongoose from "mongoose";

export const connection = () => {
  mongoose
    .connect(process.env.MONGO_URI, {
      dbName: "MERN_AUCTION_PLATFORM",
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("✅ Connected to database.");
    })
    .catch((err) => {
      console.log(`❌ Error connecting to database: ${err}`);
    });
};
