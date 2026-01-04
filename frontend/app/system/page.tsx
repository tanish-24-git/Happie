import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { InfoPanel } from "@/components/info-panel"
import { SystemInfo } from "@/components/system-info"

export default function SystemPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-row overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center gap-4 border-b bg-background/50 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Infrastructure /</span>
              <span className="text-sm font-semibold">System Info</span>
            </div>
          </header>
          <main className="flex flex-1 flex-col overflow-hidden">
            <SystemInfo />
          </main>
        </div>
        <InfoPanel />
      </SidebarInset>
    </SidebarProvider>
  )
}
