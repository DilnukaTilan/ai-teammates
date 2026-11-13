import type { Sandbox } from "@daytona/sdk"
import { tool } from "ai"
import { z } from "zod"

import { getStartedSandbox } from "../lib/daytona"

const path = z.string().min(1).max(4096)
const coordinates = {
  x: z.number().int().min(0).describe("Horizontal pixel from the left"),
  y: z.number().int().min(0).describe("Vertical pixel from the top"),
}
const modifiers = z.array(z.enum(["ctrl", "alt", "shift", "cmd"])).optional()
const maxTextLength = 12_000
const maxFileSize = 128 * 1024

export class SandboxToolError extends Error {}

function limitText(text: string) {
  return {
    text: text.slice(0, maxTextLength),
    truncated: text.length > maxTextLength,
  }
}

export function createSandboxTools(sandboxId?: string) {
  let sandboxPromise: Promise<Sandbox> | undefined
  let desktopPromise: Promise<Sandbox> | undefined
  // Image bytes for view_screen live only in the active model call's tool set.
  const privateScreens = new Map<string, string>()

  async function startSandbox() {
    if (!sandboxId) throw new SandboxToolError("This bot has no sandbox.")
    return getStartedSandbox(sandboxId)
  }

  function getSandbox() {
    return (sandboxPromise ??= startSandbox().catch((error) => {
      sandboxPromise = undefined
      throw error
    }))
  }

  function getDesktop(signal?: AbortSignal) {
    return (desktopPromise ??= getSandbox()
      .then(async (sandbox) => {
        signal?.throwIfAborted()
        const display = await sandbox.computerUse.getProcessStatus("xvfb")
        if (!display.running) {
          signal?.throwIfAborted()
          await sandbox.computerUse.start()
        }
        return sandbox
      })
      .catch((error) => {
        desktopPromise = undefined
        throw error
      }))
  }

  async function execute<T>(
    signal: AbortSignal | undefined,
    operation: (sandbox: Sandbox) => Promise<T>,
    desktop = false
  ) {
    try {
      signal?.throwIfAborted()
      const sandbox = await (desktop ? getDesktop(signal) : getSandbox())
      signal?.throwIfAborted()
      return await operation(sandbox)
    } catch (error) {
      signal?.throwIfAborted()
      if (error instanceof SandboxToolError) throw error

      console.error("Daytona tool request failed", {
        error: error instanceof Error ? error.name : "Unknown error",
        desktop,
      })
      throw new SandboxToolError(
        desktop
          ? "The sandbox desktop operation failed. Check the input and try again."
          : "The sandbox operation failed. Check the input and try again."
      )
    }
  }

  async function captureScreen(
    signal: AbortSignal | undefined,
    share: boolean
  ) {
    return execute(
      signal,
      async ({ computerUse }) => {
        const capture = (quality: number, scale: number) =>
          computerUse.screenshot.takeCompressed({
            format: "jpeg",
            quality,
            scale,
            showCursor: true,
          })

        // Shared screenshots also have to fit in a transcript record.
        const maxLength = share ? 200_000 : 2_000_000
        const { screenshot } = await capture(share ? 65 : 80, 1)
        if (screenshot && screenshot.length <= maxLength) return screenshot

        if (screenshot) {
          signal?.throwIfAborted()
          const { screenshot: smaller } = await capture(45, share ? 0.5 : 1)
          if (smaller && smaller.length <= maxLength) return smaller
        }

        throw new SandboxToolError("Could not capture the sandbox screen.")
      },
      true
    )
  }

  return {
    bash: tool({
      description:
        "Run a Bash command in the bot's sandbox and return its output and exit code.",
      inputSchema: z.object({
        command: z.string().min(1).max(8192),
        cwd: path.optional().describe("Working directory in the sandbox"),
      }),
      execute: ({ command, cwd }, { abortSignal }) =>
        execute(abortSignal, async ({ process }) => {
          const quoted = `'${command.replaceAll("'", "'\\''")}'`
          const result = await process.executeCommand(
            `bash -c ${quoted}`,
            cwd,
            undefined,
            30
          )
          return { exitCode: result.exitCode, ...limitText(result.result) }
        }),
    }),
    read_file: tool({
      description:
        "Read a UTF-8 text file from the sandbox, starting at a one-based line number.",
      inputSchema: z.object({
        path,
        startLine: z.number().int().min(1).optional(),
        lineCount: z.number().int().min(1).max(400).optional(),
      }),
      execute: ({ path, startLine = 1, lineCount = 200 }, { abortSignal }) =>
        execute(abortSignal, async ({ fs }) => {
          const file = await fs.getFileDetails(path)
          if (file.isDir)
            throw new SandboxToolError("This path is a directory.")
          if (file.size > maxFileSize) {
            throw new SandboxToolError(
              "This file is too large to read directly. Use Bash to read a specific range."
            )
          }

          abortSignal?.throwIfAborted()
          const bytes = await fs.downloadFile(path, 15)
          if (bytes.length > maxFileSize || bytes.includes(0)) {
            throw new SandboxToolError("Choose a smaller UTF-8 text file.")
          }

          let content: string
          try {
            content = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
          } catch {
            throw new SandboxToolError("This file is not valid UTF-8 text.")
          }
          const lines = content.split("\n")
          const selected = lines.slice(startLine - 1, startLine + lineCount - 1)
          const { text, truncated } = limitText(selected.join("\n"))
          const lastBreak = truncated ? text.lastIndexOf("\n") : -1
          const visible = lastBreak > 0 ? text.slice(0, lastBreak) : text
          const line =
            startLine +
            (truncated ? visible.split("\n").length : selected.length)
          return {
            text: visible,
            truncated,
            nextLine: line <= lines.length ? line : null,
          }
        }),
    }),
    write_file: tool({
      description:
        "Create or replace a UTF-8 text file in the sandbox. The parent directory must exist.",
      inputSchema: z.object({ path, content: z.string().max(32_000) }),
      execute: ({ path, content }, { abortSignal }) =>
        execute(abortSignal, async ({ fs }) => {
          const bytes = Buffer.from(content, "utf8")
          await fs.uploadFile(bytes, path, 15)
          return { bytesWritten: bytes.length }
        }),
    }),
    list_files: tool({
      description:
        "List the files and directories directly inside a sandbox directory.",
      inputSchema: z.object({ path }),
      execute: ({ path }, { abortSignal }) =>
        execute(abortSignal, async ({ fs }) => {
          const files = await fs.listFiles(path)
          return {
            entries: files.slice(0, 100).map(({ name, isDir, size }) => ({
              name,
              kind: isDir ? "directory" : "file",
              size,
            })),
            total: files.length,
          }
        }),
    }),
    mouse_click: tool({
      description: "Click at a pixel position on the sandbox desktop.",
      inputSchema: z.object({
        ...coordinates,
        button: z.enum(["left", "right", "middle"]).optional(),
        double: z.boolean().optional(),
        modifiers,
      }),
      execute: ({ x, y, button, double, modifiers }, { abortSignal }) =>
        execute(
          abortSignal,
          async ({ computerUse }) => {
            await computerUse.mouse.click(
              x,
              y,
              button,
              double,
              undefined,
              modifiers
            )
            return { clicked: true }
          },
          true
        ),
    }),
    mouse_move: tool({
      description:
        "Move the pointer to a pixel position on the sandbox desktop.",
      inputSchema: z.object(coordinates),
      execute: ({ x, y }, { abortSignal }) =>
        execute(
          abortSignal,
          async ({ computerUse }) => {
            await computerUse.mouse.move(x, y)
            return { moved: true }
          },
          true
        ),
    }),
    mouse_scroll: tool({
      description: "Scroll at a pixel position on the sandbox desktop.",
      inputSchema: z.object({
        ...coordinates,
        direction: z.enum(["up", "down", "left", "right"]),
        amount: z
          .number()
          .int()
          .min(1)
          .max(30)
          .optional()
          .describe("Wheel ticks"),
      }),
      execute: ({ x, y, direction, amount }, { abortSignal }) =>
        execute(
          abortSignal,
          async ({ computerUse }) => ({
            scrolled: await computerUse.mouse.scroll(x, y, direction, amount),
          }),
          true
        ),
    }),
    keyboard_type: tool({
      description:
        "Type text into the focused application on the sandbox desktop.",
      inputSchema: z.object({ text: z.string().min(1).max(4000) }),
      execute: ({ text }, { abortSignal }) =>
        execute(
          abortSignal,
          async ({ computerUse }) => {
            await computerUse.keyboard.type(text)
            return { typed: true }
          },
          true
        ),
    }),
    keyboard_press: tool({
      description:
        "Press a key with optional modifiers in the focused desktop application.",
      inputSchema: z.object({ key: z.string().min(1).max(32), modifiers }),
      execute: ({ key, modifiers }, { abortSignal }) =>
        execute(
          abortSignal,
          async ({ computerUse }) => {
            await computerUse.keyboard.press(key, modifiers)
            return { pressed: true }
          },
          true
        ),
    }),
    view_screen: tool({
      description:
        "Inspect the sandbox desktop privately. Use this to locate controls or verify the result of a desktop action.",
      inputSchema: z.object({}),
      execute: async (_, { abortSignal, toolCallId }) => {
        const screenshot = await captureScreen(abortSignal, false)
        abortSignal?.throwIfAborted()
        privateScreens.set(toolCallId, screenshot)
        return { captured: true }
      },
      toModelOutput: ({ toolCallId }) => {
        const screenshot = privateScreens.get(toolCallId)
        if (!screenshot) {
          return {
            type: "text",
            value:
              "An earlier screen inspection. Capture the current screen to see it.",
          }
        }

        return {
          type: "content",
          value: [
            {
              type: "file",
              mediaType: "image/jpeg",
              data: { type: "data", data: screenshot },
            },
          ],
        }
      },
    }),
    show_screen: tool({
      description:
        "Show the current sandbox screen in chat when the user asks to see it or asks what is on the screen.",
      inputSchema: z.object({}),
      execute: async (_, { abortSignal }) => ({
        base64: await captureScreen(abortSignal, true),
      }),
      toModelOutput: () => ({
        type: "text",
        value: "The screenshot was displayed in chat.",
      }),
    }),
  }
}
