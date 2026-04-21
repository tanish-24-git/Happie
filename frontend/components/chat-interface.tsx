"use client"

import * as React from "react"
import {
  Send, Bot, ChevronDown, Monitor, Cloud, Zap, DollarSign,
  AlertCircle, X, Download, Cpu, Server, Layers, Sparkles,
  CheckCircle2, AlertTriangle, RotateCcw, Package, HardDrive
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import apiClient, { Model, ChatResponse } from "@/lib/api"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { Plasma } from "@/components/Plasma"

// ─── Types ─────────────────────────────────────────────────────────────────

interface QuantFile {
  filename: string
  quant: string | null
  quant_bits: number | null
  quality: string
  practical: boolean | null
  note: string
}

interface HardwareInfo {
  has_gpu: boolean
  gpu_vendor: string
  gpu_name: string
  vram_gb: number
  total_ram_gb: number
  recommended: "bitsandbytes" | "cpu_quant"
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  id?: string
  metrics?: { latency_ms?: number; tokens_per_sec?: number; provider?: string }
  actions?: { label: string; icon?: React.ReactNode; onClick: () => void }[]
  // ── pull flow states (mutually exclusive) ──────────────────────────────
  /** Step 0: ask user yes/no on quantization */
  quantIntent?: { repoId: string }
  /** Step 1a: GGUF files found, pick one */
  quantSelection?: { repoId: string; files: QuantFile[] }
  /** Step 1b: no GGUF, show runtime options */
  runtimeQuantOptions?: { repoId: string; hw: HardwareInfo }
  /** Downloading with progress bar */
  downloadProgress?: { modelId: string; progress: number; totalSize: number; downloaded: number; speed: string; eta: string }
  /** Styled error card */
  errorCard?: { message: string; type: "cancelled" | "auth" | "network" | "generic" }
}

// ─── Error Card ─────────────────────────────────────────────────────────────

function ErrorCard({
  message, type, onRetry, onDismiss,
}: {
  message: string
  type: "cancelled" | "auth" | "network" | "generic"
  onRetry?: () => void
  onDismiss: () => void
}) {
  const icons = {
    cancelled: <X className="h-4 w-4" />,
    auth: <AlertTriangle className="h-4 w-4" />,
    network: <AlertTriangle className="h-4 w-4" />,
    generic: <AlertCircle className="h-4 w-4" />,
  }
  const colours = {
    cancelled: "border-muted-foreground/30 bg-muted/20 text-muted-foreground",
    auth: "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400",
    network: "border-orange-500/30 bg-orange-500/5 text-orange-600 dark:text-orange-400",
    generic: "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400",
  }
  const titles = {
    cancelled: "Download Cancelled",
    auth: "Authentication Required",
    network: "Network Error",
    generic: "Error",
  }

  return (
    <div className={cn("mt-2 rounded-xl border px-4 py-3 flex items-start gap-3", colours[type])}>
      <div className="mt-0.5 shrink-0">{icons[type]}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{titles[type]}</div>
        <div className="text-xs mt-0.5 opacity-80 break-words">{message}</div>
        {type === "auth" && (
          <div className="text-xs mt-1 opacity-70">
            Go to <span className="font-semibold">Settings → HuggingFace Token</span> to configure access.
          </div>
        )}
      </div>
      <div className="flex gap-1.5 shrink-0">
        {onRetry && type !== "cancelled" && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] gap-1" onClick={onRetry}>
            <RotateCcw className="h-3 w-3" /> Retry
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onDismiss}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Quantization Intent Card (Step 0) ──────────────────────────────────────

function QuantIntentCard({
  repoId,
  onYes,
  onNo,
}: {
  repoId: string
  onYes: () => void
  onNo: () => void
}) {
  return (
    <div className="mt-3 rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/5 to-blue-500/5 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 bg-violet-500/10 border-b border-violet-500/15 flex items-center gap-2.5">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <span className="font-semibold text-sm text-violet-300">Quantization Strategy</span>
        <code className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
          {repoId}
        </code>
      </div>

      {/* Body */}
      <div className="px-4 py-4 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Do you want to <span className="text-foreground font-medium">quantize this model</span> before loading?
          Quantization compresses the model weights, reducing memory usage and speeding up inference — with minimal impact on output quality.
        </p>

        {/* Comparison table */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              With Quantization
            </div>
            <ul className="space-y-0.5 text-muted-foreground">
              <li>↓ 50–75% smaller file</li>
              <li>↓ Less RAM / VRAM needed</li>
              <li>↑ Faster inference speed</li>
              <li>≈ Minimal quality loss</li>
            </ul>
          </div>
          <div className="rounded-lg border border-muted-foreground/15 bg-muted/10 px-3 py-2.5 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              Without Quantization
            </div>
            <ul className="space-y-0.5 text-muted-foreground">
              <li>↑ Full precision weights</li>
              <li>↑ Best possible quality</li>
              <li>↑ More RAM / VRAM needed</li>
              <li>↓ Larger download size</li>
            </ul>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            className="gap-1.5 bg-violet-600 hover:bg-violet-500 text-white border-0 shadow-md shadow-violet-900/30"
            onClick={onYes}
          >
            <Layers className="h-3.5 w-3.5" />
            Yes, Select Quantization
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-muted-foreground/20 hover:bg-muted/60"
            onClick={onNo}
          >
            <Package className="h-3.5 w-3.5" />
            No, Download Full Model
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── GGUF Quantization Table (Step 1a) ──────────────────────────────────────

function QuantSelectionTable({
  repoId, files, onSelect, onBack,
}: {
  repoId: string
  files: QuantFile[]
  onSelect: (repoId: string, file: QuantFile) => void
  onBack: () => void
}) {
  const getFitBadge = (status: string, runMem: number) => {
    if (status === "gpu") return <Badge variant="outline" className="text-[9px] border-amber-500/40 bg-amber-500/10 text-amber-500 gap-1"><Zap className="h-2 w-2" /> GPU FIT</Badge>
    if (status === "ram") return <Badge variant="outline" className="text-[9px] border-emerald-500/40 bg-emerald-500/10 text-emerald-500 gap-1"><HardDrive className="h-2 w-2" /> RAM FIT</Badge>
    return <Badge variant="outline" className="text-[9px] border-red-500/40 bg-red-500/10 text-red-500 gap-1"><AlertTriangle className="h-2 w-2" /> EXCEEDS</Badge>
  }

  return (
    <div className="mt-3 rounded-xl border border-blue-500/20 overflow-hidden text-xs bg-muted/5">
      <div className="px-4 py-2.5 bg-blue-500/5 border-b border-blue-500/15 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <span className="font-semibold text-sm">Hardware-Matched Quantization</span>
          </div>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1" onClick={onBack}>
            ← Back
          </Button>
        </div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
          <code className="text-blue-400/80">{repoId}</code>
          <span>&bull;</span>
          <span>Predictions based on 1.2x architecture overhead</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-muted-foreground/10 bg-muted/15">
              {["Format", "Size", "Run RAM", "Fit Status", "Quality", ""].map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wide text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {files.map((f: any, i) => (
              <tr key={i} className="border-b border-muted-foreground/8 transition-colors hover:bg-blue-500/5">
                <td className="px-3 py-2.5 font-mono font-bold text-blue-300">{(f.quant || f.filename).replace(".gguf", "").toUpperCase()}</td>
                <td className="px-3 py-2.5 font-mono text-muted-foreground">{f.size_gb}GB</td>
                <td className="px-3 py-2.5 font-mono text-muted-foreground">{f.run_mem_gb}GB</td>
                <td className="px-3 py-2.5">{getFitBadge(f.fit_status, f.run_mem_gb)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{f.quality}</td>
                <td className="px-3 py-2.5">
                  <Button
                    size="sm"
                    variant={f.fit_status === "none" ? "ghost" : "outline"}
                    className={cn(
                      "h-6 text-[10px] px-2 gap-1",
                      f.fit_status === "none" ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" : "border-blue-500/30 hover:bg-blue-500/15"
                    )}
                    onClick={() => onSelect(repoId, f)}
                  >
                    <Download className="h-2.5 w-2.5" /> Pull
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2.5 text-[10px] text-muted-foreground bg-blue-500/5 border-t border-muted-foreground/8 flex gap-3 italic">
        <div className="flex items-center gap-1"><Zap className="h-3 w-3 text-amber-500" /> GPU: Maximum Speed</div>
        <div className="flex items-center gap-1"><HardDrive className="h-3 w-3 text-emerald-500" /> RAM: Standard Speed</div>
        <div className="flex items-center gap-1 ml-auto"><AlertTriangle className="h-3 w-3 text-red-500" /> Red rows will likely cause system OOM.</div>
      </div>
    </div>
  )
}

// ─── Runtime Quantization Card (Step 1b – no GGUF) ──────────────────────────

function RuntimeQuantCard({
  repoId, hw, onSelect, onBack,
}: {
  repoId: string
  hw: HardwareInfo
  onSelect: (runtime_quant: string) => void
  onBack: () => void
}) {
  const options = [
    ...(hw.has_gpu ? [{
      key: "bitsandbytes_4bit",
      icon: <Zap className="h-4 w-4 text-amber-400" />,
      label: "BitsAndBytes 4-bit",
      sublabel: "GPU Runtime Quantization",
      badge: `${hw.gpu_name} · ${hw.vram_gb} GB VRAM`,
      badgeColor: "text-amber-400 border-amber-500/30 bg-amber-500/10",
      pros: ["Best quality for GPU systems", "Quantized at inference time", "~75% less VRAM usage"],
      recommended: hw.recommended === "bitsandbytes",
    }] : []),
    {
      key: "onnx_int8",
      icon: <Cpu className="h-4 w-4 text-blue-400" />,
      label: "CPU INT8 (ONNX)",
      sublabel: "CPU Runtime Quantization",
      badge: `${hw.total_ram_gb} GB RAM · CPU`,
      badgeColor: "text-blue-400 border-blue-500/30 bg-blue-500/10",
      pros: ["Works on any hardware", "~50% less RAM usage", "ONNX Runtime engine"],
      recommended: hw.recommended === "cpu_quant",
    },
    {
      key: "full",
      icon: <Package className="h-4 w-4 text-muted-foreground" />,
      label: "Full Precision",
      sublabel: "No Quantization (fp32/fp16)",
      badge: "Max Quality",
      badgeColor: "text-muted-foreground border-muted-foreground/20 bg-muted/20",
      pros: ["Highest quality output", "Best for fine-tuning prep", "Needs most RAM/VRAM"],
      recommended: false,
    },
  ]

  return (
    <div className="mt-3 rounded-xl border border-orange-500/20 bg-orange-500/3 overflow-hidden text-xs">
      <div className="px-4 py-2.5 bg-orange-500/8 border-b border-orange-500/15 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Server className="h-4 w-4 text-orange-400" />
          <span className="font-semibold text-sm text-orange-300">Runtime Quantization Options</span>
          <code className="text-[10px] font-mono text-muted-foreground">{repoId}</code>
        </div>
        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1" onClick={onBack}>
          ← Back
        </Button>
      </div>

      <div className="px-4 py-3">
        <p className="text-muted-foreground mb-3 leading-relaxed">
          <span className="text-foreground font-medium">{repoId.split("/").pop()}</span> has no GGUF files.
          Select a runtime quantization strategy — the model will be downloaded in full and quantized when loaded.
        </p>

        <div className="space-y-2">
          {options.map((opt) => (
            <div
              key={opt.key}
              onClick={() => onSelect(opt.key)}
              className={cn(
                "relative flex items-start gap-3 rounded-lg border px-3 py-3 cursor-pointer transition-all",
                opt.recommended
                  ? "border-violet-500/40 bg-violet-500/8 hover:bg-violet-500/12"
                  : "border-muted-foreground/15 bg-muted/5 hover:bg-muted/15"
              )}
            >
              {opt.recommended && (
                <div className="absolute top-2 right-2">
                  <Badge className="text-[9px] h-4 px-1.5 bg-violet-600/30 text-violet-300 border-violet-500/30">
                    Recommended
                  </Badge>
                </div>
              )}
              <div className="mt-0.5 shrink-0">{opt.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{opt.label}</span>
                  <span className="text-muted-foreground">{opt.sublabel}</span>
                  <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5", opt.badgeColor)}>
                    {opt.badge}
                  </Badge>
                </div>
                <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-muted-foreground">
                  {opt.pros.map((p, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <span className="text-emerald-500">✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main ChatInterface ──────────────────────────────────────────────────────

export function ChatInterface() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState("")
  const [models, setModels] = React.useState<Model[]>([])
  const [selectedModel, setSelectedModel] = React.useState<Model | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [conversationId, setConversationId] = React.useState<string>()
  const { toast } = useToast()

  React.useEffect(() => { loadModels() }, [])

  const loadModels = async () => {
    try {
      const modelsList = await apiClient.listModels()
      setModels(modelsList)
      const active = await apiClient.getActiveModel()
      if (active) {
        setSelectedModel(active)
      } else if (modelsList.length > 0) {
        setSelectedModel(modelsList.find(m => m.backend !== "cloud_api") ?? modelsList[0])
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to load models", description: String(e) })
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const updateMsg = (id: string, patch: Partial<ChatMessage>) =>
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))

  const setErrorCard = (msgId: string, message: string, type: NonNullable<ChatMessage["errorCard"]>["type"] = "generic") =>
    updateMsg(msgId, {
      errorCard: { message, type },
      downloadProgress: undefined,
      quantIntent: undefined,
      quantSelection: undefined,
      runtimeQuantOptions: undefined,
      actions: [],
      id: undefined,  // unregister so it becomes immutable
    })

  // ── GGUF stream download ────────────────────────────────────────────────────

  const streamGgufDownload = async (repoId: string, file: QuantFile, msgId: string) => {
    const name = `${repoId.split("/").pop()} · ${file.quant ?? file.filename}`

    updateMsg(msgId, {
      content: `Downloading **${name}**`,
      quantSelection: undefined,
      quantIntent: undefined,
      downloadProgress: { modelId: file.filename, progress: 0, totalSize: 0, downloaded: 0, speed: "Starting...", eta: "..." },
      actions: [{
        label: "Cancel",
        icon: <X className="h-3.5 w-3.5" />,
        onClick: () => cancelDownload(file.filename, msgId),
      }],
    })

    try {
      const resp = await fetch("http://localhost:8000/api/models/pull-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: repoId, filename: file.filename, name }),
      })
      await readProgressStream(resp, msgId, name)
    } catch (e) {
      setErrorCard(msgId, String(e), "network")
    }
  }

  // ── Full model stream download ────────────────────────────────────────────

  const streamFullDownload = async (repoId: string, runtime_quant: string, msgId: string) => {
    const labels: Record<string, string> = {
      bitsandbytes_4bit: "BitsAndBytes 4-bit",
      onnx_int8: "ONNX INT8",
      full: "Full Precision",
    }
    const name = `${repoId.split("/").pop()} · ${labels[runtime_quant] ?? runtime_quant}`

    updateMsg(msgId, {
      content: `Downloading **${name}**`,
      runtimeQuantOptions: undefined,
      quantIntent: undefined,
      downloadProgress: { modelId: repoId, progress: 0, totalSize: 0, downloaded: 0, speed: "Starting snapshot...", eta: "..." },
      actions: [{
        label: "Cancel",
        icon: <X className="h-3.5 w-3.5" />,
        onClick: () => cancelDownload(repoId, msgId),
      }],
    })

    try {
      const resp = await fetch("http://localhost:8000/api/models/pull-full-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: repoId, runtime_quant }),
      })
      await readProgressStream(resp, msgId, name)
    } catch (e) {
      setErrorCard(msgId, String(e), "network")
    }
  }

  // ── Shared SSE reader ───────────────────────────────────────────────────────

  const readProgressStream = async (resp: Response, msgId: string, name: string) => {
    const reader = resp.body?.getReader()
    if (!reader) throw new Error("No stream reader")
    const dec = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of dec.decode(value, { stream: true }).split("\n").filter(l => l.trim())) {
        try {
          const d = JSON.parse(line)
          if (d.status === "error") {
            const type = d.error?.includes("Auth") ? "auth" : "generic"
            setErrorCard(msgId, d.error, type)
            return
          }
          if (d.status === "complete") {
            updateMsg(msgId, {
              content: `✓ **${name}** downloaded successfully!`,
              downloadProgress: undefined,
              actions: [],
              id: undefined,
            })
            await loadModels()
            setIsLoading(false)
            return
          }
          updateMsg(msgId, {
            downloadProgress: {
              modelId: d.modelId ?? name,
              progress: Math.round(d.progress ?? 0),
              totalSize: d.totalSize ?? 0,
              downloaded: d.downloaded ?? 0,
              speed: d.speed ?? "Downloading...",
              eta: d.eta ?? "...",
            },
          })
        } catch { /* skip bad JSON */ }
      }
    }
  }

  // ── Handle "hapie pull owner/model" command ───────────────────────────────

  const handlePullCommand = async (rawInput: string) => {
    const cmdContent = rawInput.trim()
    setInput("")
    setIsLoading(true)

    // Extract repo from command
    let repo = cmdContent
    for (const prefix of ["hapie pull ", "/pull ", "pull "]) {
      if (repo.toLowerCase().startsWith(prefix)) { repo = repo.slice(prefix.length).trim(); break }
    }

    setMessages(prev => [...prev, { role: "user", content: cmdContent }])

    const msgId = Date.now().toString()

    // Catalog shortcut (phi3, mistral, etc.) or colon syntax → skip intent, go direct
    const { MODEL_CATALOG, TASK_MAP } = await fetchCatalog()
    const rq = repo.toLowerCase()
    const isCatalog = rq in MODEL_CATALOG || rq in TASK_MAP || repo.includes(":")

    if (isCatalog) {
      // Direct stream — existing behaviour
      setMessages(prev => [...prev, { role: "assistant", content: "Resolving model...", id: msgId }])
      try {
        const resp = await fetch("http://localhost:8000/api/models/pull-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: cmdContent }),
        })
        await readProgressStream(resp, msgId, repo)
      } catch (e) {
        setErrorCard(msgId, String(e), "network")
      } finally {
        setIsLoading(false)
      }
      return
    }

    // HF repo → show quantization intent card FIRST
    setMessages(prev => [...prev, {
      role: "assistant",
      content: `Found **${repo}** on HuggingFace. How would you like to load it?`,
      id: msgId,
      quantIntent: { repoId: repo },
    }])
    setIsLoading(false)
  }

  // ── Intent: user chose "Yes, Quantize" ────────────────────────────────────

  const handleQuantIntentYes = async (repoId: string, msgId: string) => {
    updateMsg(msgId, { content: `Checking GGUF files for **${repoId}**...`, quantIntent: undefined })
    setIsLoading(true)
    try {
      const resolveResp = await fetch("http://localhost:8000/api/models/resolve-hf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: repoId }),
      })
      if (!resolveResp.ok) {
        const err = await resolveResp.json()
        const isNoGguf = resolveResp.status === 422

        if (isNoGguf) {
          // No GGUF → check hardware and show runtime options
          const hwResp = await fetch("http://localhost:8000/api/models/hardware-check")
          const hw: HardwareInfo = await hwResp.json()
          updateMsg(msgId, {
            content: `No GGUF files in **${repoId}**. Choose a runtime quantization strategy:`,
            runtimeQuantOptions: { repoId, hw },
            id: msgId,
          })
        } else {
          setErrorCard(msgId, err.detail ?? "Could not access repo", err.detail?.includes("Auth") ? "auth" : "generic")
        }
        return
      }
      const resolved = await resolveResp.json()
      updateMsg(msgId, {
        content: `Found **${resolved.total}** GGUF file${resolved.total !== 1 ? "s" : ""} in \`${resolved.repo_id}\`:`,
        quantSelection: { repoId: resolved.repo_id, files: resolved.files },
      })
    } catch (e) {
      setErrorCard(msgId, String(e), "network")
    } finally {
      setIsLoading(false)
    }
  }

  // ── Intent: user chose "No, Load Full" ────────────────────────────────────

  const handleQuantIntentNo = async (repoId: string, msgId: string) => {
    updateMsg(msgId, { quantIntent: undefined })
    setIsLoading(true)
    try {
      await streamFullDownload(repoId, "full", msgId)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────

  const cancelDownload = async (modelId: string, msgId: string) => {
    try {
      await fetch("http://localhost:8000/api/models/pull/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_id: modelId }),
      })
    } catch { /* ignore */ }
    setErrorCard(msgId, "The download was stopped by the user.", "cancelled")
  }

  // ── Catalog fetch (cached) ────────────────────────────────────────────────

  const fetchCatalog = React.useCallback(async () => {
    try {
      const r = await fetch("http://localhost:8000/api/models/catalog")
      if (r.ok) return r.json()
    } catch { /* ignore */ }
    return { MODEL_CATALOG: {}, TASK_MAP: {} }
  }, [])

  // ── Recommend command ──────────────────────────────────────────────────────

  const handleRecommend = async (rawInput: string) => {
    setMessages(prev => [...prev, { role: "user", content: rawInput }])
    setInput("")
    setIsLoading(true)
    try {
      const response = await apiClient.recommendModels({ query: rawInput })
      if (response.recommendations?.length > 0) {
        const recText = response.recommendations
          .map((rec: { name: string; reasoning: string; performance: { speed: string; context: string }; model_id: string }, i: number) =>
            `### ${i + 1}. ${rec.name}\n${rec.reasoning}\n\n**Speed:** ${rec.performance.speed} · **Context:** ${rec.performance.context}\n\nTo install: \`hapie pull ${rec.model_id}\``
          ).join("\n\n---\n\n")
        setMessages(prev => [...prev, { role: "assistant", content: `Here are my recommendations:\n\n${recText}` }])
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "No specific recommendations found for that query." }])
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `[Error] ${e}` }])
    } finally {
      setIsLoading(false)
    }
  }

  // ── Normal chat ───────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!input.trim()) return
    const inputLower = input.toLowerCase()

    if (inputLower.startsWith("hapie pull ") || inputLower.startsWith("/pull ") || inputLower.startsWith("pull ")) {
      await handlePullCommand(input)
      return
    }
    if (
      inputLower.startsWith("hapie recommend ") || inputLower.startsWith("/recommend ") ||
      inputLower.startsWith("/best ") || inputLower.startsWith("best ")
    ) {
      await handleRecommend(input)
      return
    }

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
      setMessages(prev => [...prev, { role: "assistant", content: response.text, metrics: response.metrics }])
      setConversationId(response.conversation_id)
    } catch (e) {
      toast({ variant: "destructive", title: "Inference failed", description: String(e) })
      setMessages(prev => [...prev, { role: "assistant", content: `[ERROR] ${e}` }])
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  const localModels = models.filter(m => m.backend !== "cloud_api")
  const cloudModels = models.filter(m => m.backend === "cloud_api")
  const isCloudModel = selectedModel?.backend === "cloud_api"
  const backendLabel = !selectedModel ? "No Model"
    : isCloudModel ? `Cloud · ${selectedModel.provider}`
    : selectedModel.backend.toUpperCase()

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2 font-medium">
              {isCloudModel ? <Cloud className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
              {selectedModel?.name ?? "Select Model"}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[260px]">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Monitor className="h-4 w-4" /> Local Models
              <Badge variant="outline" className="ml-auto text-[10px]">FREE</Badge>
            </DropdownMenuLabel>
            {localModels.map(m => (
              <DropdownMenuItem key={m.id} className="gap-2" onClick={() => setSelectedModel(m)}>
                <Monitor className="h-4 w-4" /> {m.name}
                {m.is_active && <Badge className="ml-auto text-[10px]">Active</Badge>}
              </DropdownMenuItem>
            ))}
            {cloudModels.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Cloud className="h-4 w-4" /> Cloud Models
                  <Badge variant="destructive" className="ml-auto text-[10px]">PAID</Badge>
                </DropdownMenuLabel>
                {cloudModels.map(m => (
                  <DropdownMenuItem key={m.id} className="gap-2" onClick={() => setSelectedModel(m)}>
                    <Cloud className="h-4 w-4" /> {m.name}
                    <span className="ml-auto text-xs text-muted-foreground">{m.provider}</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}
            {models.length === 0 && (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">No models available</div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-3">
          {isCloudModel && (
            <Badge variant="destructive" className="text-xs gap-1">
              <DollarSign className="h-3 w-3" /> Usage-based
            </Badge>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="h-3 w-3 text-amber-500" />
            <span>{backendLabel}</span>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <ScrollArea className="flex-1 px-4 py-6 relative">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-10">
          <Plasma color="#a855f7" speed={0.6} direction="forward" scale={1.1} opacity={0.8} mouseInteractive />
        </div>
        <div className="mx-auto max-w-3xl space-y-6 relative z-10">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bot className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready for inference</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {selectedModel
                  ? `${selectedModel.name} is loaded. Start chatting below.`
                  : "Select a model or pull one: hapie pull phi3"}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={msg.id ?? i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "user" ? (
                <div className="max-w-[70%] rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground shadow-md whitespace-pre-wrap">
                  {msg.content}
                </div>
              ) : (
                <div className="flex flex-col items-start max-w-[87%] w-full">
                  <div className="rounded-2xl bg-muted px-4 py-3 text-sm shadow-md w-full overflow-hidden">
                    {/* Main text */}
                    <MarkdownRenderer content={msg.content} />

                    {/* ── Quantization Intent Card ── */}
                    {msg.quantIntent && (
                      <QuantIntentCard
                        repoId={msg.quantIntent.repoId}
                        onYes={() => handleQuantIntentYes(msg.quantIntent!.repoId, msg.id!)}
                        onNo={() => handleQuantIntentNo(msg.quantIntent!.repoId, msg.id!)}
                      />
                    )}

                    {/* ── GGUF Quant Selection Table ── */}
                    {msg.quantSelection && (
                      <QuantSelectionTable
                        repoId={msg.quantSelection.repoId}
                        files={msg.quantSelection.files}
                        onSelect={(repo, file) => streamGgufDownload(repo, file, msg.id!)}
                        onBack={() => updateMsg(msg.id!, {
                          content: `Found **${msg.quantSelection!.repoId}** on HuggingFace. How would you like to load it?`,
                          quantSelection: undefined,
                          quantIntent: { repoId: msg.quantSelection!.repoId },
                        })}
                      />
                    )}

                    {/* ── Runtime Quant Options ── */}
                    {msg.runtimeQuantOptions && (
                      <RuntimeQuantCard
                        repoId={msg.runtimeQuantOptions.repoId}
                        hw={msg.runtimeQuantOptions.hw}
                        onSelect={(rq) => {
                          setIsLoading(true)
                          streamFullDownload(msg.runtimeQuantOptions!.repoId, rq, msg.id!)
                            .finally(() => setIsLoading(false))
                        }}
                        onBack={() => updateMsg(msg.id!, {
                          content: `Found **${msg.runtimeQuantOptions!.repoId}** on HuggingFace. How would you like to load it?`,
                          runtimeQuantOptions: undefined,
                          quantIntent: { repoId: msg.runtimeQuantOptions!.repoId },
                        })}
                      />
                    )}

                    {/* ── Download Progress ── */}
                    {msg.downloadProgress && (
                      <div className="mt-4 space-y-2 min-w-[260px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Progress value={msg.downloadProgress.progress} className="h-1.5" />
                          </div>
                          {msg.actions?.map((a, idx) => (
                            <Button key={idx} size="sm" variant="ghost"
                              className="h-6 w-6 p-0 rounded-full hover:bg-red-500/10 hover:text-red-400"
                              onClick={a.onClick} title={a.label}>
                              {a.icon}
                            </Button>
                          ))}
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                          <span>
                            {msg.downloadProgress.totalSize > 0 ? (
                              <>
                                {(msg.downloadProgress.downloaded / 1e9).toFixed(2)} GB /{" "}
                                {(msg.downloadProgress.totalSize / 1e9).toFixed(2)} GB{" "}
                                ({msg.downloadProgress.progress}%)
                              </>
                            ) : (
                              <>Downloading ({msg.downloadProgress.progress}%)</>
                            )}
                          </span>
                          <span>{msg.downloadProgress.speed} · {msg.downloadProgress.eta} left</span>
                        </div>
                      </div>
                    )}

                    {/* ── Error Card ── */}
                    {msg.errorCard && (
                      <ErrorCard
                        message={msg.errorCard.message}
                        type={msg.errorCard.type}
                        onDismiss={() => setMessages(prev => prev.filter((_, idx) => idx !== i))}
                      />
                    )}
                  </div>

                  {/* Metrics */}
                  {msg.metrics && (
                    <div className="mt-1 text-[10px] text-muted-foreground px-1">
                      {msg.metrics.latency_ms != null && <>{(msg.metrics.latency_ms / 1000).toFixed(2)}s · </>}
                      {msg.metrics.tokens_per_sec != null && <>{msg.metrics.tokens_per_sec.toFixed(1)} t/s · </>}
                      {msg.metrics.provider ?? backendLabel}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-muted/50">
                <Bot className="h-4 w-4 animate-pulse" />
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                {[0, 150, 300].map(d => (
                  <div key={d} className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
                    style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ── Input ── */}
      <div className="border-t p-4">
        {!selectedModel && (
          <div className="mx-auto max-w-3xl mb-3 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Please select a model, or pull one with <code className="font-mono text-xs">hapie pull phi3</code></span>
          </div>
        )}
        <div className="mx-auto max-w-3xl relative">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={
              selectedModel
                ? "Chat, or: hapie pull bartowski/Mistral-7B-GGUF · hapie pull phi3 · hapie pull owner/repo:model.gguf"
                : "Pull a model: hapie pull phi3, hapie pull mistral, hapie pull owner/repo..."
            }
            className="min-h-[60px] pr-12 resize-none bg-muted/20 border-muted"
            disabled={isLoading}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
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
            ? `Cloud inference via ${selectedModel?.provider}. Usage billed to your account.`
            : "Local inference on your hardware. All data stays private."}
        </p>
      </div>
    </div>
  )
}
