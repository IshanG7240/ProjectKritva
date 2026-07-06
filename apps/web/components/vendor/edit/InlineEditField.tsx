"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface InlineEditFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  inputClassName?: string;
  as?: "h1" | "p" | "span";
}

export function InlineEditField({
  value,
  onChange,
  placeholder = "Click to edit",
  multiline = false,
  rows = 4,
  className,
  inputClassName,
  as = "span",
}: InlineEditFieldProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const sharedClass = cn(
    "w-full rounded-md border border-transparent bg-transparent transition-colors",
    "hover:border-mk-border hover:bg-white/60 focus:border-mk-navy focus:bg-white focus:outline-none",
    inputClassName,
  );

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          className={cn(sharedClass, "resize-y py-2 px-2", className)}
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setEditing(false);
        }}
        className={cn(sharedClass, "px-2 py-1", className)}
      />
    );
  }

  const Tag = as;
  const display = value.trim() || placeholder;

  return (
    <Tag
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      }}
      className={cn(
        "cursor-text rounded-md border border-dashed border-transparent px-1 -mx-1",
        "hover:border-mk-border/80 hover:bg-white/50",
        !value.trim() && "text-mk-muted italic",
        className,
      )}
    >
      {display}
    </Tag>
  );
}
