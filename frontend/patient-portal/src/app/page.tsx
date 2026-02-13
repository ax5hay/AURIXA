"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
}

export default function PatientPortalPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hello! How can I help you today? You can ask about appointments, lab results, or billing.", sender: "bot" },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newUserMessage: Message = {
      id: Date.now(),
      text: inputText,
      sender: "user",
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setInputText("");
    setIsLoading(true);

    // Simulate a bot response
    setTimeout(() => {
      const botResponse: Message = {
        id: Date.now() + 1,
        text: `I'm sorry, I'm still under development. I received your message: "${inputText}"`,
        sender: "bot",
      };
      setMessages((prev) => [...prev, botResponse]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-center my-4 text-gradient">
        Your Virtual Assistant
      </h1>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 glass rounded-t-xl">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${
                message.sender === 'user'
                  ? 'bg-aurixa-500 text-white'
                  : 'bg-surface-secondary text-white/90'
              }`}
            >
              {message.text}
            </div>
          </motion.div>
        ))}
        {isLoading && (
           <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
           >
            <div className="max-w-xs px-4 py-2 rounded-2xl bg-surface-secondary text-white/90">
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-aurixa-500 rounded-full animate-pulse-fast"></span>
                    <span className="h-2 w-2 bg-aurixa-500 rounded-full animate-pulse-slow"></span>
                    <span className="h-2 w-2 bg-aurixa-500 rounded-full animate-pulse-slower"></span>
                </div>
            </div>
           </motion.div>
        )}
      </div>
      <form onSubmit={handleSendMessage} className="p-4 glass rounded-b-xl">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow bg-transparent focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="text-aurixa-400 hover:text-aurixa-300 disabled:text-white/30"
            disabled={isLoading}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3.105 3.105a1 1 0 0 1 1.414 0L10 8.586l5.48-5.481a1 1 0 0 1 1.415 1.415L11.414 10l5.481 5.48a1 1 0 0 1-1.415 1.415L10 11.414l-5.48 5.481a1 1 0 0 1-1.415-1.415L8.586 10 3.105 4.52a1 1 0 0 1 0-1.414Z"/>
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
