import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-gray-200/50 dark:bg-gray-700/50", className)}
      {...props}
    />
  )
}
export { Skeleton }