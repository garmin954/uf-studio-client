import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Loader } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-[4rem] w-fit text-[1.18rem] uf-font-regular px-[3rem] transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input  hover:bg-background hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-default px-4 py-2 ",
        sm: "h-[3rem] rounded-md px-3",
        lg: "h-[4rem] rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ExpandProps = {
  loading?: boolean;
};

function useSpinnerVisibility(
  loading?: boolean,
  delayMs = 150,
  minVisibleMs = 300
) {
  const [visible, setVisible] = React.useState(false);
  const shownAtRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    let delayTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    if (loading) {
      // Only schedule show if not already visible
      if (!visible) {
        delayTimer = setTimeout(() => {
          shownAtRef.current = Date.now();
          setVisible(true);
        }, delayMs);
      }
    } else {
      // Cancel any pending show
      if (delayTimer) clearTimeout(delayTimer);

      // If currently visible, keep it for at least minVisibleMs
      if (visible) {
        const elapsed = shownAtRef.current
          ? Date.now() - shownAtRef.current
          : 0;
        const remain = Math.max(minVisibleMs - elapsed, 0);
        hideTimer = setTimeout(() => {
          setVisible(false);
          shownAtRef.current = null;
        }, remain);
      } else {
        setVisible(false);
      }
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [loading, visible, delayMs, minVisibleMs]);

  return visible;
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  ExpandProps,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const showSpinner = useSpinnerVisibility(!!loading, 150, 300);
    return (
      <Comp
        className={cn(
          "relative overflow-hidden",
          buttonVariants({ variant, size, className }),
        )}
        ref={ref}
        {...props}
        onClick={(e) => !loading && props?.onClick?.(e)}
        disabled={loading || props.disabled}
      >
        {showSpinner && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
            )}
            style={{
              background: "rgba(255, 255, 255, 0.7)",
            }}
            aria-hidden={!showSpinner}
          >
            <div className="scale-150">
              <Loader className="animate-spin duration-1000 text-black" />
            </div>
          </div>
        )}
        {props.children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
