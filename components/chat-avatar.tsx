import { Avatar, Style } from "@dicebear/core"
import gaze from "@dicebear/styles/gaze.json"
import Image from "next/image"

import { cn } from "@/lib/utils"

const gazeStyle = new Style(gaze)

type ChatAvatarProps = {
  seed: string
  animated?: boolean
  className?: string
}

export function ChatAvatar({
  seed,
  animated = false,
  className,
}: ChatAvatarProps) {
  const avatar = new Avatar(gazeStyle, {
    seed,
    size: 32,
    tags: [animated ? "animation" : "!animation"],
  })

  return (
    <Image
      src={avatar.toDataUri()}
      alt="Chat avatar"
      width={32}
      height={32}
      className={cn("size-8 shrink-0", className)}
      unoptimized
    />
  )
}
