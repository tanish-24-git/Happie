"use client"
import { Download, Trash2, Globe, Monitor, Plus, ShieldCheck, Cpu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

const LOCAL_MODELS = [
  {
    name: "Llama 3.1 8B",
    size: "4.7 GB",
    status: "installed",
    active: true,
    quant: "Q4_K_M",
    date: "2024-05-12",
  },
  {
    name: "Mistral v0.3",
    size: "4.1 GB",
    status: "installed",
    active: false,
    quant: "FP16",
    date: "2024-06-01",
  },
  {
    name: "Gemma 2 9B",
    size: "5.4 GB",
    status: "not-installed",
    active: false,
    quant: "Q8_0",
    date: "2024-06-20",
  },
]

const CLOUD_MODELS = [
  {
    name: "GPT-4o",
    provider: "OpenAI",
    status: "connected",
    active: false,
    latency: "Avg 800ms",
  },
  {
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    status: "connected",
    active: false,
    latency: "Avg 1200ms",
  },
  {
    name: "DeepSeek Coder V2",
    provider: "DeepSeek",
    status: "not-connected",
    active: false,
    latency: "N/A",
  },
]

export function ModelsManagement() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      <div className="p-6 border-b bg-muted/20">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Model Repository</h2>
            <p className="text-sm text-muted-foreground">Manage local inference weights and cloud API endpoints.</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Import Model
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-5xl p-6">
          <Tabs defaultValue="local" className="space-y-6">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="local" className="gap-2 px-4">
                <Monitor className="h-4 w-4" /> Local Models
              </TabsTrigger>
              <TabsTrigger value="cloud" className="gap-2 px-4">
                <Globe className="h-4 w-4" /> Cloud API
              </TabsTrigger>
            </TabsList>

            <TabsContent value="local" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {LOCAL_MODELS.map((model) => (
                  <Card key={model.name} className={cn("relative overflow-hidden", model.active && "border-primary")}>
                    {model.active && (
                      <div className="absolute top-0 right-0 p-3">
                        <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                          Active
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 mb-2">
                        <Cpu className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-lg">{model.name}</CardTitle>
                      <CardDescription className="text-xs uppercase tracking-wider font-mono">
                        {model.quant} • {model.size}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3 w-3" />
                        <span>Verified Weights</span>
                        <span className="ml-auto">{model.date}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 border-t bg-muted/10">
                      <div className="flex w-full items-center justify-between py-3">
                        {model.status === "installed" ? (
                          <>
                            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4 mr-2" /> Remove
                            </Button>
                            {!model.active && (
                              <Button variant="outline" size="sm">
                                Set Active
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button className="w-full gap-2" variant="secondary">
                            <Download className="h-4 w-4" /> Download Weights
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="cloud" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {CLOUD_MODELS.map((model) => (
                  <Card key={model.name}>
                    <CardHeader className="pb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 mb-2">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-lg">{model.name}</CardTitle>
                      <CardDescription className="text-xs">{model.provider}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              model.status === "connected" ? "bg-emerald-500" : "bg-muted-foreground/30",
                            )}
                          />
                          <span className="capitalize">{model.status.replace("-", " ")}</span>
                        </div>
                        <span className="font-mono text-muted-foreground">{model.latency}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 border-t bg-muted/10">
                      <div className="flex w-full items-center justify-between py-3">
                        {model.status === "connected" ? (
                          <>
                            <Button variant="ghost" size="sm">
                              Edit Config
                            </Button>
                            <Button variant="outline" size="sm">
                              Test Endpoint
                            </Button>
                          </>
                        ) : (
                          <Button className="w-full gap-2" variant="secondary">
                            Connect API Key
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  )
}
