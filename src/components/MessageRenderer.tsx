'use client';

import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageRendererProps {
  content: string;
  role: 'user' | 'assistant';
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-white/60 hover:text-white"
      aria-label={copied ? 'Copied!' : 'Copy code'}
      title={copied ? 'Copied!' : 'Copy code'}
    >
      {copied ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

function ImageWithLoading({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-white/50 text-sm italic">
        Image failed to load
      </div>
    );
  }

  return (
    <div className="relative my-3 rounded-xl overflow-hidden inline-block max-w-full">
      {!loaded && (
        <div className="w-64 h-48 bg-white/5 animate-pulse rounded-xl flex items-center justify-center">
          <svg className="w-8 h-8 text-white/20 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
      <img
        src={src}
        alt={alt || 'Generated image'}
        className={`max-w-full max-h-[400px] rounded-xl shadow-lg transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0 absolute'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        loading="lazy"
      />
    </div>
  );
}

export const MessageRenderer = React.memo(function MessageRenderer({ content, role }: MessageRendererProps) {
  // For user messages, keep them simple
  if (role === 'user') {
    return <p className="whitespace-pre-wrap text-sm sm:text-base">{content}</p>;
  }

  // Detect and extract image URLs from the content (from generate_image tool)
  const imageUrlPattern = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  const standaloneImageUrl = /^(https:\/\/oaidalleapiprodscus[^\s]+)$/gm;

  // Also detect raw DALL-E URLs and wrap them as images
  const processedContent = content.replace(standaloneImageUrl, '![$1]($1)');

  return (
    <div className="nova-markdown text-sm sm:text-base">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks with syntax highlighting
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            
            if (match) {
              return (
                <div className="relative my-3 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                    <span className="text-xs text-white/50 font-mono">{match[1]}</span>
                  </div>
                  <CopyButton text={codeString} />
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      borderRadius: 0,
                      background: 'rgba(255,255,255,0.03)',
                      fontSize: '0.85rem',
                    }}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }

            // Inline code
            return (
              <code className="px-1.5 py-0.5 bg-white/10 rounded-md text-violet-300 font-mono text-[0.85em]" {...props}>
                {children}
              </code>
            );
          },

          // Images (including DALL-E generated)
          img({ src, alt }) {
            if (!src || typeof src !== 'string') return null;
            return <ImageWithLoading src={src} alt={String(alt || 'Image')} />;
          },

          // Links
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
              >
                {children}
                <svg className="inline-block w-3 h-3 ml-0.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            );
          },

          // Tables
          table({ children }) {
            return (
              <div className="my-3 overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-sm">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-white/5 text-white/80">{children}</thead>;
          },
          th({ children }) {
            return <th className="px-3 py-2 text-left font-medium border-b border-white/10">{children}</th>;
          },
          td({ children }) {
            return <td className="px-3 py-2 border-b border-white/5">{children}</td>;
          },

          // Lists
          ul({ children }) {
            return <ul className="my-2 ml-4 space-y-1 list-disc list-outside marker:text-violet-400/60">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-2 ml-4 space-y-1 list-decimal list-outside marker:text-violet-400/60">{children}</ol>;
          },
          li({ children }) {
            return <li className="pl-1">{children}</li>;
          },

          // Headings
          h1({ children }) {
            return <h1 className="text-xl font-bold mt-4 mb-2 text-white">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-semibold mt-3 mb-2 text-white">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold mt-3 mb-1 text-white">{children}</h3>;
          },

          // Blockquotes
          blockquote({ children }) {
            return (
              <blockquote className="my-2 pl-4 border-l-2 border-violet-400/50 text-white/70 italic">
                {children}
              </blockquote>
            );
          },

          // Horizontal rules
          hr() {
            return <hr className="my-4 border-white/10" />;
          },

          // Paragraphs
          p({ children }) {
            return <p className="my-1.5 leading-relaxed">{children}</p>;
          },

          // Strong & emphasis
          strong({ children }) {
            return <strong className="font-semibold text-white">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-white/90">{children}</em>;
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});
