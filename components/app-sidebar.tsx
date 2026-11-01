"use client"

import { UserButton } from "@clerk/nextjs"
import { formatDistanceStrict } from "date-fns"
import { PlusIcon, SearchIcon, UsersIcon } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import type { SidebarChat } from "@/queries/bot"

type AppSidebarProps = {
  chats: SidebarChat[]
  referenceDate: Date
}

function subscribeToPlatform() {
  return () => {}
}

function getSearchShortcut() {
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? "⌘K" : "Ctrl+K"
}

function ChatRow({
  chat,
  referenceDate,
}: {
  chat: SidebarChat
  referenceDate: Date
}) {
  return (
    <>
      <ChatAvatar
        seed={chat.bot?.avatar ?? chat.id}
        className="group-data-[collapsible=icon]:size-8"
      />
      <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate font-medium">
            {chat.bot?.name ?? "New chat"}
          </span>
          <time
            dateTime={chat.lastMessageAt.toISOString()}
            className="ml-auto shrink-0 text-xs text-muted-foreground"
          >
            {formatDistanceStrict(chat.lastMessageAt, referenceDate)}
          </time>
        </div>
        <span className="truncate text-muted-foreground">
          {chat.lastMessagePreview}
        </span>
      </div>
    </>
  )
}

export function AppSidebar({ chats, referenceDate }: AppSidebarProps) {
  const { chatId } = useParams<{ chatId?: string }>()
  const router = useRouter()
  const { state, isMobile } = useSidebar()
  const iconOnly = state === "collapsed" && !isMobile
  const [botDialogOpen, setBotDialogOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const createButtonRef = useRef<HTMLButtonElement>(null)
  const searchButtonRef = useRef<HTMLButtonElement>(null)
  const avatarSeed = useId()
  const searchShortcut = useSyncExternalStore(
    subscribeToPlatform,
    getSearchShortcut,
    () => "Ctrl+K"
  )

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.altKey ||
        event.shiftKey ||
        botDialogOpen
      ) {
        return
      }

      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [botDialogOpen])

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex justify-end">
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
          </div>
          <BotDialog
            avatarSeed={avatarSeed}
            open={botDialogOpen}
            onOpenChange={setBotDialogOpen}
            finalFocus={createButtonRef}
          />
          <Button
            ref={searchButtonRef}
            type="button"
            variant="ghost"
            aria-label="Search chats"
            aria-keyshortcuts="Meta+K Control+K"
            aria-haspopup="dialog"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen(true)}
            className="h-8 w-full min-w-0 justify-start gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base font-normal text-muted-foreground transition-colors outline-none group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:text-sidebar-foreground file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground group-data-[collapsible=icon]:hover:bg-sidebar-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
          >
            <SearchIcon data-icon="inline-start" aria-hidden="true" />
            <span className="group-data-[collapsible=icon]:hidden">Search</span>
            <Kbd className="ml-auto bg-transparent px-0 group-data-[collapsible=icon]:hidden">
              {searchShortcut}
            </Kbd>
          </Button>
        </SidebarHeader>
        <SidebarContent className="group-data-[collapsible=icon]:overflow-y-auto">
          <SidebarGroup aria-label="Chats">
            <SidebarGroupContent>
              <SidebarMenu
                aria-label="Chats"
                className="group-data-[collapsible=icon]:gap-2"
              >
                {chats.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      render={
                        <Link href={`/chats/${encodeURIComponent(chat.id)}`} />
                      }
                      isActive={chat.id === chatId}
                      aria-current={chat.id === chatId ? "page" : undefined}
                      size="lg"
                      className="group-data-[collapsible=icon]:justify-center"
                      aria-label={chat.bot?.name ?? "New chat"}
                      tooltip={chat.bot?.name ?? "New chat"}
                    >
                      <ChatRow chat={chat} referenceDate={referenceDate} />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<div />}
                size="lg"
                className="p-0 group-data-[collapsible=icon]:justify-center has-focus-visible:ring-2"
              >
                <UserButton
                  showName={!iconOnly}
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
                        padding: iconOnly ? "0" : "calc(var(--spacing) * 2)",
                        borderRadius: "var(--radius-md)",
                        color: "inherit",
                        boxShadow: "none",
                        "&:focus-visible": { boxShadow: "none" },
                      },
                      userButtonBox: {
                        width: "100%",
                        minWidth: 0,
                        flexDirection: "row-reverse",
                        justifyContent: iconOnly ? "center" : "flex-end",
                        gap: iconOnly ? "0" : "calc(var(--spacing) * 2)",
                      },
                      userButtonAvatarBox: {
                        width: iconOnly
                          ? "calc(var(--spacing) * 6)"
                          : "calc(var(--spacing) * 8)",
                        height: iconOnly
                          ? "calc(var(--spacing) * 6)"
                          : "calc(var(--spacing) * 8)",
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
        <SidebarRail />
      </Sidebar>
      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Search chats"
        description="Search your chats by bot name or message preview."
        showCloseButton
        finalFocus={searchButtonRef}
        className="top-[min(20svh,8rem)] sm:max-w-lg"
      >
        <Command>
          <CommandInput
            placeholder="Search chats…"
            aria-label="Search chats"
            className="pr-8"
          />
          <CommandList className="max-h-[min(18rem,50svh)]">
            <CommandEmpty>No chats found.</CommandEmpty>
            <CommandGroup heading="Chats">
              {chats.map((chat) => (
                <CommandItem
                  key={chat.id}
                  value={chat.id}
                  keywords={[
                    chat.bot?.name ?? "New chat",
                    chat.lastMessagePreview ?? "",
                  ]}
                  onSelect={() => {
                    setSearchOpen(false)
                    router.push(`/chats/${encodeURIComponent(chat.id)}`)
                  }}
                  className="[&>svg:last-child]:hidden"
                >
                  <ChatRow chat={chat} referenceDate={referenceDate} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
