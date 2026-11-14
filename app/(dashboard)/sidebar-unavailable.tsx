"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"

import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"

export function SidebarUnavailable() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent className="group-data-[collapsible=icon]:hidden">
        <SidebarGroup>
          <Alert>
            <AlertTitle>Couldn’t load chats and bots.</AlertTitle>
            <AlertAction>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => startTransition(() => router.refresh())}
              >
                {isPending && <Spinner data-icon="inline-start" />}
                Retry
              </Button>
            </AlertAction>
          </Alert>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
