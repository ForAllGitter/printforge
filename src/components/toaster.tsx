import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      toastOptions={{
        className: "bg-card text-foreground border border-border font-sans",
      }}
    />
  );
}
