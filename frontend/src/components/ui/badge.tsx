import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export function Badge({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600", className)} {...props} />
}
