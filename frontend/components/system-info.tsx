"use client"

import { Cpu, HardDrive, Zap, Activity, ShieldCheck, Thermometer, Database } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

export function SystemInfo() {
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
              Tier: High Capability
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-muted/10 border-muted">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  CPU Cores
                </CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">16 Threads</div>
                <p className="text-[10px] text-muted-foreground mt-1">AMD Ryzen 7 5800X</p>
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
                <div className="text-2xl font-bold font-mono">NVIDIA RTX</div>
                <p className="text-[10px] text-muted-foreground mt-1">Driver 551.23 (CUDA 12.4)</p>
              </CardContent>
            </Card>

            <Card className="bg-muted/10 border-muted">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  VRAM Available
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">12.0 GB</div>
                <p className="text-[10px] text-muted-foreground mt-1">GDDR6X Dedicated</p>
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
                <div className="text-2xl font-bold font-mono">32.0 GB</div>
                <p className="text-[10px] text-muted-foreground mt-1">DDR4 @ 3200MHz</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-muted/5 border-muted">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Compute Telemetry</CardTitle>
                <CardDescription className="text-xs">Active load distribution across components.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground uppercase font-medium">CPU Utilization</span>
                    <span className="font-mono">14%</span>
                  </div>
                  <Progress value={14} className="h-1" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground uppercase font-medium">GPU Core Load</span>
                    <span className="font-mono">82%</span>
                  </div>
                  <Progress value={82} className="h-1" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground uppercase font-medium">VRAM Allocation</span>
                    <span className="font-mono">5.4 GB</span>
                  </div>
                  <Progress value={45} className="h-1" />
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
                    <div className="text-xs font-semibold">Secure Inference Active</div>
                    <div className="text-[10px] text-muted-foreground">Weights are signed and verified.</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase font-medium">Temperature</div>
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-sm font-mono">64°C</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase font-medium">Local Cache</div>
                    <div className="flex items-center gap-2">
                      <Database className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-sm font-mono">142 GB</span>
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
