"use client"

import { UserButton } from "@clerk/nextjs"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<div />}
              size="lg"
              className="p-0 has-focus-visible:ring-2"
            >
              <UserButton
                showName
                appearance={{
                  elements: {
                    rootBox: {
                      width: "100%",
                      height: "100%",
                      color: "inherit",
                    },
                    userButtonTrigger: {
                      width: "100%",
                      height: "100%",
                      padding: "calc(var(--spacing) * 2)",
                      borderRadius: "var(--radius-md)",
                      color: "inherit",
                      boxShadow: "none",
                      "&:focus-visible": { boxShadow: "none" },
                    },
                    userButtonBox: {
                      width: "100%",
                      minWidth: 0,
                      flexDirection: "row-reverse",
                      justifyContent: "flex-end",
                      gap: "calc(var(--spacing) * 2)",
                    },
                    userButtonAvatarBox: {
                      width: "calc(var(--spacing) * 8)",
                      height: "calc(var(--spacing) * 8)",
                      flexShrink: 0,
                    },
                    userButtonOuterIdentifier: {
                      minWidth: 0,
                      padding: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "var(--text-sm)",
                      fontWeight: "var(--font-weight-normal)",
                      color: "inherit",
                    },
                  },
                }}
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
