//frontend/src/components/ChatWidget.jsx
import React, { useEffect, useRef, useState } from "react";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      from: "bot",
      text: "Hi! I'm your auction assistant — I can help with bidding tips, show auctions ending soon, set alerts and more. Try: \"help\"",
    },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    if (open && endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function toggleOpen() {
    setOpen((v) => !v);
  }

  function handleClose() {
    setOpen(false);
  }

  async function sendToBackend(text) {
    const res = await fetch("http://localhost:5000/api/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    return data.reply;
  }

  async function handleSend(e) {
    e && e.preventDefault();
    const t = input.trim();
    if (!t) return;

    const userMsg = { id: Date.now(), from: "user", text: t };
    setMessages((p) => [...p, userMsg]);
    setInput("");

    const typingId = "typing-" + Date.now();
    setMessages((p) => [...p, { id: typingId, from: "bot", text: "Assistant is typing..." }]);

    try {
      const reply = await sendToBackend(t);
      setMessages((p) =>
        p
          .filter((m) => m.id !== typingId)
          .concat({ id: Date.now() + 1, from: "bot", text: reply })
      );
    } catch (err) {
      setMessages((p) =>
        p
          .filter((m) => m.id !== typingId)
          .concat({
            id: Date.now() + 1,
            from: "bot",
            text: "Sorry — failed to send. Check your network or backend.",
          })
      );
    }
  }

  return (
    <>
      <div
        className={`fixed right-6 z-[60] transition-all duration-300 ${
          open
            ? "bottom-6 pointer-events-auto"
            : "bottom-6 pointer-events-none"
        }`}
      >
        {/* Chat panel */}
        <div
          className={`transform transition-all duration-200 ${
            open
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "translate-y-4 opacity-0 pointer-events-none"
          }`}
        >
          <div className="w-80 sm:w-96 bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col border">
            {/* header */}
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                  AI
                </div>
                <div>
                  <div className="text-sm font-semibold">AI Assistant</div>
                  <div className="text-xs text-gray-500">
                    Auction help & bidding tips
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close chat"
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* messages area */}
            <div
              className="p-3 flex-1 overflow-y-auto max-h-70 space-y-3"
              role="log"
              aria-live="polite"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.from === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {m.from === "bot" ? (
                    <div
                      className="bg-gray-100 text-gray-800 px-3 py-2 rounded-xl max-w-[80%] text-sm"
                      dangerouslySetInnerHTML={{ __html: m.text }}
                    />
                  ) : (
                    <div className="bg-indigo-600 text-white px-3 py-2 rounded-xl max-w-[80%] text-sm">
                      {m.text}
                    </div>
                  )}
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* input area */}
            <form onSubmit={handleSend} className="p-3 border-t flex gap-2 items-center">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about bidding, auctions, alerts..."
                className="flex-1 text-sm px-3 py-2 rounded-full border focus:outline-none"
                aria-label="Type your message"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-full bg-indigo-600 text-white text-sm hover:bg-indigo-700"
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* floating button */}
        <div className="mt-2 flex justify-end pointer-events-auto">
          <button
            onClick={toggleOpen}
            aria-label={open ? "Hide chat" : "Open chat"}
            className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center bg-gradient-to-br from-indigo-500 to-pink-500 text-white text-xl transform hover:scale-105 transition-transform"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.048 9.048 0 01-4.255-1.029L3 20l1.029-4.745A8.962 8.962 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
