"use client"

import { useChat } from "@ai-sdk/react"
import { TriggerChatTransport } from "@trigger.dev/sdk/chat"
import { isStaticToolUIPart, isTextUIPart } from "ai"
import { WrenchIcon } from "lucide-react"
import { useState } from "react"

import { mintChatAccessToken, startChatSession } from "@/actions/chat"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { Image } from "@/components/ai-elements/image"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import { ChatAvatar } from "@/components/chat-avatar"
import { CodeBlock, CodeBlockContent } from "@/components/ui/code-block"
import { SelectGroup } from "@/components/ui/select"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"
import type { ChatBot } from "@/lib/db/schema"
import type { TeammateChatMessage } from "@/trigger/chat"

type MessagePart = TeammateChatMessage["parts"][number]
type ToolPart = Extract<MessagePart, { type: `tool-${string}` }>
type VisibleToolPart = Exclude<ToolPart, { type: "tool-view_screen" }>

const toolTitles: Record<VisibleToolPart["type"], string> = {
  "tool-bash": "Run Bash",
  "tool-read_file": "Read file",
  "tool-write_file": "Write file",
  "tool-list_files": "List files",
  "tool-mouse_click": "Click",
  "tool-mouse_move": "Move pointer",
  "tool-mouse_scroll": "Scroll",
  "tool-keyboard_type": "Type text",
  "tool-keyboard_press": "Press key",
  "tool-show_screen": "Show screen",
}

const toolStatusLabels: Record<ToolPart["state"], string> = {
  "input-streaming": "Pending",
  "input-available": "Running",
  "approval-requested": "Awaiting approval",
  "approval-responded": "Responded",
  "output-available": "Completed",
  "output-error": "Failed",
  "output-denied": "Denied",
}

function formatToolOutput(part: VisibleToolPart) {
  if (part.state !== "output-available") return

  switch (part.type) {
    case "tool-bash":
      return `${part.output.text || "No command output."}${part.output.truncated ? "\n[Output truncated]" : ""}`
    case "tool-read_file":
      return [
        part.output.text || "No text in this range.",
        part.output.truncated && "[Output truncated]",
        part.output.nextLine && `Next line: ${part.output.nextLine}`,
      ]
        .filter(Boolean)
        .join("\n")
    default:
      return JSON.stringify(part.output, null, 2)
  }
}

function ToolCall({ part }: { part: VisibleToolPart }) {
  const error = part.state === "output-error"
  const pending = part.state === "input-streaming"
  const running = part.state === "input-available"
  const completed = part.state === "output-available"
  const exitCode =
    part.type === "tool-bash" && completed ? part.output.exitCode : undefined
  const failed = error || (exitCode !== undefined && exitCode !== 0)

  const line = (
    <TraceLine
      status={
        failed ? "error" : pending ? "pending" : running ? "running" : undefined
      }
    >
      <TraceIcon>
        <WrenchIcon />
      </TraceIcon>
      <TraceTitle>{toolTitles[part.type]}</TraceTitle>
      <TraceDescription>
        {exitCode !== undefined
          ? `Exit ${exitCode}`
          : toolStatusLabels[part.state]}
      </TraceDescription>
    </TraceLine>
  )

  if (part.type === "tool-show_screen" && completed) {
    return (
      <>
        {line}
        <Image
          alt="Current sandbox desktop"
          base64={part.output.base64}
          className="w-full border"
          mediaType="image/jpeg"
        />
      </>
    )
  }

  if (!completed && !error) return line

  const input =
    part.type === "tool-bash"
      ? part.input?.command
      : part.input && Object.keys(part.input).length > 0
        ? JSON.stringify(part.input, null, 2)
        : undefined

  return (
    <TraceCollapsible>
      <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
      <TraceCollapsibleContent className="flex flex-col gap-2">
        {input && (
          <CodeBlock size="sm" aria-label="Tool input">
            <CodeBlockContent className="max-h-56" wrap>
              {input}
            </CodeBlockContent>
          </CodeBlock>
        )}
        <CodeBlock
          size="sm"
          aria-label="Tool result"
          variant={failed ? "destructive" : "default"}
        >
          <CodeBlockContent className="max-h-72" wrap>
            {error ? part.errorText : formatToolOutput(part)}
          </CodeBlockContent>
        </CodeBlock>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  )
}

