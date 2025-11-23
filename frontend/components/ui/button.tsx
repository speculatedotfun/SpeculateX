import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-[#14B8A6] text-white shadow-lg shadow-[#14B8A6]/20 hover:bg-[#0D9488] hover:shadow-[#14B8A6]/30",
        destructive:
          "bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600",
        outline:
          "border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:border-[#14B8A6] hover:text-[#14B8A6] hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white",
        secondary:
          "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm hover:bg-gray-200 dark:hover:bg-gray-600",
        ghost: "hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
        link: "text-[#14B8A6] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-2xl px-8 text-base",
        icon: "h-10 w-10",
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

