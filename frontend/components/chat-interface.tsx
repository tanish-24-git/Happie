"use client"

import * as React from "react"
import { Send, User, Bot, ChevronDown, Monitor, Cloud, Zap, DollarSign, AlertCircle } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"
import apiClient, { Model, ChatResponse } from "@/lib/api"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  metrics?: {
    latency_ms?: number
    tokens_per_sec?: number
    provider?: string
    estimated_cost_usd?: number
  }
}

export function ChatInterface() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState("")
  const [models, setModels] = React.useState<Model[]>([])
  const [selectedModel, setSelectedModel] = React.useState<Model | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [conversationId, setConversationId] = React.useState<string>()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Load models on mount
  React.useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    try {
      const modelsList = await apiClient.listModels()
      setModels(modelsList)
      
      // Get active model
      const activeModel = await apiClient.getActiveModel()
      if (activeModel) {
        setSelectedModel(activeModel)
      } else if (modelsList.length > 0) {
        // Select first local model as default
        const firstLocal = modelsList.find(m => m.backend !== 'cloud_api')
        setSelectedModel(firstLocal || modelsList[0])
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to load models",
        description: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return

    // Allow commands even if no model selected (we'll fix the disabled state separately)
    // But for now, we follow existing flow
    if (!selectedModel && !input.startsWith("/")) return

    const inputLower = input.toLowerCase()

    // DETECT COMMANDS
    
    // 1. /pull or "pull " command
    if (inputLower.startsWith("/pull ") || (inputLower.startsWith("pull ") && inputLower.length < 20)) {
        setMessages(prev => [...prev, { role: "user", content: input }])
        setInput("")
        setIsLoading(true)

        try {
            // Call pull-intent API
            const response = await apiClient.pullIntent({ query: input })
            
            // Reload models to include new one
            await loadModels()
            
            // Set as selected
            const newModel = await apiClient.getModel(response.model.id)
            if (newModel) {
                setSelectedModel(newModel)
            }
            
            // Success message
            setMessages(prev => [
                ...prev,
                {
                    role: "assistant", // Using assistant role to display system messages nicely
                    content: response.message
                }
            ])
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Failed to pull model",
                description: error instanceof Error ? error.message : "Unknown error"
            })
            setMessages(prev => [...prev, { role: "assistant", content: `[ERROR] ${error instanceof Error ? error.message : "Unknown error"}` }])
        } finally {
            setIsLoading(false)
        }
        return
    }

    // 2. /recommend or /best command
    if (inputLower.startsWith("/best ") || inputLower.startsWith("/recommend ") || inputLower.startsWith("best ") || inputLower.startsWith("recommend ")) {
        setMessages(prev => [...prev, { role: "user", content: input }])
        setInput("")
        setIsLoading(true)

        try {
            const response = await apiClient.recommendModels({ query: input })
            
            if (response.recommendations && response.recommendations.length > 0) {
                // Format recommendations
                const recText = response.recommendations.map((rec: any, idx: number) => 
                    `### ${idx + 1}. ${rec.name}\n${rec.reasoning}\n\n**Performance**: ${rec.performance.speed}, ${rec.performance.context} context\n\nTo install, type: **pull ${rec.model_id}**`
                ).join("\n\n---\n\n")
                
                setMessages(prev => [...prev, { role: "assistant", content: `Here are my recommendations:\n\n${recText}` }])
            } else {
                setMessages(prev => [...prev, { role: "assistant", content: "I couldn't find any specific recommendations for that." }])
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Failed to get recommendations",
                description: error instanceof Error ? error.message : "Unknown error"
            })
            setMessages(prev => [...prev, { role: "assistant", content: `[ERROR] Unable to get recommendations.` }])
        } finally {
            setIsLoading(false)
        }
        return
    }

    // NORMAL CHAT FLOW
    if (!selectedModel) return

    const userMessage: ChatMessage = { role: "user", content: input }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response: ChatResponse = await apiClient.chatSingle({
        prompt: input,
        model_id: selectedModel.id,
        conversation_id: conversationId,
      })

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.text,
        metrics: response.metrics,
      }

      setMessages(prev => [...prev, assistantMessage])
      setConversationId(response.conversation_id)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      
      toast({
        variant: "destructive",
        title: "Inference failed",
        description: errorMessage,
      })

      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `[ERROR] ${errorMessage}`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Separate models into local and cloud
  const localModels = models.filter(m => m.backend !== 'cloud_api')
  const cloudModels = models.filter(m => m.backend === 'cloud_api')

  // Check if selected model is cloud
  const isCloudModel = selectedModel?.backend === 'cloud_api'

  // Get backend display name
  const getBackendDisplay = () => {
    if (!selectedModel) return "No Model"
    if (selectedModel.backend === 'cloud_api') {
      return `Cloud API (${selectedModel.provider || 'Unknown'})`
    }
    return selectedModel.backend.toUpperCase()
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* Header with Model Selector */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2 font-medium">
              {isCloudModel ? <Cloud className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
              {selectedModel?.name || "Select Model"}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[250px]">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Local Models
              <Badge variant="outline" className="ml-auto text-[10px]">FREE</Badge>
            </DropdownMenuLabel>
            {localModels.map((model) => (
              <DropdownMenuItem
                key={model.id}
                className="gap-2"
                onClick={() => setSelectedModel(model)}
              >
                <Monitor className="h-4 w-4" />
                {model.name}
                {model.is_active && <Badge className="ml-auto text-[10px]">Active</Badge>}
              </DropdownMenuItem>
            ))}

            {cloudModels.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  Cloud Models
                  <Badge variant="destructive" className="ml-auto text-[10px]">PAID</Badge>
                </DropdownMenuLabel>
                {cloudModels.map((model) => (
                  <DropdownMenuItem
                    key={model.id}
                    className="gap-2"
                    onClick={() => setSelectedModel(model)}
                  >
                    <Cloud className="h-4 w-4" />
                    {model.name}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {model.provider}
                    </span>
                  </DropdownMenuItem>
                ))}
              </>
            )}

            {models.length === 0 && (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                No models available
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-4">
          {isCloudModel && (
            <Badge variant="destructive" className="text-xs gap-1">
              <DollarSign className="h-3 w-3" />
              Usage-based pricing
            </Badge>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="h-3 w-3 text-amber-500" />
            <span>{getBackendDisplay()}</span>
          </div>
          <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            Single Model Mode
          </Badge>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-8">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready for inference</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {selectedModel 
                  ? `${selectedModel.name} is loaded. Start a conversation below.`
                  : "Select a model and start chatting."}
              </p>
            </div>
          )}

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
                    "rounded-lg px-4 py-2 leading-relaxed whitespace-pre-wrap",
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/30 border",
                  )}
                >
                  {message.content}
                </div>
                {message.role === "assistant" && message.metrics && (
                  <div className="flex items-center gap-2 px-1 text-[10px] text-muted-foreground">
                    {message.metrics.latency_ms && (
                      <>
                        <span>{(message.metrics.latency_ms / 1000).toFixed(2)}s latency</span>
                        <span>•</span>
                      </>
                    )}
                    {message.metrics.tokens_per_sec && (
                      <>
                        <span>{message.metrics.tokens_per_sec.toFixed(1)} t/s</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{message.metrics.provider || getBackendDisplay()}</span>
                    {message.metrics.estimated_cost_usd && (
                      <>
                        <span>•</span>
                        <span className="text-amber-500">
                          ${message.metrics.estimated_cost_usd.toFixed(4)}
                        </span>
                      </>
                    )}
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

          {isLoading && (
            <div className="flex gap-4 text-sm">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-muted/50">
                <Bot className="h-4 w-4 animate-pulse" />
              </div>
              <div className="max-w-[80%] space-y-2">
                <div className="rounded-lg px-4 py-2 bg-muted/30 border">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4">
        {!selectedModel && (
          <div className="mx-auto max-w-3xl mb-3 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Please select a model to start chatting</span>
          </div>
        )}

        <div className="mx-auto max-w-3xl relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedModel ? "Ask the active model..." : "Select a model or type /pull..."}
            className="min-h-[60px] pr-12 resize-none bg-muted/20 border-muted"
            disabled={isLoading}
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
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          {isCloudModel 
            ? `Cloud inference via ${selectedModel?.provider}. Usage billed directly to your account.`
            : "Local inference on your hardware. Data stays private."}
        </p>
      </div>
    </div>
  )
}
