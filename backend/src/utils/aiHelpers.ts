import OpenAI from "openai";

// ─────────────────────────────────────────────────────────────────────────────
// Groq (https://console.groq.com) provides a free, OpenAI-compatible chat
// completions API, so we reuse the official `openai` SDK and just point it at
// Groq's base URL. Get a free API key at https://console.groq.com/keys and set
// GROQ_API_KEY in your backend .env file.
// ─────────────────────────────────────────────────────────────────────────────
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

let client: OpenAI | null = null;
const getClient = () => {
  if (client) return client;
  if (!process.env.GROQ_API_KEY) return null;
  client = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
  return client;
};

export const generateAIDescription = async (title: string, description: string, category: string, condition: string): Promise<string | null> => {
  const ai = getClient();
  if (!ai) return null;
  try {
    const res = await ai.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: "Write concise, compelling auction listing descriptions (3-4 sentences). No headings, no AI mentions." },
        { role: "user", content: `Item: ${title}\nCategory: ${category}\nCondition: ${condition}\nSeller notes: ${description}` }
      ],
      max_tokens: 200, temperature: 0.7
    });
    return res.choices[0]?.message?.content?.trim() || null;
  } catch { return null; }
};

export const generatePricePrediction = async (title: string, category: string, condition: string, startingBid: number): Promise<number | null> => {
  const ai = getClient();
  if (!ai) return null;
  try {
    const res = await ai.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: "You predict auction final prices. Output ONLY a single integer number in INR. No text, no symbols." },
        { role: "user", content: `Item: ${title}\nCategory: ${category}\nCondition: ${condition}\nStarting bid: ₹${startingBid}\nPredict the likely final winning bid.` }
      ],
      max_tokens: 20, temperature: 0.3
    });
    const txt = res.choices[0]?.message?.content?.trim() || "";
    const num = parseInt(txt.replace(/[^0-9]/g, ""));
    if (isNaN(num) || num <= 0) return null;
    return Math.max(num, startingBid);
  } catch { return null; }
};

export interface ChatContext {
  userName?: string;
  recentOrders?: { title: string; deliveryStatus: string; paymentStatus: string; trackingId?: string; courier?: string; price: number }[];
}

export interface ChatResult {
  reply: string;
  escalate: boolean;
}

const ESCALATE_TAG = "[[ESCALATE]]";

export const chatWithAI = async (userMessage: string, history: { role: "user"|"assistant"; content: string }[], context: ChatContext = {}): Promise<ChatResult> => {
  const ai = getClient();
  if (!ai) return { reply: "AI chat is not configured. Please add a free GROQ_API_KEY to your backend .env to enable this feature (get one at https://console.groq.com/keys).", escalate: false };

  const ordersSummary = context.recentOrders?.length
    ? context.recentOrders.map(o => `- "${o.title}": payment ${o.paymentStatus}, delivery ${o.deliveryStatus}${o.trackingId ? `, tracking ${o.courier} #${o.trackingId}` : ""}, price ₹${o.price}`).join("\n")
    : "No recent orders found for this user.";

  try {
    const messages: any[] = [
      { role: "system", content: `You are SmartAuction's helpful customer support assistant. Be concise (2-4 sentences unless more detail is truly needed) and friendly.

You can help with:
- Order tracking: use the "User's recent orders" data below to answer directly, don't ask the user to repeat info you already have.
- How bidding, payments, shipping, and payouts work.
- General platform questions and troubleshooting.

User: ${context.userName || "Unknown"}
User's recent orders:
${ordersSummary}

If you cannot resolve the user's issue (e.g. it needs a refund, a human decision, a bug, or something outside your knowledge), say so honestly, tell the user you're escalating it to the SmartAuction support team, and end your reply with the exact tag ${ESCALATE_TAG} on its own line. Only use that tag when you are actually escalating.
Current time: ${new Date().toISOString()}` },
      ...history.slice(-10),
      { role: "user", content: userMessage }
    ];
    const res = await ai.chat.completions.create({ model: GROQ_MODEL, messages, max_tokens: 400, temperature: 0.6 });
    const raw = res.choices[0]?.message?.content?.trim() || "I couldn't generate a response. Please try again.";
    const escalate = raw.includes(ESCALATE_TAG);
    const reply = raw.replace(ESCALATE_TAG, "").trim();
    return { reply, escalate };
  } catch (err: any) {
    return { reply: `Sorry, I'm having trouble right now. Please try again shortly.`, escalate: false };
  }
};
