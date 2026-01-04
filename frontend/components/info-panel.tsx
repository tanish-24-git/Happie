"use client"

import * as React from "react"
import { Cpu, HardDrive, Layout, Server, Zap, ChevronRight, ChevronLeft, Activity, Cloud } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import apiClient, { SystemInfo } from "@/lib/api"

export function InfoPanel() {
  const [isOpen, setIsOpen] = React.useState(true)
  const [systemInfo, setSystemInfo] = React.useState<SystemInfo | null>(null)
  const [cpuLoad, setCpuLoad] = React.useState(0)

  // Poll system info every 2 seconds
  React.useEffect(() => {
    const loadSystemInfo = async () => {
      try {
        const info = await apiClient.getSystemInfo()
        setSystemInfo(info)
        
        // Simulate CPU load from RAM usage
        const ramUsagePercent = ((info.capability.total_ram_gb - info.capability.available_ram_gb) / info.capability.total_ram_gb) * 100
        setCpuLoad(Math.min(ramUsagePercent * 0.5, 100)) // Rough approximation
      } catch (error) {
        console.error("Failed to load system info:", error)
      }
    }

    loadSystemInfo()
    const interval = setInterval(loadSystemInfo, 2000)

    return () => clearInterval(interval)
  }, [])

  if (!systemInfo) {
    return (
      <div className={cn("relative flex flex-col border-l", isOpen ? "w-80" : "w-0")}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute -left-4 top-4 z-10 h-8 w-8 rounded-full border bg-background shadow-sm"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        {isOpen && (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        )}
      </div>
    )
  }

  const { capability, policy } = systemInfo

  // Calculate usage percentages
  const ramUsagePercent = ((capability.total_ram_gb - capability.available_ram_gb) / capability.total_ram_gb) * 100
  const vramUsagePercent = capability.gpu_vram_gb 
    ? Math.min((capability.gpu_vram_gb * 0.3) / capability.gpu_vram_gb * 100, 100) // Estimate
    : 0

  const isCloudBackend = policy.backend === 'cloud_api'
  const backendDisplay = isCloudBackend ? "Cloud API" : policy.backend.toUpperCase()

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
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">System Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{capability.cpu_brand}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Cpu className="h-3 w-3" />
                  <span>{capability.cpu_cores} cores, {capability.cpu_threads} threads</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Backend Engine</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    {isCloudBackend ? (
                      <Cloud className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Zap className="h-4 w-4 text-amber-500" />
                    )}
                    <span>{backendDisplay}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-4">
                    Active
                  </Badge>
                </div>

                {!isCloudBackend && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md border bg-muted/30 p-2">
                      <div className="text-[10px] text-muted-foreground uppercase">GPU Layers</div>
                      <div className="text-sm font-mono">{policy.gpu_layers}</div>
                    </div>
                    <div className="rounded-md border bg-muted/30 p-2">
                      <div className="text-[10px] text-muted-foreground uppercase">Context</div>
                      <div className="text-sm font-mono">{(policy.max_context_length / 1000).toFixed(0)}K</div>
                    </div>
                  </div>
                )}

                {policy.use_quantization && (
                  <div className="rounded-md border bg-muted/30 p-2">
                    <div className="text-[10px] text-muted-foreground uppercase">Quantization</div>
                    <div className="text-sm font-mono">{policy.quantization_bits}-bit</div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Hardware Summary</h3>
              <div className="space-y-3">
                {!isCloudBackend && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-3 w-3" />
                        <span>CPU Load</span>
                      </div>
                      <span className="font-mono">{cpuLoad.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div 
                        className="h-full bg-primary transition-all" 
                        style={{ width: `${cpuLoad}%` }}
                      />
                    </div>
                  </div>
                )}

                {capability.gpu_vram_gb && capability.gpu_vram_gb > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3" />
                        <span>VRAM Usage</span>
                      </div>
                      <span className="font-mono">
                        {(capability.gpu_vram_gb * vramUsagePercent / 100).toFixed(1)} / {capability.gpu_vram_gb.toFixed(1)} GB
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div 
                        className="h-full bg-primary transition-all" 
                        style={{ width: `${vramUsagePercent}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-3 w-3" />
                      <span>RAM Usage</span>
                    </div>
                    <span className="font-mono">
                      {(capability.total_ram_gb - capability.available_ram_gb).toFixed(1)} / {capability.total_ram_gb.toFixed(1)} GB
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div 
                      className="h-full bg-primary transition-all" 
                      style={{ width: `${ramUsagePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current Mode</h3>
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
