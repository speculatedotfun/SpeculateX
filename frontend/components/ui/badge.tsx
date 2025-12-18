import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 uppercase tracking-wide select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-[#14B8A6] to-teal-600 text-white shadow-sm shadow-[#14B8A6]/20 hover:shadow-md hover:shadow-[#14B8A6]/30 hover:scale-105",
        secondary:
          "border-transparent bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-600 shadow-sm hover:scale-105",
        destructive:
          "border-transparent bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm shadow-red-500/20 hover:shadow-md hover:shadow-red-500/30 hover:scale-105",
        outline:
          "text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105",
        success:
          "border-transparent bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm shadow-green-500/20 hover:shadow-md hover:shadow-green-500/30 hover:scale-105",
        warning:
          "border-transparent bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-sm shadow-yellow-500/20 hover:shadow-md hover:shadow-yellow-500/30 hover:scale-105",
        info:
          "border-transparent bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/30 hover:scale-105",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };