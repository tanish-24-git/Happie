"use client"

import * as React from "react"
import { ImageIcon, Settings2, Download, RefreshCcw, Wand2, Monitor, Cloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function ImageGeneration() {
  const [prompt, setPrompt] = React.useState("")
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [generatedImage, setGeneratedImage] = React.useState<string | null>(null)

  const handleGenerate = () => {
    if (!prompt.trim()) return
    setIsGenerating(true)
    // Simulated generation
    setTimeout(() => {
      setGeneratedImage("/abstract-generative-art.jpg")
      setIsGenerating(false)
    }, 3000)
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-background">
      {/* Parameters Sidebar */}
      <div className="w-80 border-r bg-muted/10 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-background/50">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Settings2 className="h-4 w-4" />
            Generation Parameters
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Model</label>
              <Select defaultValue="sdxl-local">
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sdxl-local">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-3.5 w-3.5" /> Stable Diffusion XL (Local)
                    </div>
                  </SelectItem>
                  <SelectItem value="flux-cloud">
                    <div className="flex items-center gap-2">
                      <Cloud className="h-3.5 w-3.5" /> Flux.1 (Cloud)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Resolution
                </label>
                <span className="text-[10px] font-mono">1024 x 1024</span>
              </div>
              <Select defaultValue="1024x1024">
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">1024 x 1024 (1:1)</SelectItem>
                  <SelectItem value="1280x720">1280 x 720 (16:9)</SelectItem>
                  <SelectItem value="720x1280">720 x 1280 (9:16)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Steps
                  </label>
                  <span className="text-[10px] font-mono">30</span>
                </div>
                <Slider defaultValue={[30]} max={100} step={1} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Guidance Scale
                  </label>
                  <span className="text-[10px] font-mono">7.5</span>
                </div>
                <Slider defaultValue={[7.5]} max={20} step={0.5} />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Seed</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Random"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                />
                <Button variant="outline" size="icon" className="shrink-0 h-9 w-9 bg-transparent">
                  <RefreshCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <ScrollArea className="flex-1 p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="relative group">
              <div className="aspect-square rounded-2xl border bg-muted/20 overflow-hidden flex items-center justify-center border-dashed border-muted">
                {generatedImage ? (
                  <img
                    src={generatedImage || "/placeholder.svg"}
                    alt="Generated"
                    className="w-full h-full object-contain"
                  />
                ) : isGenerating ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <span className="text-xs font-medium animate-pulse">Running Diffusion Pipeline (Local)...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                    <ImageIcon className="h-16 w-16" />
                    <span className="text-sm">Enter a prompt to start generation</span>
                  </div>
                )}
              </div>
              {generatedImage && (
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button size="sm" variant="secondary" className="bg-background/80 backdrop-blur">
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Floating Prompt Bar */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4">
          <div className="relative group bg-background/80 backdrop-blur-xl border rounded-2xl shadow-2xl p-2 transition-all hover:border-primary/30">
            <div className="flex flex-col gap-2">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className="border-0 bg-transparent focus-visible:ring-0 resize-none min-h-[60px] text-sm"
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] h-5">
                    SDXL 1.0
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 bg-emerald-500/10 text-emerald-500 border-emerald-500/10"
                  >
                    Local CUDA
                  </Badge>
                </div>
                <Button size="sm" className="gap-2" onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
                  <Wand2 className="h-4 w-4" />
                  Generate
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
