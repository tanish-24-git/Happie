"use client"
import { Play, Volume2, Mic, Headphones, Settings2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"

export function AudioGeneration() {
  return (
    <div className="flex flex-1 overflow-hidden bg-background">
      {/* Configuration Sidebar */}
      <div className="w-80 border-r bg-muted/10 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-background/50">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Settings2 className="h-4 w-4" />
            Audio Engine Parameters
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Voice Profile
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["Echo", "Alloy", "Shimmer", "Nova"].map((voice) => (
                  <Button key={voice} variant="outline" size="sm" className="h-9 justify-start gap-2 bg-transparent">
                    <Volume2 className="h-3.5 w-3.5" />
                    {voice}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Speed
                  </label>
                  <span className="text-[10px] font-mono">1.0x</span>
                </div>
                <Slider defaultValue={[1.0]} max={2.0} min={0.5} step={0.1} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Pitch
                  </label>
                  <span className="text-[10px] font-mono">0</span>
                </div>
                <Slider defaultValue={[0]} max={10} min={-10} step={1} />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Format</label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                  MP3
                </Button>
                <Button variant="outline" size="sm" className="flex-1 bg-muted/50">
                  WAV
                </Button>
                <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                  OPUS
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs defaultValue="tts" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b bg-muted/5">
            <TabsList className="bg-transparent h-12 gap-6">
              <TabsTrigger
                value="tts"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 gap-2"
              >
                <Headphones className="h-4 w-4" /> Text-to-Speech
              </TabsTrigger>
              <TabsTrigger
                value="stt"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 gap-2"
              >
                <Mic className="h-4 w-4" /> Speech-to-Text
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="tts" className="flex-1 flex flex-col overflow-hidden m-0">
            <ScrollArea className="flex-1 p-8">
              <div className="max-w-3xl mx-auto space-y-8">
                <div className="space-y-4">
                  <label className="text-xs font-medium text-muted-foreground">Input Text</label>
                  <Textarea
                    placeholder="Enter text to convert to high-fidelity audio..."
                    className="min-h-[200px] text-base bg-muted/10"
                  />
                  <div className="flex justify-end">
                    <Button size="lg" className="gap-2 px-8">
                      <Play className="h-4 w-4 fill-current" />
                      Synthesize
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border bg-muted/20 p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button size="icon" className="h-12 w-12 rounded-full">
                        <Play className="h-5 w-5 fill-current" />
                      </Button>
                      <div>
                        <div className="text-sm font-semibold">Synthesis Result 01.mp3</div>
                        <div className="text-xs text-muted-foreground">00:42 • 128kbps • Echo Voice</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" /> Download
                    </Button>
                  </div>

                  {/* Mock Waveform */}
                  <div className="h-20 flex items-end gap-0.5 px-2">
                    {Array.from({ length: 100 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-primary/30 rounded-full"
                        style={{ height: `${Math.random() * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="stt" className="flex-1 flex flex-col items-center justify-center p-8 m-0">
            <div className="max-w-md w-full text-center space-y-6">
              <div className="h-32 w-32 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto transition-transform hover:scale-105 cursor-pointer">
                <Mic className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Transcription Engine Ready</h3>
                <p className="text-sm text-muted-foreground">
                  Click to start recording or drag an audio file here. Processing will be performed locally on WHISPER
                  v3.
                </p>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1 bg-transparent">
                  Upload File
                </Button>
                <Button className="flex-1">Start Recording</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
