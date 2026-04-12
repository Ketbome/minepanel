"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-gray-600/70 bg-gray-900/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.45)] transition-all outline-none data-[state=checked]:border-emerald-500/70 data-[state=checked]:bg-emerald-600/80 data-[state=checked]:shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_0_18px_rgba(16,185,129,0.28)] data-[state=unchecked]:bg-gray-800/90 focus-visible:border-emerald-400/70 focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-white ring-0 shadow-[0_2px_8px_rgba(15,23,42,0.35)] transition-transform data-[state=checked]:translate-x-[20px] data-[state=checked]:bg-emerald-50 data-[state=unchecked]:translate-x-[2px]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
