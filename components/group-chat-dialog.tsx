"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { unstable_rethrow, useRouter } from "next/navigation"
import { useId, useState, type ReactElement, type RefObject } from "react"
import { Controller, useForm } from "react-hook-form"

import {
  createGroupChat,
  deleteGroupChat,
  updateGroupChat,
} from "@/actions/chat"
import { ChatAvatar } from "@/components/chat-avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
  DialogTrigger,
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
import { toast } from "@/components/ui/toast"
import {
  createGroupChatSchema,
  type ChatBot,
  type CreateGroupChatInput,
} from "@/lib/db/schema"

type GroupChatDialogProps = {
  bots: ChatBot[]
} & (
  | {
      group: { id: string; name: string; botIds: string[] }
      children: ReactElement
      open?: never
      onOpenChange?: never
      finalFocus?: never
    }
  | {
      group?: never
      children?: never
      open: boolean
      onOpenChange: (open: boolean) => void
      finalFocus: RefObject<HTMLElement | null>
    }
)

export function GroupChatDialog({
  bots,
  group,
  children,
  open: controlledOpen,
  onOpenChange,
  finalFocus,
}: GroupChatDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const id = useId()
  const router = useRouter()
  const form = useForm<CreateGroupChatInput>({
    resolver: zodResolver(createGroupChatSchema),
    defaultValues: { name: group?.name ?? "", botIds: group?.botIds ?? [] },
  })
  const {
    reset,
    formState: { errors, isSubmitting },
  } = form

  const pending = isSubmitting || deleting

  async function onSubmit(values: CreateGroupChatInput) {
    if (deleteOpen || deleting) return
    form.clearErrors("root")

    try {
      const result = group
        ? await updateGroupChat(group.id, values)
        : await createGroupChat(values)
      if (result.success) {
        setOpen(false)
        if (group) {
          toast.add({ title: "Group chat updated.", type: "success" })
        } else {
          router.push(`/chats/${encodeURIComponent(result.chatId)}`)
        }
        return
      }

      const fieldErrors: Partial<Record<keyof CreateGroupChatInput, string[]>> =
        result.fieldErrors ?? {}
      let hasFieldError = false
      for (const field of ["name", "botIds"] as const) {
        const message = fieldErrors[field]?.[0]
        if (message) {
          form.setError(field, { type: "server", message })
          hasFieldError = true
        }
      }
      if (!hasFieldError) form.setError("root", { message: result.error })
    } catch {
      form.setError("root", {
        message: group
          ? "Could not update your group. Check your connection and try again."
          : "Could not create your group. Check your connection and try again.",
      })
    }
  }

  async function onDelete() {
    if (!group || pending) return
    setDeleteError(null)
    setDeleting(true)

    try {
      const result = await deleteGroupChat(group.id)
      setDeleteError(result.error)
    } catch (error) {
      unstable_rethrow(error)
      setDeleteError(
        "Could not delete your group. Check your connection and try again."
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (pending || deleteOpen) return
        if (nextOpen && group) reset({ name: group.name, botIds: group.botIds })
        setOpen(nextOpen)
      }}
      onOpenChangeComplete={(nextOpen) => {
        if (!nextOpen && !group) reset()
      }}
    >
      {children && <DialogTrigger render={children} />}
      <DialogContent
        finalFocus={finalFocus}
        showCloseButton={!pending}
        className="max-h-[calc(100svh-2rem)] gap-5 overflow-y-auto sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>
            {group ? "Edit group chat" : "New group chat"}
          </DialogTitle>
          <DialogDescription>
            {group
              ? "Change the group name or choose which bots are in it."
              : "Name the group and pick which bots are in it."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          aria-busy={pending}
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
                readOnly={pending}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? `${id}-name-error` : undefined}
              />
              <FieldError id={`${id}-name-error`} errors={[errors.name]} />
            </Field>
            <FieldSet>
              <FieldLegend variant="label">Bots</FieldLegend>
              {bots.length < 2 && (
                <p className="text-sm text-muted-foreground">
                  You need at least two bots in a group.
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
                            disabled={pending}
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
          <FieldError role="alert" errors={[errors.root]} />
          <DialogFooter>
            {group && (
              <AlertDialog
                open={deleteOpen}
                onOpenChange={(nextOpen) => {
                  if (deleting) return
                  setDeleteError(null)
                  setDeleteOpen(nextOpen)
                }}
              >
                <AlertDialogTrigger
                  className="sm:mr-auto"
                  render={
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={pending}
                    />
                  }
                >
                  Delete group
                </AlertDialogTrigger>
                <AlertDialogContent aria-busy={deleting}>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="max-w-full wrap-anywhere">
                      Delete {group.name}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes the group chat from your
                      workspace. Its bots and their one-on-one chats will still
                      be available.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {deleteError && (
                    <FieldError role="alert">{deleteError}</FieldError>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel type="button" disabled={deleting}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      type="button"
                      variant="destructive"
                      disabled={deleting}
                      onClick={onDelete}
                    >
                      {deleting && <Spinner data-icon="inline-start" />}
                      {deleting ? "Deleting group…" : "Delete group"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={pending} />
              }
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending || bots.length < 2}>
              {isSubmitting && <Spinner data-icon="inline-start" />}
              {group ? "Save changes" : "Create group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
