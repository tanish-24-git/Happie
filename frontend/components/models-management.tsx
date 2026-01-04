"use client"

import { useState, useEffect } from "react"
import { Download, Trash2, Globe, Monitor, Plus, ShieldCheck, Cpu, CheckCircle2, XCircle, AlertCircle, Edit, TestTube } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import apiClient, { type Model } from "@/lib/api"
import { PROVIDER_DEFAULTS, PROVIDER_OPTIONS } from "@/lib/provider-defaults"
import { toast } from "sonner"

export function ModelsManagement() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingModel, setEditingModel] = useState<Model | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    provider: "grok",
    model_id: PROVIDER_DEFAULTS.grok.model,
    name: "",
    api_key: "",
    base_url: PROVIDER_DEFAULTS.grok.url
  })
  const [validating, setValidating] = useState(false)
  const [validationStatus, setValidationStatus] = useState<"idle" | "valid" | "invalid">("idle")

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    try {
      const data = await apiClient.listModels()
      setModels(data)
    } catch (error) {
      toast.error("Failed to load models")
    } finally {
      setLoading(false)
    }
  }

  const handleProviderChange = (provider: string) => {
    const defaults = PROVIDER_DEFAULTS[provider]
    setFormData({
      ...formData,
      provider,
      model_id: defaults.model,
      base_url: defaults.url
    })
    setValidationStatus("idle")
  }

  const handleValidate = async () => {
    if (!formData.api_key) {
      toast.error("Please enter an API key")
      return
    }

    setValidating(true)
    setValidationStatus("idle")

    try {
      const result = await apiClient.validateCloudModel({
        provider: formData.provider,
        api_key: formData.api_key,
        model_id: formData.model_id,
        base_url: formData.base_url
      })

      if (result.valid) {
        setValidationStatus("valid")
        toast.success("API key validated successfully!")
      } else {
        setValidationStatus("invalid")
        toast.error(result.error || "Invalid API key")
      }
    } catch (error) {
      setValidationStatus("invalid")
      toast.error("Validation failed")
    } finally {
      setValidating(false)
    }
  }

  const handleAddModel = async () => {
    if (validationStatus !== "valid") {
      toast.error("Please validate the API key first")
      return
    }

    if (!formData.name) {
      toast.error("Please enter a display name")
      return
    }

    try {
      const model_id = `${formData.provider}-${formData.model_id.replace(/[^a-z0-9]/gi, "-")}`
      
      await apiClient.registerCloudModel({
        model_id,
        name: formData.name,
        provider: formData.provider,
        api_endpoint: formData.base_url,
        cloud_model_name: formData.model_id,
        api_key: formData.api_key
      })

      toast.success("Cloud model added successfully!")
      setShowAddDialog(false)
      resetForm()
      fetchModels()
    } catch (error) {
      toast.error("Failed to add model")
    }
  }

  const handleDelete = async (modelId: string) => {
    if (!confirm("Are you sure you want to delete this model?")) return

    try {
      await apiClient.deleteModel(modelId)
      toast.success("Model deleted")
      fetchModels()
    } catch (error) {
      toast.error("Failed to delete model")
    }
  }

  const resetForm = () => {
    setFormData({
      provider: "grok",
      model_id: PROVIDER_DEFAULTS.grok.model,
      name: "",
      api_key: "",
      base_url: PROVIDER_DEFAULTS.grok.url
    })
    setValidationStatus("idle")
    setEditingModel(null)
  }

  const localModels = models.filter(m => m.type === "local")
  const cloudModels = models.filter(m => m.type === "cloud")

  return (
    <>
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        <div className="p-6 border-b bg-muted/20">
          <div className="mx-auto max-w-5xl flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Model Repository</h2>
              <p className="text-sm text-muted-foreground">Manage local inference weights and cloud API endpoints.</p>
            </div>
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
                  {localModels.map((model) => (
                    <Card key={model.id} className={cn("relative overflow-hidden", model.is_active && "border-primary")}>
                      {model.is_active && (
                        <div className="absolute top-0 right-0 p-3">
                          <Badge className="bg-primary/10 text-primary border-primary/20">Active</Badge>
                        </div>
                      )}
                      {model.is_base_model && (
                        <div className="absolute top-0 left-0 p-3">
                          <Badge variant="outline" className="text-xs">Base</Badge>
                        </div>
                      )}
                      <CardHeader className="pb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 mb-2">
                          <Cpu className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-lg">{model.name}</CardTitle>
                        <CardDescription className="text-xs uppercase tracking-wider font-mono">
                          {((model.size_mb || 0) / 1024).toFixed(2)} GB • {model.backend}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ShieldCheck className="h-3 w-3" />
                          <span>{model.provider}</span>
                        </div>
                      </CardContent>
                      {!model.is_base_model && (
                        <CardFooter className="pt-0 border-t bg-muted/10">
                          <div className="flex w-full items-center justify-between py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(model.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Remove
                            </Button>
                          </div>
                        </CardFooter>
                      )}
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="cloud" className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Cloud models require API keys and incur usage-based costs.
                  </p>
                  <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Cloud Model
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {cloudModels.map((model) => (
                    <Card key={model.id} className="relative overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 mb-2">
                          <Globe className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className="text-lg">{model.name}</CardTitle>
                        <CardDescription className="text-xs uppercase tracking-wider">
                          {model.provider} • Usage-based
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="text-green-600 dark:text-green-400">Configured</span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0 border-t bg-muted/10">
                        <div className="flex w-full items-center justify-between py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(model.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Remove
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}

                  {cloudModels.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      <Globe className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p className="text-sm">No cloud models configured</p>
                      <p className="text-xs mt-2">Click "Add Cloud Model" to get started</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>

      {/* Add/Edit Cloud Model Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Cloud Model</DialogTitle>
            <DialogDescription>
              Configure a cloud AI model with your API key. All keys are encrypted locally.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value={formData.provider} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {PROVIDER_DEFAULTS[formData.provider].description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model_id">Model ID</Label>
                <Input
                  id="model_id"
                  value={formData.model_id}
                  onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                  placeholder="e.g., grok-beta"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Grok Beta"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="api_key"
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => {
                    setFormData({ ...formData, api_key: e.target.value })
                    setValidationStatus("idle")
                  }}
                  placeholder={PROVIDER_DEFAULTS[formData.provider].apiKeyPlaceholder}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleValidate}
                  disabled={validating || !formData.api_key}
                  className="gap-2"
                >
                  {validating ? "..." : validationStatus === "valid" ? (
                    <><CheckCircle2 className="h-4 w-4 text-green-500" /> Valid</>
                  ) : validationStatus === "invalid" ? (
                    <><XCircle className="h-4 w-4 text-destructive" /> Invalid</>
                  ) : (
                    <><TestTube className="h-4 w-4" /> Test</>
                  )}
                </Button>
              </div>
              {validationStatus === "valid" && (
                <p className="text-xs text-green-600 dark:text-green-400">✓ API key validated successfully</p>
              )}
              {validationStatus === "invalid" && (
                <p className="text-xs text-destructive">✗ Invalid API key or network error</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_url">Base URL</Label>
              <Input
                id="base_url"
                value={formData.base_url}
                onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                placeholder="https://api.example.com/v1"
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddModel}
              disabled={validationStatus !== "valid" || !formData.name}
            >
              Add Model
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
