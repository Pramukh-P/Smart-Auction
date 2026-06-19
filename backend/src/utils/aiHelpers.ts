import OpenAI from "openai";

let client: OpenAI | null = null;
const getClient = () => {
  if (client) return client;
  if (!process.env.OPENAI_API_KEY) return null;
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
};

export const generateAIDescription = async (title: string, description: string, category: string, condition: string): Promise<string | null> => {
  const ai = getClient();
  if (!ai) return null;
  try {
    const res = await ai.chat.completions.create({
      model: "gpt-4o-mini",
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
      model: "gpt-4o-mini",
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

export const chatWithAI = async (userMessage: string, history: { role: "user"|"assistant"; content: string }[]): Promise<string> => {
  const ai = getClient();
  if (!ai) return "AI chat is not configured. Please add your OPENAI_API_KEY to enable this feature.";
  try {
    const messages: any[] = [
      { role: "system", content: `You are SmartAuction's helpful AI assistant. Help users with:
- Finding auctions and items
- Understanding how bidding works  
- Payment and delivery questions
- Platform features and policies
- General auction advice
Keep responses concise and friendly. Current time: ${new Date().toISOString()}` },
      ...history.slice(-10),
      { role: "user", content: userMessage }
    ];
    const res = await ai.chat.completions.create({ model: "gpt-4o-mini", messages, max_tokens: 400, temperature: 0.7 });
    return res.choices[0]?.message?.content?.trim() || "I couldn't generate a response. Please try again.";
  } catch (err: any) {
    return `Sorry, I'm having trouble right now. Error: ${err.message}`;
  }
};
