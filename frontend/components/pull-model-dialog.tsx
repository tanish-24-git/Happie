"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Zap, ExternalLink } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import apiClient from "@/lib/api"

interface PullModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function PullModelDialog({ open, onOpenChange, onSuccess }: PullModelDialogProps) {
  const [tab, setTab] = useState("catalog")
  const [customRepo, setCustomRepo] = useState("")
  const [customFilename, setCustomFilename] = useState("")
  const [customName, setCustomName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  const handlePullCatalog = async (modelId: string) => {
    setLoading(true)
    setError("")
    try {
      await apiClient.pullIntent({
        query: `hapie pull ${modelId}`
      })
      toast({ title: "Success", description: "Model pulled and activated!" })
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message
      setError(message)
      toast({ title: "Error", description: message, variant: "destructive" })
    }
    setLoading(false)
  }

  const handlePullCustom = async () => {
    if (!customRepo || !customFilename) {
      setError("Please enter both repo ID and filename")
      return
    }

    setLoading(true)
    setError("")
    try {
      await apiClient.pullCustomModel({
        repo_id: customRepo,
        filename: customFilename,
        model_id: customName || undefined,
        name: customName || undefined
      })
      toast({ title: "Success", description: "Custom model pulled and activated!" })
      onOpenChange(false)
      setCustomRepo("")
      setCustomFilename("")
      setCustomName("")
      onSuccess?.()
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message
      setError(message)
      toast({ title: "Error", description: message, variant: "destructive" })
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pull Model</DialogTitle>
          <DialogDescription>
            Choose from curated models or pull any GGUF from HuggingFace
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="catalog">Curated (Safe)</TabsTrigger>
            <TabsTrigger value="custom">Custom (Any GGUF)</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Pre-configured models optimized for your hardware
            </div>
            <div className="grid gap-3">
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => handlePullCatalog("phi3")} disabled={loading}>
                <div className="text-left">
                  <div className="font-semibold">Phi-3 Mini 4K</div>
                  <div className="text-xs text-muted-foreground">2.4 GB • 4GB RAM • Coding</div>
                </div>
              </Button>

              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => handlePullCatalog("gemma")} disabled={loading}>
                <div className="text-left">
                  <div className="font-semibold">Gemma 2 2B</div>
                  <div className="text-xs text-muted-foreground">1.6 GB • 2GB RAM • Fast Chat</div>
                </div>
              </Button>

              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => handlePullCatalog("qwen3b")} disabled={loading}>
                <div className="text-left">
                  <div className="font-semibold">Qwen 2.5 1.5B</div>
                  <div className="text-xs text-muted-foreground">1.1 GB • 2GB RAM • RAG</div>
                </div>
              </Button>

              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => handlePullCatalog("qwen05b")} disabled={loading}>
                <div className="text-left">
                  <div className="font-semibold">Qwen 2.5 0.5B</div>
                  <div className="text-xs text-muted-foreground">400 MB • 1GB RAM • Ultra-Fast</div>
                </div>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-2 mb-4">
              <div className="text-sm text-muted-foreground">Pull any GGUF model from HuggingFace</div>
              <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>Ensure model size fits available RAM</span>
              </div>
            </div>

            <div className="space-y-4 p-3 bg-muted/30 rounded-lg border">
              <div className="space-y-1">
                <Label htmlFor="repo-id" className="text-xs font-semibold">HuggingFace Repo ID *</Label>
                <Input
                  id="repo-id"
                  placeholder="e.g., bartowski/Qwen2-Deita-500m-GGUF"
                  value={customRepo}
                  onChange={(e) => setCustomRepo(e.target.value)}
                  disabled={loading}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="filename" className="text-xs font-semibold">Model Filename *</Label>
                <Input
                  id="filename"
                  placeholder="e.g., Qwen2-Deita-500m-Q4_K_M.gguf"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  disabled={loading}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="custom-name" className="text-xs font-semibold">Display Name (Optional)</Label>
                <Input
                  id="custom-name"
                  placeholder="e.g., Qwen2-Deita 500M"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="text-xs bg-background/50 p-2 rounded border border-dashed">
                <a
                  href="https://huggingface.co/search/full-text?q=GGUF"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline flex items-center gap-1"
                >
                  Find models on HuggingFace <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-500 p-2 bg-red-500/10 rounded border border-red-500/20">
                <strong>Error:</strong> {error}
              </div>
            )}

            <Button
              onClick={handlePullCustom}
              disabled={loading || !customRepo || !customFilename}
              className="w-full gap-2"
            >
              <Zap className="h-4 w-4" />
              {loading ? "Pulling..." : "Pull Custom Model"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
