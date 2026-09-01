import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export function Slider({
  className,
  value,
  onValueChange,
  min,
  max,
  step,
  disabled,
}: {
  className?: string;
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
}) {
  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex h-8 w-full touch-none items-center select-none",
        className,
      )}
      value={[value]}
      onValueChange={(v) => onValueChange(v[0] ?? value)}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-4 rounded-full bg-primary shadow-[var(--shadow-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 disabled:pointer-events-none" />
    </SliderPrimitive.Root>
  );
}
