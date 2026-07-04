"use client";

import { useState } from "react";

export type ChatMessage = {
  role: "user" | "ai";
  content: string;
};

export default function ChatPanel({
  initialMessages = [],
  placeholder = "Ask your business AI...",
  aiLabel = "AINEX AI",
}: {
  initialMessages?: ChatMessage[];
  placeholder?: string;
  aiLabel?: string;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
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
    <div className="rounded-xl bg-slate-900 p-6">
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
              {message.role === "user" ? "You" : aiLabel}
            </p>

            <p className="mt-1 whitespace-pre-wrap text-slate-200">{message.content}</p>
          </div>
        ))}

        {loading && (
          <div className="rounded-lg bg-blue-950 p-4">
            <p className="text-sm text-blue-300">{aiLabel}</p>
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
          placeholder={placeholder}
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
  );
}