function AssistantMessage({ message }: { message: TeammateChatMessage }) {
  const blocks: (
    { type: "text"; text: string } | { type: "tools"; parts: VisibleToolPart[] }
  )[] = []

  for (const part of message.parts) {
    const previous = blocks.at(-1)
    if (isTextUIPart(part) && part.text) {
      if (previous?.type === "text") previous.text += part.text
      else blocks.push({ type: "text", text: part.text })
    } else if (isStaticToolUIPart(part) && part.type !== "tool-view_screen") {
      if (previous?.type === "tools") previous.parts.push(part)
      else blocks.push({ type: "tools", parts: [part] })
    }
  }

  if (blocks.length === 0) return null

  return (
    <Message from="assistant" className="min-w-0">
      <MessageContent className="w-full">
        {message.metadata?.botName && (
          <p className="text-sm font-medium text-muted-foreground">
            {message.metadata.botName}
          </p>
        )}
        {blocks.map((block, index) =>
          block.type === "text" ? (
            <MessageResponse key={index}>{block.text}</MessageResponse>
          ) : (
            <Trace
              key={block.parts[0].toolCallId}
              aria-label="Sandbox activity"
            >
              {block.parts.map((part) => (
                <ToolCall key={part.toolCallId} part={part} />
              ))}
            </Trace>
          )
        )}
      </MessageContent>
    </Message>
  )
}

export function Chat({
  chatId,
  initialMessages,
  lastEventId,
  groupBots,
}: {
  chatId: string
  initialMessages: TeammateChatMessage[]
  lastEventId?: string
  groupBots?: ChatBot[]
}) {
  const [transport] = useState(() => {
    const transport = new TriggerChatTransport({
      task: "teammate-chat",
      accessToken: ({ chatId }) => mintChatAccessToken(chatId),
      startSession: ({ chatId }) => startChatSession(chatId),
    })
    if (lastEventId) {
      transport.seedResumeCursor(chatId, lastEventId)
    }
    return transport
  })

  const { messages, sendMessage, status, stop, error } =
    useChat<TeammateChatMessage>({
      id: chatId,
      messages: initialMessages,
      transport,
    })
  const isGenerating = status === "submitted" || status === "streaming"
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null)
  const selectedBot =
    groupBots?.find((bot) => bot.id === selectedBotId) ?? groupBots?.[0]
  const canSend = !groupBots || !!selectedBot

  return (
    <>
      <Conversation className="min-h-0" aria-label="Conversation">
        <ConversationContent className="mx-auto min-h-full w-full max-w-3xl px-4 sm:px-6">
          {messages.length === 0 && (
            <ConversationEmptyState
              className="flex-1"
              title="Start a conversation"
              description={
                groupBots
                  ? "Pick a bot to reply to your message."
                  : "Send a message to your teammate."
              }
            />
          )}
          {messages.map((message) => {
            if (message.role === "assistant") {
              return <AssistantMessage key={message.id} message={message} />
            }

            const text = message.parts
              .filter(isTextUIPart)
              .map((part) => part.text)
              .join("")

            return text ? (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  <p className="wrap-anywhere whitespace-pre-wrap">{text}</p>
                </MessageContent>
              </Message>
            ) : null
          })}
        </ConversationContent>
        <ConversationScrollButton aria-label="Scroll to latest message" />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-4 sm:px-6">
        {error && (
          <p role="alert" className="mb-2 text-sm text-destructive">
            Couldn’t get a reply. Please try again.
          </p>
        )}
        <PromptInput
          maxFiles={0}
          onSubmit={({ text }) => {
            const message = text.trim()
            if (message && !isGenerating && canSend) {
              void sendMessage(
                { text: message },
                selectedBot
                  ? { metadata: { botId: selectedBot.id } }
                  : undefined
              )
            }
          }}
        >
          <PromptInputTextarea
            aria-label="Message"
            placeholder={
              groupBots ? "Message the group…" : "Message your teammate…"
            }
            disabled={isGenerating || !canSend}
          />
          <PromptInputFooter>
            {groupBots && (
              <PromptInputSelect
                value={selectedBot?.id ?? null}
                onValueChange={(value) => {
                  if (typeof value === "string") setSelectedBotId(value)
                }}
                disabled={isGenerating || !canSend}
              >
                <PromptInputSelectTrigger
                  aria-label="Bot to reply"
                  className="max-w-[75%] min-w-0"
                >
                  <PromptInputSelectValue placeholder="No bots available">
                    {selectedBot && (
                      <>
                        <ChatAvatar
                          seed={selectedBot.avatar}
                          alt=""
                          className="size-4"
                        />
                        <span className="truncate">{selectedBot.name}</span>
                      </>
                    )}
                  </PromptInputSelectValue>
                </PromptInputSelectTrigger>
                <PromptInputSelectContent
                  side="top"
                  align="start"
                  alignItemWithTrigger={false}
                >
                  <SelectGroup>
                    {groupBots.map((bot) => (
                      <PromptInputSelectItem
                        key={bot.id}
                        value={bot.id}
                        label={bot.name}
                      >
                        <ChatAvatar
                          seed={bot.avatar}
                          alt=""
                          className="size-4"
                        />
                        <span className="truncate">{bot.name}</span>
                      </PromptInputSelectItem>
                    ))}
                  </SelectGroup>
                </PromptInputSelectContent>
              </PromptInputSelect>
            )}
            <PromptInputSubmit
              className="ml-auto"
              status={isGenerating ? status : "ready"}
              onStop={stop}
              disabled={!canSend}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  )
}
