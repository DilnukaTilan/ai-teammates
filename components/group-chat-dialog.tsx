"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useId, type RefObject } from "react"
import { Controller, useForm } from "react-hook-form"

import { createGroupChat } from "@/actions/chat"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  createGroupChatSchema,
  type ChatBot,
  type CreateGroupChatInput,
} from "@/lib/db/schema"

export function GroupChatDialog({
  bots,
  open,
  onOpenChange,
  finalFocus,
}: {
  bots: ChatBot[]
  open: boolean
  onOpenChange: (open: boolean) => void
  finalFocus: RefObject<HTMLElement | null>
}) {
  const id = useId()
  const router = useRouter()
  const form = useForm<CreateGroupChatInput>({
    resolver: zodResolver(createGroupChatSchema),
    defaultValues: { name: "", botIds: [] },
  })
  const {
    reset,
    formState: { errors, isSubmitting },
  } = form

  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  async function onSubmit(values: CreateGroupChatInput) {
    try {
      const result = await createGroupChat(values)
      if (result.success) {
        onOpenChange(false)
        router.push(`/chats/${encodeURIComponent(result.chatId)}`)
        return
      }

      let hasFieldError = false
      for (const field of ["name", "botIds"] as const) {
        const message = result.fieldErrors?.[field]?.[0]
        if (message) {
          form.setError(field, { type: "server", message })
          hasFieldError = true
        }
      }
      if (!hasFieldError) form.setError("root", { message: result.error })
    } catch {
      form.setError("root", {
        message:
          "Could not create your group. Check your connection and try again.",
      })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) onOpenChange(nextOpen)
      }}
    >
      <DialogContent
        finalFocus={finalFocus}
        showCloseButton={!isSubmitting}
        className="max-h-[calc(100svh-2rem)] gap-5 overflow-y-auto sm:max-w-sm"
      >
        <DialogHeader>
          <DialogTitle>New group chat</DialogTitle>
          <DialogDescription>
            Name the group and pick which bots are in it.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          aria-busy={isSubmitting}
          className="flex flex-col gap-5"
        >
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
              <Input
                {...form.register("name")}
                id={`${id}-name`}
                placeholder="Weekend plans"
                required
                maxLength={100}
                readOnly={isSubmitting}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? `${id}-name-error` : undefined}
              />
              <FieldError id={`${id}-name-error`} errors={[errors.name]} />
            </Field>
            <FieldSet>
              <FieldLegend variant="label">Bots</FieldLegend>
              {bots.length < 2 && (
                <p className="text-sm text-muted-foreground">
                  You need at least two bots to create a group.
                </p>
              )}
              <Controller
                name="botIds"
                control={form.control}
                render={({ field, fieldState }) => (
                  <FieldGroup className="gap-3">
                    {bots.map((bot, index) => {
                      const checkboxId = `${id}-bot-${bot.id}`
                      return (
                        <Field
                          key={bot.id}
                          orientation="horizontal"
                          data-invalid={fieldState.invalid}
                          className="gap-3"
                        >
                          <Checkbox
                            id={checkboxId}
                            ref={index === 0 ? field.ref : undefined}
                            checked={field.value.includes(bot.id)}
                            onBlur={field.onBlur}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked
                                  ? [...field.value, bot.id]
                                  : field.value.filter(
                                      (botId) => botId !== bot.id
                                    )
                              )
                            }
                            disabled={isSubmitting}
                            aria-invalid={fieldState.invalid}
                            aria-describedby={
                              fieldState.error ? `${id}-bots-error` : undefined
                            }
                          />
                          <FieldLabel
                            htmlFor={checkboxId}
                            className="min-w-0 gap-3 font-normal"
                          >
                            <ChatAvatar
                              seed={bot.avatar}
                              alt=""
                              className="size-5"
                            />
                            <span className="truncate">{bot.name}</span>
                          </FieldLabel>
                        </Field>
                      )
                    })}
                    <FieldError
                      id={`${id}-bots-error`}
                      errors={[fieldState.error]}
                    />
                  </FieldGroup>
                )}
              />
            </FieldSet>
          </FieldGroup>
          <FieldError errors={[errors.root]} />
          <DialogFooter className="flex-row justify-end">
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                />
              }
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || bots.length < 2}>
              {isSubmitting && <Spinner data-icon="inline-start" />}
              Create group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
