import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-gray-200/40 dark:bg-gray-800/40 backdrop-blur-sm",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/40 dark:before:via-[#14B8A6]/10 before:to-transparent",
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