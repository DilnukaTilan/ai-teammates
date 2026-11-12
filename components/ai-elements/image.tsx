import { cn } from "@/lib/utils"
import type { Experimental_GeneratedImage } from "ai"

export type ImageProps = Pick<
  Experimental_GeneratedImage,
  "base64" | "mediaType"
> &
  Partial<Pick<Experimental_GeneratedImage, "uint8Array">> & {
    className?: string
    alt?: string
  }

export const Image = ({ base64, mediaType, alt, className }: ImageProps) => (
  // eslint-disable-next-line @next/next/no-img-element -- Inline image data is already available to the browser.
  <img
    alt={alt}
    className={cn("h-auto max-w-full overflow-hidden rounded-md", className)}
    src={`data:${mediaType};base64,${base64}`}
  />
)
