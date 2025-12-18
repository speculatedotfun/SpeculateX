import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-gray-200/60 dark:bg-gray-700/60",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/60 dark:before:via-white/10 before:to-transparent",
        className
      )}
      style={{
        backgroundSize: "200% 100%",
      }}
      role="status"
      aria-label="Loading..."
      {...props}
    />
  )
}

export { Skeleton }