"use client"

import * as React from "react"
import { Send, User, Bot, ChevronDown, Monitor, Cloud, Zap, DollarSign, AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  id?: string
  actions?: { label: string; icon?: React.ReactNode; onClick: () => void }[]
  downloadProgress?: {
    modelId: string
    progress: number
    totalSize: number
    downloaded: number // current downloaded bytes
    speed: string
    eta: string
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
    
    // 1. /pull command with STREAMING
    if (inputLower.startsWith("/pull ") || inputLower.startsWith("pull ") || inputLower.startsWith("hapie pull ")) {
        const cmdContent = input // Store for display
        setInput("")
        setIsLoading(true)
        
        // Add user message
        setMessages(prev => [...prev, { role: "user", content: cmdContent }])
        
        // Add temporary "Downloading..." message that we will update
        const downloadMsgId = Date.now().toString()
        setMessages(prev => [...prev, { 
            role: "assistant", 
            content: "Initializing download...",
            id: downloadMsgId // Track this message
        }])

        try {
            const response = await fetch("http://localhost:8000/api/models/pull-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: cmdContent })
            })

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            
            if (!reader) throw new Error("No stream reader")

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                
                const chunk = decoder.decode(value, { stream: true })
                const lines = chunk.split("\n").filter(line => line.trim() !== "")
                
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line)
                        
                        // Update the download message
                        setMessages(prev => prev.map(msg => {
                            if (msg.id !== downloadMsgId) return msg
                            
                            if (data.status === "error") {
                                return { ...msg, content: `Error: ${data.error}`, id: undefined }
                            }
                            
                            if (data.status === "complete") {
                                return { ...msg, content: `**${data.modelId}** downloaded successfully!`, downloadProgress: undefined, actions: [] }
                            }
                            
                            // Progress bar UI
                            const progress = Math.round(data.progress || 0)
                            const speed = data.speed || "0 MB/s"
                            const eta = data.eta || "?"
                            
                            return {
                                ...msg,
                                content: `Pulling **${data.modelId}**`,
                                downloadProgress: {
                                    modelId: data.modelId,
                                    progress: progress,
                                    totalSize: data.totalSize,
                                    downloaded: data.downloaded || 0,
                                    speed: speed,
                                    eta: eta
                                },
                                actions: [
                                    { 
                                        label: "Stop", 
                                        icon: <X className="h-4 w-4" />, 
                                        onClick: () => handleCancelDownload(data.modelId, downloadMsgId) 
                                    }
                                ]
                            }
                        }))
                        
                        if (data.status === "complete") {
                            await loadModels() // Refresh list
                        }
                    } catch (e) {
                        console.error("Parse error", e)
                    }
                }
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Download Failed",
                description: error instanceof Error ? error.message : "Network error"
            })
        } finally {
            setIsLoading(false)
        }
        return
    }

    // 2. /recommend or /best command
    if (inputLower.startsWith("/best ") || inputLower.startsWith("/recommend ") || inputLower.startsWith("best ") || inputLower.startsWith("recommend ") || inputLower.startsWith("hapie recommend ")) {
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

  const handleCancelDownload = async (modelId: string, msgId: string) => {
    try {
        await fetch("http://localhost:8000/api/models/pull/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model_id: modelId })
        })
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: "🛑 Download cancelled.", actions: [] } : m))
    } catch (e) {
        console.error("Cancel failed", e)
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
              key={message.id || i}
              className={cn(
                "group flex gap-3 p-4",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "user" ? (
                <div className="order-2 flex flex-col items-end max-w-[70%]">
                  <div className="rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground shadow-md whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              ) : (
                /* AI messages: left side, gray + metrics */
                <div className="order-1 flex flex-col items-start max-w-[70%]">
                  <div className="rounded-2xl bg-muted px-4 py-3 text-sm shadow-md whitespace-pre-wrap">
                    {message.content}
                    {message.downloadProgress && (
                      <div className="mt-4 space-y-2 min-w-[280px]">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Progress value={message.downloadProgress.progress} className="h-1.5" />
                          </div>
                          {message.actions?.map((action, idx) => (
                            <Button 
                              key={idx} 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 w-6 rounded-full hover:bg-muted-foreground/10 p-0" 
                              onClick={action.onClick}
                              title={action.label}
                            >
                              {action.icon}
                            </Button>
                          ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                          <span>
                            {(message.downloadProgress.downloaded / (1024 * 1024 * 1024)).toFixed(2)} GB / 
                            {(message.downloadProgress.totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB 
                            ({message.downloadProgress.progress}%)
                          </span>
                          <span>{message.downloadProgress.speed} • {message.downloadProgress.eta} left</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {message.actions && message.actions.length > 0 && !message.downloadProgress && (
                    <div className="flex gap-2 mt-2">
                      {message.actions.map((action, idx) => (
                        <Button 
                          key={idx} 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-[10px] px-2 gap-1.5 border-muted-foreground/20 hover:bg-muted"
                          onClick={action.onClick}
                        >
                          {action.icon}
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}

                  {message.metrics && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {message.metrics.latency_ms !== undefined && (
                        <>{(message.metrics.latency_ms / 1000).toFixed(2)}s latency - </>
                      )}
                      {message.metrics.tokens_per_sec !== undefined && (
                        <>{message.metrics.tokens_per_sec.toFixed(1)} t/s - </>
                      )}
                      {message.metrics.provider || getBackendDisplay()}
                    </div>
                  )}
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
            placeholder={selectedModel ? "Ask anything… or type: hapie pull phi3, best coding model, compare qwen tinyllama" : "Select a model or type: hapie pull phi3..."}
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
