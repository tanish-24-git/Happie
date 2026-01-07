"use client"

import { useState } from "react"
import { Eye, EyeOff, Save, CheckCircle, ExternalLink } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

interface HfTokenModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function HfTokenModal({ open, onOpenChange, onSuccess }: HfTokenModalProps) {
  const [token, setToken] = useState("")
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSave = async () => {
    if (!token.trim().startsWith("hf_")) {
      setError("Token must start with 'hf_'")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("http://localhost:8000/api/settings/hf-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hf_token: token.trim() }),
      })

      if (!res.ok) throw new Error("Failed to save token")
      
      onSuccess()
      onOpenChange(false)
      setToken("")
    } catch (err) {
      setError("Failed to save token. Ensure backend is running.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Unlock 45,000+ Models</DialogTitle>
          <DialogDescription>
            Add your Hugging Face token to download gated models like Llama 3, Mistral, and more.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
            {/* Step by Step Guide */}
            <Card className="bg-muted/50 p-4 space-y-3 text-sm">
                <div className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">1</span>
                    <p>
                        Go to <a href="https://huggingface.co/settings/tokens" target="_blank" className="text-blue-500 hover:underline inline-flex items-center gap-1">
                            huggingface.co/settings/tokens <ExternalLink className="h-3 w-3"/>
                        </a>
                    </p>
                </div>
                <div className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">2</span>
                    <p>Click <strong>"New token"</strong>, name it "HAPIE", select <strong>"Read"</strong> permission.</p>
                </div>
                <div className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">3</span>
                    <p>Copy the token starting with <code>hf_...</code> and paste below.</p>
                </div>
            </Card>

            <div className="space-y-2">
                <Label>Hugging Face Token</Label>
                <div className="relative">
                    <Input 
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        type={showToken ? "text" : "password"}
                        placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="font-mono pr-10"
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowToken(!showToken)}
                    >
                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                </div>
                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!token || loading} className="gap-2 bg-blue-600 hover:bg-blue-700">
                {loading ? "Saving..." : <><Save className="h-4 w-4" /> Save Token</>}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
