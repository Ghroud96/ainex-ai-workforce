"use client";

import { useState } from "react";

type Message = {
  role: "user" | "ai";
  content: string;
};

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "user",
      content: "How is my company doing today?",
    },
    {
      role: "ai",
      content:
        "Revenue increased by 18%, but inventory risk was detected for Ganick Ginger. ABC Distributor has not reordered for 27 days. Recommendation: contact ABC Distributor today.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: data.reply || "No response generated.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "AI request failed. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0B1120] text-white">
      <div className="mx-auto max-w-5xl p-10">
        <h1 className="text-4xl font-bold">AI Chat</h1>
        <p className="mt-2 text-slate-400">
          Ask AINEX anything about your business.
        </p>

        <div className="mt-10 rounded-xl bg-slate-900 p-6">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "rounded-lg bg-slate-800 p-4"
                    : "rounded-lg bg-blue-950 p-4"
                }
              >
                <p
                  className={
                    message.role === "user"
                      ? "text-sm text-slate-400"
                      : "text-sm text-blue-300"
                  }
                >
                  {message.role === "user" ? "You" : "AINEX AI"}
                </p>

                <p className="mt-1 whitespace-pre-wrap text-slate-200">
                  {message.content}
                </p>
              </div>
            ))}

            {loading && (
              <div className="rounded-lg bg-blue-950 p-4">
                <p className="text-sm text-blue-300">AINEX AI</p>
                <p className="mt-1 text-slate-200">Thinking...</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              className="flex-1 rounded-lg bg-slate-800 p-4 text-white outline-none"
              placeholder="Ask your business AI..."
            />

            <button
              onClick={sendMessage}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 font-semibold disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}