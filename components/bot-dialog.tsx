"use client"

import {
  useEffect,
  useId,
  useState,
  type ReactElement,
  type RefObject,
} from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ShuffleIcon } from "lucide-react"
import { unstable_rethrow } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { createBot, deleteBot, updateBot } from "@/actions/bot"
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
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { createBotSchema, type EditableBot } from "@/lib/db/schema"

const presets = [
  {
    job: "Research assistant",
    instructions:
      "Answer briefly, cite sources, and ask before running anything destructive.",
  },
  {
    job: "Code reviewer",
    instructions:
      "Review code for bugs, security risks, and readability. Explain your findings and suggest concrete fixes.",
  },
  {
    job: "Writing editor",
    instructions:
      "Improve clarity, grammar, and flow while preserving my voice. Explain significant edits.",
  },
  {
    job: "Tutor",
    instructions:
      "Explain ideas step by step, use examples, and ask questions to check my understanding.",
  },
]

type BotDialogProps = {
  children?: ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
  finalFocus?: RefObject<HTMLElement | null>
} & (
  { bot: EditableBot; avatarSeed?: never } | { bot?: never; avatarSeed: string }
)

export function BotDialog({
  children,
  avatarSeed,
  bot,
  open: controlledOpen,
  onOpenChange,
  finalFocus,
}: BotDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const open = controlledOpen ?? internalOpen
  function setOpen(nextOpen: boolean) {
    setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }
  const id = useId()
  const editing = !!bot
  const form = useForm<z.input<typeof createBotSchema>>({
    resolver: zodResolver(createBotSchema),
    defaultValues: {
      avatar: bot?.avatar ?? avatarSeed,
      name: bot?.name ?? "",
      job: bot?.job ?? "",
      instructions: bot?.instructions ?? "",
    },
  })
  const job = useWatch({ control: form.control, name: "job" })
  const pending = form.formState.isSubmitting || deleting
  const { reset } = form

  useEffect(() => {
    if (open) {
      reset({
        avatar: bot?.avatar ?? crypto.randomUUID(),
        name: bot?.name ?? "",
        job: bot?.job ?? "",
        instructions: bot?.instructions ?? "",
      })
    }
  }, [
    open,
    reset,
    bot?.id,
    bot?.avatar,
    bot?.name,
    bot?.job,
    bot?.instructions,
  ])

  async function onSubmit(values: z.output<typeof createBotSchema>) {
    if (pending || deleteOpen) return
    form.clearErrors("root")

    try {
      const result = bot
        ? await updateBot(bot.id, values)
        : await createBot(values)

      if (!result.success) {
        if (result.fieldErrors) {
          for (const field of [
            "name",
            "avatar",
            "job",
            "instructions",
          ] as const) {
            const message = result.fieldErrors[field]?.[0]
            if (message) form.setError(field, { type: "server", message })
          }
        }
        form.setError("root", { message: result.error })
        return
      }

      setOpen(false)
      toast.add({
        title: editing
          ? `${result.bot.name} updated.`
          : `${result.bot.name} is ready.`,
        type: "success",
      })
    } catch {
      form.setError("root", {
        message: editing
          ? "Could not update your bot. Check your connection and try again."
          : "Could not create your bot. Check your connection and try again.",
      })
    }
  }

  async function onDelete() {
    if (!bot || pending) return
    setDeleteError(null)
    setDeleting(true)

    try {
      const result = await deleteBot(bot.id)
      setDeleteError(result.error)
    } catch (error) {
      // Let Next.js handle the successful deletion's redirect.
      unstable_rethrow(error)
      setDeleteError(
        "Could not delete your bot. Check your connection and try again."
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
        setOpen(nextOpen)
      }}
    >
      {children && <DialogTrigger render={children} />}
      <DialogContent
        finalFocus={finalFocus}
        showCloseButton={!pending}
        className="max-h-[calc(100svh-2rem)] gap-6 overflow-y-auto sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>{editing ? "Edit bot" : "New bot"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update its face, name, and job."
              : "Give it a face, a name, and a job to do."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-6"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          aria-busy={pending}
        >
          <ToggleGroup
            aria-label="Job presets"
            variant="outline"
            className="w-full flex-wrap"
            value={presets.some((preset) => preset.job === job) ? [job] : []}
            disabled={pending}
            onValueChange={(values) => {
              const preset = presets.find((item) => item.job === values[0])
              if (!preset) return
              form.setValue("job", preset.job, {
                shouldDirty: true,
                shouldValidate: true,
              })
              form.setValue("instructions", preset.instructions, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }}
          >
            {presets.map((preset) => (
              <ToggleGroupItem
                key={preset.job}
                value={preset.job}
                className="rounded-full"
              >
                {preset.job}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <FieldGroup className="gap-6">
            <Controller
              name="avatar"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  data-disabled={pending}
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <ChatAvatar seed={field.value} className="size-14" />
                    <FieldContent className="min-w-40">
                      <FieldTitle id={`${id}-face`}>Face</FieldTitle>
                      <FieldDescription id={`${id}-face-description`}>
                        Shuffle until you find one you like.
                      </FieldDescription>
                    </FieldContent>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      aria-labelledby={`${id}-face ${id}-shuffle`}
                      aria-describedby={
                        fieldState.invalid
                          ? `${id}-face-description ${id}-face-error`
                          : `${id}-face-description`
                      }
                      aria-invalid={fieldState.invalid}
                      onClick={() => field.onChange(crypto.randomUUID())}
                    >
                      <ShuffleIcon
                        data-icon="inline-start"
                        aria-hidden="true"
                      />
                      <span id={`${id}-shuffle`}>Shuffle</span>
                    </Button>
                  </div>
                  {fieldState.invalid && (
                    <FieldError
                      id={`${id}-face-error`}
                      errors={[fieldState.error]}
                    />
                  )}
                </Field>
              )}
            />
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  data-disabled={pending}
                >
                  <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
                  <Input
                    {...field}
                    id={`${id}-name`}
                    placeholder="Ada"
                    autoComplete="off"
                    maxLength={100}
                    disabled={pending}
                    aria-invalid={fieldState.invalid}
                    aria-describedby={
                      fieldState.invalid ? `${id}-name-error` : undefined
                    }
                  />
                  {fieldState.invalid && (
                    <FieldError
                      id={`${id}-name-error`}
                      errors={[fieldState.error]}
                    />
                  )}
                </Field>
              )}
            />
            <Controller
              name="job"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  data-disabled={pending}
                >
                  <FieldLabel htmlFor={`${id}-job`}>Job</FieldLabel>
                  <Input
                    {...field}
                    id={`${id}-job`}
                    placeholder="Research assistant"
                    autoComplete="off"
                    maxLength={200}
                    disabled={pending}
                    aria-invalid={fieldState.invalid}
                    aria-describedby={
                      fieldState.invalid ? `${id}-job-error` : undefined
                    }
                  />
                  {fieldState.invalid && (
                    <FieldError
                      id={`${id}-job-error`}
                      errors={[fieldState.error]}
                    />
                  )}
                </Field>
              )}
            />
            <Controller
              name="instructions"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  data-disabled={pending}
                >
                  <FieldLabel htmlFor={`${id}-instructions`}>
                    How it should work
                  </FieldLabel>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    id={`${id}-instructions`}
                    placeholder={presets[0].instructions}
                    className="min-h-28 resize-y"
                    maxLength={10000}
                    disabled={pending}
                    aria-invalid={fieldState.invalid}
                    aria-describedby={
                      fieldState.invalid
                        ? `${id}-instructions-error`
                        : undefined
                    }
                  />
                  {fieldState.invalid && (
                    <FieldError
                      id={`${id}-instructions-error`}
                      errors={[fieldState.error]}
                    />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
          {form.formState.errors.root && (
            <FieldError role="alert" errors={[form.formState.errors.root]} />
          )}
          <DialogFooter>
            {bot && (
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
                  Delete bot
                </AlertDialogTrigger>
                <AlertDialogContent aria-busy={deleting}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {bot.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes {bot.name} and its direct chats.
                      This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {deleteError && <FieldError>{deleteError}</FieldError>}
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
                      {deleting ? "Deleting bot…" : "Delete bot"}
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
            <Button type="submit" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              {editing
                ? pending
                  ? "Saving changes…"
                  : "Save changes"
                : pending
                  ? "Creating bot…"
                  : "Create bot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
