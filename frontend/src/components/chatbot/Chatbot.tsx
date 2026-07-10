import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Trash2, Bot, User } from "lucide-react";
import api from "../../lib/axios";
import { ChatMsg } from "../../types";
import { useAppSelector } from "../../store/store";

const Chatbot: React.FC = () => {
  const { isAuthenticated } = useAppSelector(s => s.auth);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [histLoaded, setHistLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && isAuthenticated && !histLoaded) {
      api.get("/chat/history").then(r => {
        setMessages(r.data.messages || []);
        setHistLoaded(true);
      }).catch(() => {});
    }
  }, [open, isAuthenticated, histLoaded]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMsg = { role: "user", content: input.trim(), createdAt: new Date().toISOString() };
    setMessages(p => [...p, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const r = await api.post("/chat", { message: userMsg.content });
      setMessages(p => [...p, { role: "assistant", content: r.data.reply, createdAt: new Date().toISOString() }]);
    } catch (e: any) {
      setMessages(p => [...p, { role: "assistant", content: "Sorry, I couldn't respond right now. Please try again.", createdAt: new Date().toISOString() }]);
    } finally { setLoading(false); }
  };

  const clearHistory = async () => {
    await api.delete("/chat/history").catch(() => {});
    setMessages([]);
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Toggle button */}
      <button onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center z-40 hover:scale-110">
        {open ? <X size={22}/> : <MessageCircle size={24}/>}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-40 flex flex-col overflow-hidden" style={{ maxHeight: "520px" }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><Bot size={18} className="text-white"/></div>
              <div>
                <p className="text-white font-semibold text-sm">SmartAuction AI</p>
                <p className="text-white/70 text-xs">Here to help</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={clearHistory} className="p-1.5 text-white/70 hover:text-white transition-colors" title="Clear history"><Trash2 size={14}/></button>
              <button onClick={() => setOpen(false)} className="p-1.5 text-white/70 hover:text-white transition-colors"><X size={16}/></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Bot size={32} className="text-indigo-200 mx-auto mb-2"/>
                <p className="text-gray-500 text-sm font-medium">Hi! I'm your SmartAuction support assistant.</p>
                <p className="text-gray-400 text-xs mt-1">Ask me to track an order, or about bidding, payments, and more. I'll loop in our team if I can't solve it.</p>
                <div className="mt-4 space-y-2">
                  {["How does bidding work?","When do auctions end?","How do I pay for a won item?"].map(q => (
                    <button key={q} onClick={() => { setInput(q); }} className="w-full text-left text-xs bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors">{q}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"><Bot size={12} className="text-indigo-600"/></div>
                )}
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  m.role === "user" ? "bg-indigo-600 text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}>
                  {m.content}
                </div>
                {m.role === "user" && (
                  <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"><User size={12} className="text-white"/></div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center"><Bot size={12} className="text-indigo-600"/></div>
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }}/>)}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Type a message..."
                className="flex-1 text-sm px-3 py-2 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-gray-400"
                disabled={loading}
              />
              <button onClick={send} disabled={loading || !input.trim()}
                className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50 flex-shrink-0">
                <Send size={15}/>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
