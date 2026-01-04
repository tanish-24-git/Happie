"use client"

import * as React from "react"
import { Cpu, HardDrive, Layout, Server, Zap, ChevronRight, ChevronLeft, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

export function InfoPanel() {
  const [isOpen, setIsOpen] = React.useState(true)

  return (
    <div
      className={cn("relative flex flex-col border-l transition-all duration-300 ease-in-out", isOpen ? "w-80" : "w-0")}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute -left-4 top-4 z-10 h-8 w-8 rounded-full border bg-background shadow-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {isOpen && (
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="flex flex-col gap-6 p-6">
            <div className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Model</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Llama 3.1 8B</span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    Local
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Server className="h-3 w-3" />
                  <span>FP16 Quantized</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Backend Engine</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span>CUDA (NVIDIA)</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-4">
                    Active
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border bg-muted/30 p-2">
                    <div className="text-[10px] text-muted-foreground uppercase">Latency</div>
                    <div className="text-sm font-mono">12ms</div>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-2">
                    <div className="text-[10px] text-muted-foreground uppercase">Throughput</div>
                    <div className="text-sm font-mono">42 t/s</div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Hardware summary</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-3 w-3" />
                      <span>CPU Load</span>
                    </div>
                    <span className="font-mono">12%</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[12%] bg-primary" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3 w-3" />
                      <span>VRAM Usage</span>
                    </div>
                    <span className="font-mono">6.2 / 12 GB</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[52%] bg-primary" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-3 w-3" />
                      <span>RAM Usage</span>
                    </div>
                    <span className="font-mono">14.8 / 32 GB</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[46%] bg-primary" />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current mode</h3>
              <div className="flex items-center gap-2 text-sm">
                <Layout className="h-4 w-4" />
                <span>Single Model Mode</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
