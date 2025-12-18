import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#14B8A6]/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97] hover:scale-[1.02] select-none",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-[#14B8A6] via-[#0D9488] to-teal-700 text-white shadow-lg shadow-[#14B8A6]/25 hover:shadow-xl hover:shadow-[#14B8A6]/35 border border-transparent relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity",
        destructive:
          "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/35 hover:from-red-600 hover:to-red-700",
        outline:
          "border-2 border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:border-[#14B8A6] hover:bg-[#14B8A6]/5 dark:hover:bg-[#14B8A6]/10 hover:text-[#14B8A6] dark:hover:border-[#14B8A6] text-gray-700 dark:text-gray-200 shadow-sm",
        secondary:
          "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-white hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700 shadow-sm",
        ghost:
          "hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
        link:
          "text-[#14B8A6] underline-offset-4 hover:underline hover:text-[#0D9488]",
        success:
          "bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/35 hover:from-green-600 hover:to-green-700",
        warning:
          "bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-lg shadow-yellow-500/25 hover:shadow-xl hover:shadow-yellow-500/35 hover:from-yellow-600 hover:to-yellow-700",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-14 rounded-2xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
        xs: "h-7 rounded-md px-2 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };