"use client"

import type * as React from "react"
import { MessageSquare, Repeat, ImageIcon, Headphones, Info, Settings, Cpu, Box } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Inference",
      items: [
        {
          title: "Chat",
          url: "/",
          icon: MessageSquare,
        },
        {
          title: "Model Comparison",
          url: "/compare",
          icon: Repeat,
        },
      ],
    },
    {
      title: "Capabilities",
      items: [
        {
          title: "Image Generation",
          url: "/image",
          icon: ImageIcon,
        },
        {
          title: "Audio (TTS/STT)",
          url: "/audio",
          icon: Headphones,
        },
      ],
    },
    {
      title: "Infrastructure",
      items: [
        {
          title: "Models Management",
          url: "/models",
          icon: Box,
        },
        {
          title: "System Info",
          url: "/system",
          icon: Info,
        },
      ],
    },
  ],
  secondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" className="border-r" {...props}>
      <SidebarHeader className="h-14 border-b flex items-center px-4">
        <div className="flex items-center gap-2 font-semibold">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Cpu className="size-4" />
          </div>
          <span className="group-data-[collapsible=icon]:hidden">AI Infra</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {data.navMain.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {data.secondary.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild size="sm" tooltip={item.title}>
                <a href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
             <div className="px-2 py-1.5">
               <ModeToggle />
             </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
