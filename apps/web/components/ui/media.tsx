import * as React from "react"
import Image, { type ImageProps } from "next/image"

import { cn } from "@/lib/utils"

type Ratio = "cover" | "card" | "square" | "portrait"

const ratioClass: Record<Ratio, string> = {
  cover: "aspect-[3/2]",
  card: "aspect-[4/3]",
  square: "aspect-square",
  portrait: "aspect-[3/4]",
}

type MediaProps = Omit<ImageProps, "className"> & {
  ratio?: Ratio
  className?: string
  imgClassName?: string
}

function Media({
  ratio = "card",
  className,
  imgClassName,
  alt,
  fill = true,
  ...props
}: MediaProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-mk-line",
        ratioClass[ratio],
        className
      )}
    >
      <Image
        alt={alt}
        fill={fill}
        className={cn("object-cover", imgClassName)}
        {...props}
      />
    </div>
  )
}

export { Media }
