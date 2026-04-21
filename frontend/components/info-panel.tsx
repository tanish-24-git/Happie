"use client"

import * as React from "react"
import { Cpu, HardDrive, Layout, Zap, ChevronRight, ChevronLeft, Cloud } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import apiClient, { SystemInfo } from "@/lib/api"

export function InfoPanel() {
  const [isOpen, setIsOpen] = React.useState(true)
  const [systemInfo, setSystemInfo] = React.useState<SystemInfo | null>(null)

  React.useEffect(() => {
    const loadSystemInfo = async () => {
      try {
        const info = await apiClient.getSystemInfo()
        setSystemInfo(info)
      } catch (error) {
        console.error("Failed to load system info:", error)
      }
    }

    loadSystemInfo()
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
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">System Info</h3>
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

            <div className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Max Model Capacity</h3>
              <div className="text-[10px] text-muted-foreground leading-tight">
                Max limit in Billions of Parameters (B) based on free memory and 1.2x architecture overhead.
              </div>
              <div className="border rounded-md overflow-hidden bg-muted/5">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/30 border-b">
                    <tr>
                      <th className="p-2 font-medium">Format</th>
                      <th className="p-2 font-medium">GPU Fit</th>
                      <th className="p-2 font-medium">RAM Fit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono text-[11px]">
                    {[
                      { name: "F32 (Full)", bpp: 4.0 },
                      { name: "F16 (Half)", bpp: 2.0 },
                      { name: "Q8", bpp: 1.0 },
                      { name: "Q6", bpp: 0.75 },
                      { name: "Q5", bpp: 0.625 },
                      { name: "Q4", bpp: 0.5 },
                      { name: "Q3", bpp: 0.375 },
                      { name: "Q2", bpp: 0.25 },
                    ].map(fmt => {
                      const overhead = fmt.bpp * 1.2;
                      const ramFit = (capability.available_ram_gb / overhead).toFixed(1);
                      const gpuVram = (capability.gpu_vram_gb || 0) * capability.gpu_count;
                      const gpuFit = gpuVram > 0 ? (gpuVram / overhead).toFixed(1) + "B" : "-";
                      
                      return (
                        <tr key={fmt.name} className="hover:bg-muted/20">
                          <td className="p-2 text-muted-foreground">{fmt.name}</td>
                          <td className="p-2 text-amber-500">{gpuFit}</td>
                          <td className="p-2 text-emerald-500">{ramFit}B</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
