import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, RotateCcw, Check } from "lucide-react";

function CodeBlock({ inline, className, children }) {
  const [copied, setCopied] = useState(false);
  const raw = String(children || "");

  if (inline) {
    return (
      <code className="bg-[#2d3342] px-1.5 py-0.5 rounded text-sm font-mono text-[#e6edf3]">
        {children}
      </code>
    );
  }

  const languageMatch = /language-(\w+)/.exec(className || "");
  const language = languageMatch ? languageMatch[1] : "text";
  const code = raw.replace(/\n$/, "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // no-op
    }
  };

  return (
    <div className="relative my-4 rounded-lg border border-[#30363d] overflow-hidden bg-[#0f1420]">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#30363d] bg-[#111827]">
        <span className="text-[10px] uppercase tracking-wide text-zinc-400">{language}</span>
        <button
          onClick={handleCopy}
          className="text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Copy code"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{ margin: 0, padding: "12px", background: "transparent" }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export default function MessageBubble({ message, isLast, onRetry, isStreaming = false }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [showRetryMenu, setShowRetryMenu] = useState(false);
  const citationLinks = useMemo(() => {
    const links = [];
    const seen = new Set();
    const regex = /\[source\]\((https?:\/\/[^\s)]+)\)/gi;
    let match;
    while ((match = regex.exec(message.content || "")) !== null) {
      const url = match[1];
      if (!seen.has(url)) {
        seen.add(url);
        links.push(url);
      }
    }
    return links;
  }, [message.content]);
  const citationIndexByUrl = useMemo(
    () => new Map(citationLinks.map((url, index) => [url, index + 1])),
    [citationLinks]
  );

  const getDomain = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "source";
    }
  };

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
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-4 last:mb-0 leading-7 text-zinc-200">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                  code: ({ children, inline, className }) => (
                    <CodeBlock inline={inline} className={className}>
                      {children}
                    </CodeBlock>
                  ),
                  ul: ({ children }) => <ul className="list-disc pl-6 space-y-2 my-4 text-zinc-300">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-6 space-y-2 my-4 text-zinc-300">{children}</ol>,
                  li: ({ children }) => <li className="leading-7">{children}</li>,
                  h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4 text-white hover:text-zinc-200 transition-colors">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-3 text-white">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-bold mt-4 mb-2 text-white">{children}</h3>,
                  table: ({ children }) => (
                    <div className="my-4 overflow-x-auto rounded-lg border border-[#30363d]">
                      <table className="w-full text-sm">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-[#111827] text-zinc-200">{children}</thead>,
                  tbody: ({ children }) => <tbody className="bg-[#0f1420] text-zinc-300">{children}</tbody>,
                  tr: ({ children }) => <tr className="border-b border-[#30363d] last:border-0">{children}</tr>,
                  th: ({ children }) => <th className="px-3 py-2 text-left font-semibold">{children}</th>,
                  td: ({ children }) => <td className="px-3 py-2 align-top">{children}</td>,
                  a: ({ href, children }) => {
                    const isSource = String(children).trim().toLowerCase() === "source";
                    if (!isSource) {
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-300 underline decoration-sky-400/70 underline-offset-2 hover:text-sky-200"
                        >
                          {children}
                        </a>
                      );
                    }

                    const sourceIndex = citationIndexByUrl.get(href) || "?";
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-300 underline decoration-zinc-500/70 underline-offset-2 hover:text-zinc-100"
                        title={`${getDomain(href || "")} - ${href || ""}`}
                      >
                        [{sourceIndex}]
                      </a>
                    );
                  },
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
            {citationLinks.length > 0 && (
              <ol className="mt-4 space-y-1 text-xs text-zinc-400">
                {citationLinks.map((url, index) => (
                  <li key={url} className="truncate">
                    <span className="mr-1 text-zinc-500">{index + 1}.</span>
                    <span className="mr-1 text-zinc-300">{getDomain(url)}</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-zinc-600/70 underline-offset-2 hover:text-zinc-200"
                      title={url}
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ol>
            )}

            {/* Action Buttons Footer */}
            {!isUser && !(isLast && isStreaming) && (
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
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <AnimatePresence>
                      {showRetryMenu && (
                        <>
                          <div className="fixed inset-0 z-0" onClick={() => setShowRetryMenu(false)} />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 6 }}
                            transition={{ duration: 0.14, ease: "easeOut" }}
                            className="absolute bottom-full left-0 mb-2.5 w-48 rounded-lg border border-white/20 bg-[linear-gradient(160deg,rgba(20,30,45,0.58),rgba(10,15,25,0.52))] backdrop-blur-xl shadow-[0_12px_30px_rgba(0,0,0,0.45)] overflow-hidden z-10 p-1.5"
                          >
                            <div className="px-1.5 pb-0.5 text-[9px] font-medium uppercase tracking-[0.07em] text-zinc-500">
                              Regenerate With
                            </div>
                            <button
                              onClick={() => { onRetry('quick'); setShowRetryMenu(false); }}
                              className="w-full min-h-9 px-2 py-1.5 text-left rounded-md transition-colors hover:bg-white/10"
                            >
                              <div>
                                <div className="text-[13px] font-semibold leading-4 text-zinc-100">Quick</div>
                                <div className="text-[11px] leading-4 text-zinc-400">Fast, direct response</div>
                              </div>
                            </button>

                            <button
                              onClick={() => { onRetry('deep'); setShowRetryMenu(false); }}
                              className="w-full min-h-9 px-2 py-1.5 text-left rounded-md transition-colors hover:bg-white/10 mt-0.5"
                            >
                              <div>
                                <div className="text-[13px] font-semibold leading-4 text-zinc-100">Think Deeper</div>
                                <div className="text-[11px] leading-4 text-zinc-400">Thorough, logical analysis</div>
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
