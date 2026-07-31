import * as React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { shellTask, shellWide } from "@/lib/shell"
import { cn } from "@/lib/utils"

type PageProps = React.ComponentProps<"main"> & {
  width?: "wide" | "task"
}

function Page({ width = "wide", className, children, ...props }: PageProps) {
  const shell = width === "task" ? shellTask : shellWide
  return (
    <main className={cn("px-4 pt-6 pb-16 sm:px-6", className)} {...props}>
      <div className={shell}>{children}</div>
    </main>
  )
}

type PageHeaderProps = {
  title: React.ReactNode
  actions?: React.ReactNode
  back?: { href: string; label?: string }
  className?: string
}

function PageHeader({ title, actions, back, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-6 flex flex-col gap-2", className)}>
      {back ? (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1 text-meta text-mk-muted hover:text-mk-ink"
        >
          <ArrowLeft className="size-4" />
          {back.label ?? "Back"}
        </Link>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-title text-mk-ink">{title}</h1>
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  )
}

type SectionProps = Omit<React.ComponentProps<"section">, "title"> & {
  title?: React.ReactNode
  action?: React.ReactNode
}

function Section({
  title,
  action,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn("mb-8", className)} {...props}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title ? (
            <h2 className="text-heading text-mk-ink">{title}</h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      <div className="space-y-3">{children}</div>
    </section>
  )
}

type StackProps = React.ComponentProps<"div"> & {
  gap?: "tight" | "default"
}

function Stack({ gap = "default", className, ...props }: StackProps) {
  return (
    <div
      className={cn(
        gap === "tight" ? "space-y-1.5" : "space-y-3",
        className
      )}
      {...props}
    />
  )
}

export { Page, PageHeader, Section, Stack }
