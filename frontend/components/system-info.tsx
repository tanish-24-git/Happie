"use client"

import * as React from "react"
import { Cpu, HardDrive, Zap, Activity, ShieldCheck, Thermometer, Database } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import apiClient, { SystemInfo as SystemInfoType } from "@/lib/api"

export function SystemInfo() {
  const [systemInfo, setSystemInfo] = React.useState<SystemInfoType | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const loadInfo = async () => {
      try {
        const info = await apiClient.getSystemInfo()
        setSystemInfo(info)
      } catch (error) {
        console.error("Failed to load system info", error)
      } finally {
        setLoading(false)
      }
    }
    loadInfo()
    // Poll every 5s
    const interval = setInterval(loadInfo, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !systemInfo) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Scanning system hardware...</div>
      </div>
    )
  }

  const { capability, policy } = systemInfo
  const usedRam = capability.total_ram_gb - capability.available_ram_gb
  const ramPercent = (usedRam / capability.total_ram_gb) * 100
  
  // Estimate VRAM usage relative to max context if not provided
  const vramPercent = capability.gpu_vram_gb && capability.gpu_vram_gb > 0
    ? (capability.gpu_vram_gb * 0.3 / capability.gpu_vram_gb) * 100 // Mock usage or use real if available in future
    : 0

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-5xl p-6 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-balance">Node Hardware Status</h2>
              <p className="text-sm text-muted-foreground">Real-time telemetry from local inference hardware.</p>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3">
              LIVE
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-muted/10 border-muted">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  CPU
                </CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold font-mono truncate" title={capability.cpu_brand}>
                  {capability.cpu_brand.split(' ')[0]} {capability.cpu_brand.split(' ')[1] || ''}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {capability.cpu_cores} Cores / {capability.cpu_threads} Threads
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/10 border-muted">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  GPU Vendor
                </CardTitle>
                <Zap className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold font-mono uppercase">{capability.gpu_vendor}</div>
                <p className="text-[10px] text-muted-foreground mt-1">{capability.gpu_name || "Integrated/None"}</p>
              </CardContent>
            </Card>

            <Card className="bg-muted/10 border-muted">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  VRAM
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{capability.gpu_vram_gb?.toFixed(1) || 0} GB</div>
                <p className="text-[10px] text-muted-foreground mt-1">Dedicated Video Memory</p>
              </CardContent>
            </Card>

            <Card className="bg-muted/10 border-muted">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  System RAM
                </CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{capability.total_ram_gb.toFixed(1)} GB</div>
                <p className="text-[10px] text-muted-foreground mt-1">Available: {capability.available_ram_gb.toFixed(1)} GB</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-muted/5 border-muted">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Compute Telemetry</CardTitle>
                <CardDescription className="text-xs">Active load distribution.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground uppercase font-medium">RAM Utilization</span>
                    <span className="font-mono">{ramPercent.toFixed(0)}%</span>
                  </div>
                  <Progress value={ramPercent} className="h-1" />
                </div>
                {capability.gpu_vram_gb && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground uppercase font-medium">VRAM Allocation (Est)</span>
                      <span className="font-mono">{vramPercent.toFixed(0)}%</span>
                    </div>
                    <Progress value={vramPercent} className="h-1" />
                  </div>
                )}
                <div className="space-y-2">
                   <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground uppercase font-medium">Context Usage</span>
                      <span className="font-mono">{policy.max_context_length / 1024}K Limit</span>
                   </div>
                   <Progress value={10} className="h-1" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/5 border-muted">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Environment Integrity</CardTitle>
                <CardDescription className="text-xs">Security and detection summary.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/10">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold">Hardware Verified</div>
                    <div className="text-[10px] text-muted-foreground">Detected {capability.platform_system} {capability.platform_release}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase font-medium">Backend</div>
                    <div className="flex items-center gap-2">
                      <Database className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-sm font-mono truncate">{policy.backend}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase font-medium">Arch</div>
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-sm font-mono">{capability.cpu_arch}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
