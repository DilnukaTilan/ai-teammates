"use client"

import { useChat } from "@ai-sdk/react"
import { TriggerChatTransport } from "@trigger.dev/sdk/chat"
import { isTextUIPart, type UIMessage } from "ai"
import { useState } from "react"

import { mintChatAccessToken, startChatSession } from "@/actions/chat"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"

export function Chat({
  chatId,
  initialMessages,
  lastEventId,
}: {
  chatId: string
  initialMessages: UIMessage[]
  lastEventId?: string
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

  const { messages, sendMessage, status, stop, error } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
  })
  const isGenerating = status === "submitted" || status === "streaming"

  return (
    <>
      <Conversation className="min-h-0" aria-label="Conversation">
        <ConversationContent className="mx-auto min-h-full w-full max-w-3xl px-4 sm:px-6">
          {messages.length === 0 && (
            <ConversationEmptyState
              className="flex-1"
              title="Start a conversation"
              description="Send a message to your teammate."
            />
          )}
          {messages.map((message) => {
            const text = message.parts
              .filter(isTextUIPart)
              .map((part) => part.text)
              .join("")

            return text ? (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.role === "assistant" ? (
                    <MessageResponse>{text}</MessageResponse>
                  ) : (
                    <p className="wrap-anywhere whitespace-pre-wrap">{text}</p>
                  )}
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
            if (message && !isGenerating) {
              void sendMessage({ text: message })
            }
          }}
        >
          <PromptInputTextarea
            aria-label="Message"
            placeholder="Message your teammate…"
            disabled={isGenerating}
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit
              status={isGenerating ? status : "ready"}
              onStop={stop}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  )
}
