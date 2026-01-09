// backend/utils/aiHelpers.js
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openaiApiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY;

// Safe guard: do not crash if key missing; just return nulls
let openaiClient = null;
if (openaiApiKey) {
  openaiClient = new OpenAI({
    apiKey: openaiApiKey,
  });
}

/**
 * Generate a concise AI description (3–4 lines) for an auction item.
 * Returns null if OpenAI is not configured or call fails.
 */
export const generateAuctionDescription = async (auction) => {
  if (!openaiClient) return null;

  const title = auction.title || "Auction item";
  const desc = auction.description || "";
  const category = auction.category || "General";
  const condition = auction.condition || "Used";
  const startingBid = auction.startingBid || 0;

  const prompt = `
You are an AI assistant generating product descriptions for an online auction site.

Write a concise, marketplace-style description in 3-4 sentences for the following auction item.
Do not mention that you are an AI, do not add extra headings, and do not talk about predictions.
Just return the description text.

Item details:
- Title: ${title}
- Category: ${category}
- Condition: ${condition}
- Starting bid: ₹${startingBid}
- Seller description: ${desc}
`.trim();

  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You write concise product descriptions for auctions." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 220,
    });

    const text =
      response.choices?.[0]?.message?.content?.trim() || null;
    return text;
  } catch (err) {
    console.error("OpenAI description error:", err.message);
    return null;
  }
};

/**
 * Generate AI price prediction using OpenAI and comparable past auctions.
 * Returns a number or null if OpenAI is not configured / fails.
 *
 * comparables: array of { title, category, condition, startingBid, finalBidAmount }
 */
export const generatePricePrediction = async (auction, comparables = []) => {
  if (!openaiClient) return null;

  const title = auction.title || "Auction item";
  const category = auction.category || "General";
  const condition = auction.condition || "Used";
  const startingBid = auction.startingBid || 0;
  const durationHours = auction.startTime && auction.endTime
    ? Math.round(
        (new Date(auction.endTime).getTime() -
          new Date(auction.startTime).getTime()) /
          (1000 * 60 * 60)
      )
    : null;

  const examplesText =
    comparables && comparables.length
      ? comparables
          .slice(0, 5)
          .map(
            (c, idx) =>
              `Example ${idx + 1}: "${c.title}" | Category: ${
                c.category
              } | Condition: ${c.condition} | Starting bid: ₹${
                c.startingBid
              } | Final winning bid: ₹${c.finalBidAmount}`
          )
          .join("\n")
      : "No historical examples available.";

  const prompt = `
You are an auction pricing assistant. Your task is to estimate a realistic final winning bid price in rupees for a new auction item, based on its details and some examples of past auctions.

Important rules:
- Return ONLY a single integer number in rupees (no text, no currency symbol, no explanation).
- The prediction should be higher than or equal to the starting bid.
- Consider that this is an online auction with competitive bidding.

Past auction examples (for context):
${examplesText}

Current auction item to predict for:
- Title: ${title}
- Category: ${category}
- Condition: ${condition}
- Starting bid: ₹${startingBid}
- Approx. duration (hours): ${durationHours ?? "Unknown"}

Now output only the predicted final winning bid as an integer number.
`.trim();

  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You output only a single integer number representing the predicted final price in rupees.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 32,
    });

    const raw =
      response.choices?.[0]?.message?.content?.trim() || "";
    const digits = raw.match(/[-+]?\d+/);
    if (!digits) return null;

    let predicted = parseInt(digits[0], 10);
    if (Number.isNaN(predicted)) return null;

    // Clamp to reasonable range
    const min = startingBid || 0;
    const max = min > 0 ? min * 5 : predicted * 5;
    if (min && predicted < min) predicted = min;
    if (max && predicted > max) predicted = max;

    return predicted;
  } catch (err) {
    console.error("OpenAI price prediction error:", err.message);
    return null;
  }
};
