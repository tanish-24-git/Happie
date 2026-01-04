"use client"

import * as React from "react"
import { Play, Check, Clock, Zap, Cpu, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

const MODELS = [
  { id: "llama-3-8b", name: "Llama 3.1 8B", type: "Local", backend: "CUDA" },
  { id: "mistral-v3", name: "Mistral v0.3", type: "Local", backend: "ONNX" },
  { id: "gpt-4o", name: "GPT-4o", type: "Cloud", backend: "API" },
  { id: "claude-sonnet", name: "Claude 3.5 Sonnet", type: "Cloud", backend: "API" },
]

export function ModelComparison() {
  const [prompt, setPrompt] = React.useState("")
  const [selectedModels, setSelectedModels] = React.useState(["llama-3-8b", "mistral-v3"])
  const [isRunning, setIsRunning] = React.useState(false)
  const [results, setResults] = React.useState<any[]>([])

  const toggleModel = (id: string) => {
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : prev.length < 4 ? [...prev, id] : prev,
    )
  }

  const runComparison = () => {
    if (!prompt.trim() || selectedModels.length === 0) return
    setIsRunning(true)
    setResults([])

    // Simulated staggered results
    selectedModels.forEach((id, index) => {
      setTimeout(
        () => {
          const model = MODELS.find((m) => m.id === id)
          setResults((prev) => [
            ...prev,
            {
              ...model,
              latency: Math.floor(Math.random() * 2000) + 500,
              tokens: Math.floor(Math.random() * 50) + 20,
              content: `Inference results for ${model?.name}. High analytical fidelity detected. The prompt was analyzed using ${model?.backend} backend. Tokens generated: ${Math.floor(Math.random() * 1000)}.`,
            },
          ])
          if (index === selectedModels.length - 1) setIsRunning(false)
        },
        index * 800 + 500,
      )
    })
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* Configuration Header */}
      <div className="border-b bg-muted/20 p-6 space-y-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Global Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a single prompt to compare across models..."
              className="min-h-[80px] bg-background"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-medium uppercase text-muted-foreground block">
                  Select Models (Max 4)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {MODELS.map((model) => (
                    <div
                      key={model.id}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-1.5 transition-colors cursor-pointer",
                        selectedModels.includes(model.id) ? "bg-primary/5 border-primary/50" : "hover:bg-muted/50",
                      )}
                      onClick={() => toggleModel(model.id)}
                    >
                      <Checkbox
                        checked={selectedModels.includes(model.id)}
                        onCheckedChange={() => toggleModel(model.id)}
                      />
                      <span className="text-xs font-medium">{model.name}</span>
                      <Badge variant="outline" className="text-[9px] h-3.5 px-1 uppercase leading-none">
                        {model.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Button
              onClick={runComparison}
              disabled={isRunning || !prompt.trim() || selectedModels.length === 0}
              className="gap-2"
            >
              <Play className="h-4 w-4 fill-current" />
              Run Comparison
            </Button>
          </div>
        </div>
      </div>

      {/* Results Side-by-Side */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div
            className={cn(
              "grid gap-6",
              selectedModels.length === 1
                ? "grid-cols-1"
                : selectedModels.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
            )}
          >
            {selectedModels.map((id) => {
              const result = results.find((r) => r.id === id)
              const model = MODELS.find((m) => m.id === id)

              return (
                <div key={id} className="flex flex-col rounded-xl border bg-muted/10 overflow-hidden min-h-[400px]">
                  <div className="border-b bg-background p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold">{model?.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[9px] h-3.5">
                          {model?.backend}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] h-3.5">
                          {model?.type}
                        </Badge>
                      </div>
                    </div>
                    {result ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : isRunning ? (
                      <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    ) : null}
                  </div>

                  <div className="flex-1 p-4 space-y-4">
                    {result ? (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded border bg-background/50 p-2 space-y-1">
                            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground uppercase font-medium">
                              <Clock className="h-2.5 w-2.5" /> Latency
                            </div>
                            <div className="text-xs font-mono">{result.latency}ms</div>
                          </div>
                          <div className="rounded border bg-background/50 p-2 space-y-1">
                            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground uppercase font-medium">
                              <Zap className="h-2.5 w-2.5" /> Throughput
                            </div>
                            <div className="text-xs font-mono">{result.tokens} t/s</div>
                          </div>
                        </div>
                        <div className="text-sm leading-relaxed text-foreground/90 font-sans">{result.content}</div>
                      </>
                    ) : isRunning ? (
                      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                        <Cpu className="h-8 w-8 animate-pulse opacity-20" />
                        <span className="text-xs font-medium animate-pulse">Inference in progress...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground/50">
                        <BarChart3 className="h-8 w-8" />
                        <span className="text-xs">Ready for execution</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
