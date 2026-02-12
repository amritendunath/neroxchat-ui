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
      className={`w-full py-2 ${isUser ? "" : ""
        }`}
    >
      <div className={`max-w-4xl mx-auto px-6`}>
        {isUser ? (
          <div className="flex justify-end">
            <div className="px-3 py-2 shadow-lg max-w-[80%] break-words rounded-2xl bg-[#1e2942] bg-opacity-50">
              <div className="whitespace-pre-wrap leading-6 text-left">
                {message.content}
              </div>
            </div>
          </div>
        ) : (
          <div className="group relative">
            <div className="text-[#ececf1] leading-7">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-4 last:mb-0 leading-7">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-gray-200">{children}</strong>,
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
                  ul: ({ children }) => <ul className="list-disc pl-6 space-y-2 my-4 text-gray-300">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-6 space-y-2 my-4 text-gray-300">{children}</ol>,
                  li: ({ children }) => <li className="leading-7">{children}</li>,
                  h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-100">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-3 text-gray-100">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-bold mt-4 mb-2 text-gray-100">{children}</h3>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-[#3b82f6] pl-4 my-4 text-gray-400 italic">
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
              <div className="flex items-center gap-2 mt-2">
                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#2d3342] rounded-md transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>

                {/* Retry Button & Menu */}
                {isLast && onRetry && (
                  <div className="relative">
                    <button
                      onClick={() => setShowRetryMenu(!showRetryMenu)}
                      className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#2d3342] rounded-md transition-colors flex items-center gap-1"
                      title="Regenerate response"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <AnimatePresence>
                      {showRetryMenu && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 5 }}
                          className="absolute bottom-full left-0 mb-2 w-40 bg-[#1e293b] border border-[#334155] rounded-lg shadow-xl overflow-hidden z-10"
                        >
                          <button
                            onClick={() => { onRetry('quick'); setShowRetryMenu(false); }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#334155] flex items-center gap-2"
                          >
                            <Zap className="w-3 h-3 text-yellow-400" /> Quick
                          </button>
                          <button
                            onClick={() => { onRetry('deep'); setShowRetryMenu(false); }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#334155] flex items-center gap-2"
                          >
                            <Sparkles className="w-3 h-3 text-purple-400" /> Think Deeper
                          </button>
                        </motion.div>
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