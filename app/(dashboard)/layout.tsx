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
import { getChats } from "@/queries/bot"

async function SidebarWithChats() {
  const chats = await getChats()

  return <AppSidebar chats={chats} referenceDate={new Date()} />
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
