"use client"

import * as React from "react"
import { Send, User, Bot, ChevronDown, Monitor, Cloud, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const INITIAL_MESSAGES = [
  {
    role: "assistant",
    content: "System ready. Local inference active on CUDA device 0. How can I assist with your deployment today?",
  },
]

export function ChatInterface() {
  const [messages, setMessages] = React.useState(INITIAL_MESSAGES)
  const [input, setInput] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const handleSend = () => {
    if (!input.trim()) return
    setMessages([...messages, { role: "user", content: input }])
    setInput("")
    // Mock assistant response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Received. Analyzing request with Llama 3.1 (Local)... Processing tokens at 42 t/s.",
        },
      ])
    }, 1000)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* Header with Model Selector */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2 font-medium">
              <Bot className="h-4 w-4" />
              Llama 3.1 8B
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            <DropdownMenuLabel>Local Models</DropdownMenuLabel>
            <DropdownMenuItem className="gap-2">
              <Monitor className="h-4 w-4" /> Llama 3.1 8B <Badge className="ml-auto">Active</Badge>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <Monitor className="h-4 w-4" /> Mistral v0.3
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Cloud Models</DropdownMenuLabel>
            <DropdownMenuItem className="gap-2">
              <Cloud className="h-4 w-4" /> GPT-4o
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <Cloud className="h-4 w-4" /> Claude 3.5 Sonnet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="h-3 w-3 text-amber-500" />
            <span>CUDA</span>
          </div>
          <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            Single Model Mode
          </Badge>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-8">
          {messages.map((message, i) => (
            <div
              key={i}
              className={cn("flex gap-4 text-sm", message.role === "user" ? "justify-end" : "justify-start")}
            >
              {message.role === "assistant" && (
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-muted/50">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div className={cn("max-w-[80%] space-y-2", message.role === "user" && "text-right")}>
                <div
                  className={cn(
                    "rounded-lg px-4 py-2 leading-relaxed",
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/30 border",
                  )}
                >
                  {message.content}
                </div>
                {message.role === "assistant" && (
                  <div className="flex items-center gap-2 px-1 text-[10px] text-muted-foreground">
                    <span>1.2s latency</span>
                    <span>•</span>
                    <span>Local (CUDA)</span>
                  </div>
                )}
              </div>
              {message.role === "user" && (
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-primary text-primary-foreground">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="mx-auto max-w-3xl relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the active model..."
            className="min-h-[60px] pr-12 resize-none bg-muted/20 border-muted"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <Button
            size="icon"
            className="absolute bottom-2 right-2 h-8 w-8 transition-transform active:scale-95"
            onClick={handleSend}
            disabled={!input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Inference performed on local hardware. Data stays private.
        </p>
      </div>
    </div>
  )
}
