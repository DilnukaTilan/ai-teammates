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

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider>
      <Suspense fallback={<SidebarLoading />}>
        <SidebarWithChats />
      </Suspense>
      <div className="min-w-0 flex-1">{children}</div>
    </SidebarProvider>
  )
}
