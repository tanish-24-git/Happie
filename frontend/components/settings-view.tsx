"use client"

import { Moon, Sun, Key, RefreshCw, AlertTriangle, Shield, Terminal } from "lucide-react"
import { useTheme } from "next-themes"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { HfTokenModal } from "@/components/hf-token-modal"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"

export function SettingsView() {
  const { theme, setTheme } = useTheme()
  const [showHfModal, setShowHfModal] = useState(false)
  const [hfStatus, setHfStatus] = useState(false)

  const checkHfStatus = async () => {
    try {
      // In a real app we'd use a robust client, doing simple fetch here to match scope
      const res = await fetch("http://localhost:8000/api/settings/hf-token/status")
      const data = await res.json()
      setHfStatus(data.configured)
    } catch (e) {
      console.error("Failed to check HF status")
    }
  }

  useEffect(() => {
    checkHfStatus()
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      <HfTokenModal 
        open={showHfModal} 
        onOpenChange={setShowHfModal} 
        onSuccess={checkHfStatus}
      />
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl p-6 space-y-8 pb-12">
          <section className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Terminal className="h-5 w-5" /> Appearance
              </h3>
              <p className="text-sm text-muted-foreground">Customize the interface aesthetic and behavior.</p>
            </div>
            <Card className="bg-muted/5">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  {/* ... existing code ... */}
                  <div className="space-y-0.5">
                    <Label className="text-sm">Dark Mode</Label>
                    <p className="text-xs text-muted-foreground">High-contrast interface for technical environments.</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border p-1 bg-muted/30">
                    <Button 
                      variant={theme === "dark" ? "secondary" : "ghost"} 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setTheme("dark")}
                    >
                      <Moon className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant={theme === "light" ? "secondary" : "ghost"} 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setTheme("light")}
                    >
                      <Sun className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* HUGGING FACE SECTION */}
          <section className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-2xl">🤗</span> Hugging Face (45K+ Models)
              </h3>
              <p className="text-sm text-muted-foreground">Unlock access to gated models like Llama 3, Mistral v0.3, and Gemma 2.</p>
            </div>
            <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-950/10 dark:border-blue-900/50">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Label className="text-base font-semibold">HF_TOKEN Status</Label>
                                <Badge variant={hfStatus ? "default" : "secondary"} className={hfStatus ? "bg-green-600 hover:bg-green-700" : ""}>
                                    {hfStatus ? "✅ Active" : "⚠️ Not Configured"}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground max-w-md">
                                Required for direct downloads of most modern GGUF models. 
                                We encrypt this token locally.
                            </p>
                        </div>
                        <Button onClick={() => setShowHfModal(true)} variant={hfStatus ? "outline" : "default"}>
                            {hfStatus ? "Update Token" : "Add HF_TOKEN"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
          </section>

          <Separator />

          <section className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Key className="h-5 w-5" /> API Configurations
              </h3>
              <p className="text-sm text-muted-foreground">Manage keys for cloud-based inference providers.</p>
            </div>
            <Card className="bg-muted/5">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                    Google / Gemini API Key
                  </Label>
                  <div className="flex gap-2">
                    <Input type="password" placeholder="AIzaSy..." className="font-mono text-xs" />
                    <Button variant="outline" size="sm">
                      Update
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                    OpenAI API Key
                  </Label>
                  <div className="flex gap-2">
                    <Input type="password" placeholder="sk-••••••••••••••••" className="font-mono text-xs" />
                    <Button variant="outline" size="sm">
                      Update
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                    Anthropic API Key
                  </Label>
                  <div className="flex gap-2">
                    <Input type="password" placeholder="sk-ant-••••••••••••••••" className="font-mono text-xs" />
                    <Button variant="outline" size="sm">
                      Update
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          <section className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5" /> Advanced Maintenance
              </h3>
              <p className="text-sm text-muted-foreground">Critical system operations and hardware re-detection.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-muted/5 border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Hardware Sync</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Force a full re-detection of CPU, GPU, and VRAM.</p>
                  <Button variant="secondary" size="sm" className="w-full gap-2">
                    <RefreshCw className="h-3.5 w-3.5" /> Re-detect Hardware
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-muted/5 border-destructive/20 border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-destructive">Factory Reset</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Purge all local model weights and configurations.</p>
                  <Button variant="destructive" size="sm" className="w-full gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" /> Reset Local State
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  )
}
