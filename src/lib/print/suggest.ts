import { createServerFn } from "@tanstack/react-start";
import type { Values } from "./types";

export type SuggestOk = {
  ok: true;
  designId: string;
  values: Values;
  note: string;
};

export type SuggestResult =
  | SuggestOk
  | { ok: false; error: string };

export const suggestDesign = createServerFn({ method: "POST" })
  .validator((input: { prompt: string }) => ({
    prompt: String(input.prompt ?? "").slice(0, 500),
  }))
  .handler(async ({ data }): Promise<SuggestResult> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: "AI is not available" };

    const { catalogSchema } = await import("./catalog");
    const schema = catalogSchema();
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 700,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You map a 3D-print request onto one parametric model. Reply JSON only: {designId, values, note}. designId must be one of the catalog ids. values only uses that model's keys and stays inside min/max. Units are millimetres. note is one short sentence of print advice for a Bambu Lab P2S. Catalog: " +
              JSON.stringify(schema),
          },
          { role: "user", content: data.prompt },
        ],
      }),
    });

    if (!res.ok) return { ok: false, error: `xAI API error ${res.status}` };

    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = body.choices?.[0]?.message?.content ?? "";
    try {
      const parsed = JSON.parse(raw) as {
        designId?: string;
        values?: Values;
        note?: string;
      };
      if (!parsed.designId || !parsed.values) {
        return { ok: false, error: "Could not map that request" };
      }
      return {
        ok: true,
        designId: parsed.designId,
        values: parsed.values,
        note: parsed.note ?? "Dial in the millimetres, then download the STL.",
      };
    } catch {
      return { ok: false, error: "Could not parse the design map" };
    }
  });
