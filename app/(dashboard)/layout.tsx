import { cookies } from "next/headers"
import { Suspense } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { isDatabaseConnectTimeout } from "@/lib/db/read-retry"
import { getBots } from "@/queries/bot"
import { getChats } from "@/queries/chats"

import { SidebarUnavailable } from "./sidebar-unavailable"

async function SidebarWithChats() {
  const sidebarData = await Promise.all([getChats(), getBots()]).catch(
    (error: unknown) => {
      if (!isDatabaseConnectTimeout(error)) throw error
      console.warn(
        "Could not load the sidebar after a Neon connection timeout."
      )
      return null
    }
  )

  if (!sidebarData) return <SidebarUnavailable />

  const [chats, bots] = sidebarData
  return <AppSidebar bots={bots} chats={chats} referenceDate={new Date()} />
}

function SidebarLoading() {
  return (
    <Sidebar aria-busy="true" aria-label="Loading chats">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {[0, 1, 2].map((item) => (
                <SidebarMenuItem key={item}>
                  <SidebarMenuSkeleton showIcon />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Suspense fallback={<SidebarLoading />}>
        <SidebarWithChats />
      </Suspense>
      <div className="min-w-0 flex-1">{children}</div>
    </SidebarProvider>
  )
}
