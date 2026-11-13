"use client"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import type RFB from "@novnc/novnc"
import { RefreshCwIcon } from "lucide-react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { connectChatDesktop } from "@/actions/chat-desktop"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable"
import { Spinner } from "@/components/ui/spinner"
import { useIsMobile } from "@/hooks/use-mobile"

const ChatDesktopPanelContext = createContext<{
  open: boolean
  hasOpened: boolean
  isMobile: boolean
  fullscreenDialog: ReturnType<typeof DialogPrimitive.createHandle>
  startDesktop: () => void
  toggle: () => void
} | null>(null)

export function ChatDesktopPanelProvider({
  children,
}: {
  children: ReactNode
}) {
  const [visibility, setVisibility] = useState<"idle" | "open" | "closed">(
    "idle"
  )
  const [fullscreenDialog] = useState(() => DialogPrimitive.createHandle())
  const isMobile = useIsMobile()

  return (
    <ChatDesktopPanelContext
      value={{
        open: visibility === "open" && !isMobile,
        hasOpened: visibility !== "idle",
        isMobile,
        fullscreenDialog,
        startDesktop: () =>
          setVisibility((previous) =>
            previous === "idle" ? "closed" : previous
          ),
        toggle: () =>
          setVisibility((previous) =>
            previous === "open" ? "closed" : "open"
          ),
      }}
    >
      {children}
    </ChatDesktopPanelContext>
  )
}

export function useChatDesktopPanel() {
  const context = useContext(ChatDesktopPanelContext)

  if (!context) {
    throw new Error("useChatDesktopPanel requires ChatDesktopPanelProvider")
  }

  return context
}

type DesktopStatus =
  { state: "connecting" | "connected" } | { state: "error"; message: string }

const reconnectMessage = "Desktop disconnected. Try reconnecting."

export function ChatDesktopPanel({
  chatId,
  panelId,
  teammateName,
}: {
  chatId: string
  panelId: string
  teammateName: string
}) {
  const { open, hasOpened, fullscreenDialog, startDesktop } =
    useChatDesktopPanel()
  const [fullscreen, setFullscreen] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<DesktopStatus>({ state: "connecting" })
  const desktopRef = useRef<HTMLDivElement | null>(null)
  const clientRef = useRef<RFB | null>(null)
  const interactiveRef = useRef(false)
  const title = `${teammateName}’s screen`

  const attachDesktop = useCallback((slot: HTMLDivElement | null) => {
    if (!slot) return

    // The client owns this canvas. Move its container without recreating it.
    const desktop = (desktopRef.current ??= document.createElement("div"))
    desktop.className = "size-full"
    slot.append(desktop)
  }, [])

  useEffect(() => {
    if (!hasOpened) return

    let active = true
    let failed = false
    let client: RFB | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined

    function fail(message: string) {
      if (!active || failed) return

      failed = true
      clearTimeout(timeout)
      client?.disconnect()
      setStatus({ state: "error", message })
    }

    async function connect() {
      try {
        const { default: VncClient } = await import("@novnc/novnc")
        if (!active) return

        const result = await connectChatDesktop(chatId)
        if (!active) return
        if ("error" in result) {
          fail(result.error)
          return
        }

        const desktop = (desktopRef.current ??= document.createElement("div"))
        client = new VncClient(desktop, result.url, { wsProtocols: ["binary"] })
        clientRef.current = client
        client.scaleViewport = true
        client.viewOnly = !interactiveRef.current
        const canvas = desktop.querySelector("canvas")
        if (canvas) {
          canvas.tabIndex = 0
          canvas.setAttribute("aria-label", "Remote desktop")
        }
        timeout = setTimeout(() => fail(reconnectMessage), 15_000)

        client.addEventListener("connect", () => {
          if (!active || failed) return

          clearTimeout(timeout)
          setStatus({ state: "connected" })
        })
        client.addEventListener("disconnect", () => fail(reconnectMessage))
        client.addEventListener("credentialsrequired", () =>
          fail("The desktop requires VNC credentials.")
        )
      } catch {
        fail("Couldn’t connect to the desktop. Try reconnecting.")
      }
    }

    void connect()

    return () => {
      active = false
      clearTimeout(timeout)
      client?.disconnect()
      clientRef.current = null
    }
  }, [attempt, chatId, hasOpened])

  const reconnect = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Reconnect desktop"
      title="Reconnect desktop"
      disabled={status.state === "connecting"}
      onClick={() => {
        setStatus({ state: "connecting" })
        setAttempt((previous) => previous + 1)
      }}
    >
      <RefreshCwIcon aria-hidden="true" data-icon="inline-start" />
    </Button>
  )

  const feedback = status.state !== "connected" && (
    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-muted px-2 text-center text-sm text-muted-foreground">
      {status.state === "error" ? (
        <p role="alert">{status.message}</p>
      ) : (
        <p role="status" className="flex items-center gap-2">
          <Spinner aria-hidden="true" />
          Connecting…
        </p>
      )}
    </div>
  )

  return (
    <Dialog
      handle={fullscreenDialog}
      disablePointerDismissal
      onOpenChange={(next, details) => {
        if (!next && details.reason !== "close-press") {
          details.cancel()
          return
        }

        if (next) startDesktop()
        interactiveRef.current = next
        const client = clientRef.current
        if (client) {
          if (!next) client.blur()
          client.viewOnly = !next
        }
        setFullscreen(next)
      }}
    >
      {open && (
        <>
          <ResizableHandle aria-label="Resize desktop panel" />
          <ResizablePanel
            id={panelId}
            defaultSize="30%"
            minSize="15%"
            maxSize="50%"
            className="min-w-0"
          >
            <div className="flex h-full flex-col gap-4 overflow-auto p-4">
              <div className="flex justify-end">{reconnect}</div>
              <figure className="flex flex-col gap-3">
                <div className="relative aspect-[8/5] overflow-hidden rounded-xl border bg-muted">
                  {!fullscreen && (
                    <div ref={attachDesktop} className="size-full" inert />
                  )}
                  {feedback}
                  {status.state === "connected" && (
                    <DialogTrigger
                      render={
                        <button
                          type="button"
                          className="absolute inset-0 cursor-zoom-in rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                          aria-label={`Open ${title} fullscreen`}
                        />
                      }
                    />
                  )}
                </div>
                <figcaption className="text-center text-sm text-muted-foreground">
                  {title}
                </figcaption>
              </figure>
            </div>
          </ResizablePanel>
        </>
      )}
      <DialogContent
        className="top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 sm:max-w-none data-open:animate-none data-closed:animate-none"
        initialFocus={() => desktopRef.current?.querySelector("canvas") ?? true}
      >
        <DialogHeader className="h-12 shrink-0 flex-row items-center justify-between border-b pr-12 pl-4">
          <DialogTitle className="truncate">{title}</DialogTitle>
          {reconnect}
        </DialogHeader>
        <div className="relative min-h-0 flex-1 overflow-hidden bg-muted">
          {fullscreen && <div ref={attachDesktop} className="size-full" />}
          {feedback}
        </div>
      </DialogContent>
    </Dialog>
  )
}
