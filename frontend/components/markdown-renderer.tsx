"use client"

import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface MarkdownRendererProps {
  content: string
  className?: string
}

function CodeBlock({ 
  language, 
  value 
}: { 
  language: string | undefined
  value: string 
}) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-border/50 bg-zinc-950">
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-border/50">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          {language || "code"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </Button>
      </div>
      
      {/* Code content */}
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: "transparent",
          fontSize: "0.875rem",
          lineHeight: "1.5",
        }}
        showLineNumbers={value.split("\n").length > 3}
        lineNumberStyle={{
          minWidth: "2.5em",
          paddingRight: "1em",
          color: "#4a5568",
          userSelect: "none",
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-sm text-primary">
      {children}
    </code>
  )
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("markdown-content", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "")
            const value = String(children).replace(/\n$/, "")
            
            if (!inline && (match || value.includes("\n"))) {
              return <CodeBlock language={match?.[1]} value={value} />
            }
            
            return <InlineCode>{children}</InlineCode>
          },
          
          // Headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 pb-2 border-b">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mt-5 mb-3">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mt-3 mb-2">{children}</h4>
          ),
          
          // Paragraphs
          p: ({ children }) => (
            <p className="mb-3 leading-relaxed">{children}</p>
          ),
          
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3 space-y-1 ml-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1 ml-2">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/50 pl-4 py-1 my-3 bg-muted/30 rounded-r-lg italic">
              {children}
            </blockquote>
          ),
          
          // Links
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              {children}
            </a>
          ),
          
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-border rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-sm font-semibold border-b">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-sm border-b border-border/50">{children}</td>
          ),
          
          // Horizontal rule
          hr: () => <hr className="my-6 border-border" />,
          
          // Strong and emphasis
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          
          // Images
          img: ({ src, alt }) => (
            <img 
              src={src} 
              alt={alt || ""} 
              className="max-w-full h-auto rounded-lg my-4 border"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
