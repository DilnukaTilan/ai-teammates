import { openai } from "@ai-sdk/openai"
import { chat } from "@trigger.dev/sdk/ai"
import { isTextUIPart, validateUIMessages } from "ai"

export const teammateChat = chat.agent({
  id: "teammate-chat",
  system: "You are a helpful assistant.",
  uiMessageStreamOptions: { sendReasoning: false },
  onValidateMessages: async ({ messages }) => {
    const validated = await validateUIMessages({ messages })

    return validated.map(({ id, role, parts }) => {
      const text = parts
        .filter(isTextUIPart)
        .map((part) => part.text)
        .join("")

      if (role !== "user" || !text.trim()) {
        throw new Error("A user message is required.")
      }

      return { id, role, parts: [{ type: "text", text }] }
    })
  },
  run: async ({ messages, signal, streamText }) =>
    streamText({
      model: openai("gpt-5.6-luna"),
      messages,
      abortSignal: signal,
      providerOptions: { openai: { store: false } },
    }),
})
