import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Copy, RotateCcw, Check, Sparkles, Zap } from "lucide-react";

export default function MessageBubble({ message, isLast, onRetry }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [showRetryMenu, setShowRetryMenu] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`w-full py-2 ${isUser ? "" : ""}`}
    >
      <div className={`max-w-4xl mx-auto px-6`}>
        {isUser ? (
          <div className="flex justify-end">
            <div className="px-3 py-2 shadow-lg max-w-[80%] break-words rounded-2xl bg-[#1e2942] bg-opacity-50 border border-white/5">
              <div className="whitespace-pre-wrap leading-6 text-left text-zinc-100">
                {message.content}
              </div>
            </div>
          </div>
        ) : (
          <div className="group relative">
            <div className="text-[#ececf1] leading-7">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-4 last:mb-0 leading-7 text-zinc-200">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                  code: ({ children, inline }) => {
                    if (inline) {
                      return <code className="bg-[#2d3342] px-1.5 py-0.5 rounded text-sm font-mono text-[#e6edf3]">{children}</code>
                    }
                    return (
                      <div className="relative group/code my-4">
                        <pre className="bg-[#161b22] p-4 rounded-lg overflow-x-auto border border-[#30363d]">
                          <code>{children}</code>
                        </pre>
                      </div>
                    )
                  },
                  ul: ({ children }) => <ul className="list-disc pl-6 space-y-2 my-4 text-zinc-300">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-6 space-y-2 my-4 text-zinc-300">{children}</ol>,
                  li: ({ children }) => <li className="leading-7">{children}</li>,
                  h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4 text-white hover:text-zinc-200 transition-colors">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-3 text-white">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-bold mt-4 mb-2 text-white">{children}</h3>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-zinc-600 pl-4 my-4 text-zinc-400 italic bg-white/5 py-2 rounded-r-lg">
                      {children}
                    </blockquote>
                  )
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Action Buttons Footer */}
            {!isUser && (
              <div className="flex items-center gap-1 mt-4">
                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  className="p-2 text-zinc-500 hover:text-zinc-100 hover:bg-white/5 rounded-xl transition-all duration-200 border border-transparent hover:border-white/5 flex items-center justify-center backdrop-blur-sm"
                  title="Copy to clipboard"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                      >
                        <Check className="w-4 h-4 text-zinc-300" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                      >
                        <Copy className="w-4 h-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>

                {/* Retry Button & Menu */}
                {isLast && onRetry && (
                  <div className="relative">
                    <button
                      onClick={() => setShowRetryMenu(!showRetryMenu)}
                      className={`p-2 rounded-xl transition-all duration-200 border flex items-center gap-1.5 backdrop-blur-sm ${showRetryMenu
                        ? 'bg-white/5 border-white/10 text-white shadow-2xl'
                        : 'text-zinc-500 hover:text-zinc-100 hover:bg-white/5 border-transparent hover:border-white/5'
                        }`}
                      title="Regenerate response"
                    >
                      <RotateCcw className={`w-4 h-4 ${showRetryMenu ? 'animate-spin' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showRetryMenu && (
                        <>
                          <div className="fixed inset-0 z-0" onClick={() => setShowRetryMenu(false)} />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute bottom-full left-0 mb-3 w-52 bg-[#0c0c0e]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden z-10 p-1.5 space-y-0.5"
                          >
                            <button
                              onClick={() => { onRetry('quick'); setShowRetryMenu(false); }}
                              className="w-full px-3 py-2.5 text-left rounded-xl flex items-center gap-3 transition-all hover:bg-white/5 group/opt"
                            >
                              <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center border border-white/5 group-hover/opt:border-white/10 transition-colors">
                                <Zap className="w-4 h-4 text-zinc-400 group-hover/opt:text-white transition-colors" />
                              </div>
                              <div>
                                <div className="text-[13px] font-semibold text-zinc-200">Quick</div>
                                <div className="text-[10px] text-zinc-500">Fast, direct response</div>
                              </div>
                            </button>

                            <button
                              onClick={() => { onRetry('deep'); setShowRetryMenu(false); }}
                              className="w-full px-3 py-2.5 text-left rounded-xl flex items-center gap-3 transition-all hover:bg-white/5 group/opt"
                            >
                              <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center border border-white/5 group-hover/opt:border-white/10 transition-colors">
                                <Sparkles className="w-4 h-4 text-zinc-400 group-hover/opt:text-white transition-colors" />
                              </div>
                              <div>
                                <div className="text-[13px] font-semibold text-zinc-200">Think Deeper</div>
                                <div className="text-[10px] text-zinc-500">Thorough, logical analysis</div>
                              </div>
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}