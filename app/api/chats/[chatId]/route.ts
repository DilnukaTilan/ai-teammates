import { openai } from "@ai-sdk/openai"
import {
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
} from "ai"

import { getChat } from "@/queries/chats"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params
  const chat = await getChat(chatId)

  if (!chat?.members[0]?.bot) {
    return new Response("Chat not found.", { status: 404 })
  }

  const body: { messages?: unknown } | null = await request
    .json()
    .catch(() => null)
  const result = await safeValidateUIMessages({ messages: body?.messages })

  if (!result.success || result.data.some(({ role }) => role === "system")) {
    return new Response("Invalid messages.", { status: 400 })
  }

  const messages = result.data.map(({ role, parts }) => ({
    role,
    content: parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(""),
  }))
  const lastMessage = messages.at(-1)

  if (lastMessage?.role !== "user" || !lastMessage.content.trim()) {
    return new Response("A user message is required.", { status: 400 })
  }

  const response = streamText({
    model: openai("gpt-5.6-luna"),
    instructions: "You are a helpful assistant.",
    messages: messages.filter(({ content }) => content.trim()),
    abortSignal: request.signal,
    providerOptions: { openai: { store: false } },
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: response.stream,
      sendReasoning: false,
    }),
  })
}
