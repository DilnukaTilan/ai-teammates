"use client"

import { UserButton } from "@clerk/nextjs"
import { PlusIcon, UsersIcon } from "lucide-react"
import { useId, useRef, useState } from "react"

import { BotDialog } from "@/components/bot-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  const [botDialogOpen, setBotDialogOpen] = useState(false)
  const createButtonRef = useRef<HTMLButtonElement>(null)
  const avatarSeed = useId()

  return (
    <Sidebar>
      <SidebarHeader className="flex-row justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                ref={createButtonRef}
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Create new"
              />
            }
          >
            <PlusIcon aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setBotDialogOpen(true)}>
                <PlusIcon aria-hidden="true" />
                Create new bot
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UsersIcon aria-hidden="true" />
                Create group chat
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <BotDialog
          avatarSeed={avatarSeed}
          open={botDialogOpen}
          onOpenChange={setBotDialogOpen}
          finalFocus={createButtonRef}
        />
      </SidebarHeader>
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
