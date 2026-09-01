import { createFileRoute } from "@tanstack/react-router";
import { Studio } from "@/components/studio/Studio";
import { suggestDesign } from "@/lib/print/suggest";

export const Route = createFileRoute("/")({ component: Home });

void suggestDesign;

function Home() {
  return <Studio />;
}
