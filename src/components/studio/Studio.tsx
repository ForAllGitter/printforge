import {
  Box,
  Cable,
  Circle,
  Coins,
  Download,
  Grid3x3,
  Hexagon,
  Layers,
  LayoutGrid,
  Paperclip,
  Pin,
  Printer,
  RectangleHorizontal,
  RotateCcw,
  Save,
  Smartphone,
  Square,
  Trash2,
  Wrench,
} from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Viewport } from "@/components/studio/Viewport";
import { Toaster } from "@/components/toaster";

import { parseBrief } from "@/lib/print/brief";
import { DESIGNS, getDesign } from "@/lib/print/catalog";
import { FILAMENTS } from "@/lib/print/p2s";
import { downloadColorPack, downloadStl, stlName } from "@/lib/print/stl";
import { useStudio } from "@/lib/print/store";
import { suggestDesign } from "@/lib/print/suggest";
import { fmt } from "@/lib/print/p2s";
import { ModelProvider, useModel } from "@/components/studio/model-context";

import type { ParamDef, Values } from "@/lib/print/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "monero-coin": Coins,
  "bitcoin-coin": Coins,
  "litecoin-coin": Coins,
  "dogecoin-coin": Coins,
  "digibyte-coin": Coins,
  "snap-box": Box,
  "divider-bin": LayoutGrid,
  "stacking-bin": Layers,
  "phone-stand": Smartphone,
  "wall-hook": Pin,
  "cable-clip": Cable,
  "l-bracket": Wrench,
  "hex-coaster": Hexagon,
  nameplate: RectangleHorizontal,
  "bag-clip": Paperclip,
  "tool-block": Grid3x3,
  "purge-bin": Trash2,
  "peg-hook": Pin,
  washer: Circle,
  "cable-comb": Square,
};

type Tab = "models" | "dial" | "print" | "ask";

const PROMPTS = [
  "Bitcoin coin 28 x 14 mm",
  "Dogecoin 28 mm with white rim",
  "Litecoin token 28 x 14",
  "DigiByte coin 28 mm",
];

export function Studio() {
  return (
    <ModelProvider>
      <StudioShell />
    </ModelProvider>
  );
}

function StudioShell() {
  const built = useModel();

  const designId = useStudio((s) => s.designId);
  const values = useStudio((s) => s.values);
  const [tab, setTab] = useState<Tab>("dial");

  const size = built.stats?.size ?? [40, 20, 40];

  function handleDownload() {
    if (!built.parts.length || !built.stats) {
      toast.error(built.error ?? "Nothing to export yet");
      return;
    }
    const base = stlName(built.design.id, built.stats.size);
    if (built.parts.length > 1) {
      downloadColorPack(built.parts, base);
      toast.success("AMS pack ready — orange, white, grey STLs");
    } else {
      downloadStl(built.parts[0]!.geom, `${base}.stl`);
      toast.success("STL ready — drop it into Bambu Studio");
    }
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background text-foreground">
      <Toaster />
      <Header onDownload={handleDownload} disabled={!built.parts.length} multi={built.parts.length > 1} />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden min-h-0 w-72 shrink-0 flex-col border-r border-border lg:flex">
          <CatalogPanel />
        </aside>
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <Viewport
              parts={built.parts.map((p) => ({ geometry: p.geometry, color: p.color }))}
              size={[size[0], size[2], size[1]]}
            />
          </div>
          {built.parts.length > 1 ? (
            <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
              {built.parts.map((p) => (
                <span
                  key={p.name}
                  className="pointer-events-none inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-2.5 py-1 text-[11px] text-muted-foreground backdrop-blur-sm"
                >
                  <span
                    className="size-2.5 rounded-full border border-border"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                </span>
              ))}
            </div>
          ) : null}
          <DimBar
            size={built.stats?.size}
            grams={built.stats?.gramsPla}
            error={built.error}
          />
        </main>
        <aside className="hidden min-h-0 w-80 shrink-0 flex-col border-l border-border lg:flex">
          <div className="min-h-0 flex-1 overflow-hidden">
            <ParamPanel designId={designId} values={values} />
          </div>
          <PrintPanel />
        </aside>
      </div>
      <MobileDock tab={tab} onTab={setTab} />
      <div className="border-t border-border lg:hidden">
        <div className="max-h-[42vh] overflow-y-auto">
          {tab === "models" ? <CatalogPanel compact /> : null}
          {tab === "dial" ? <ParamPanel designId={designId} values={values} /> : null}
          {tab === "print" ? <PrintPanel /> : null}
          {tab === "ask" ? <AskPanel /> : null}
        </div>
      </div>
    </div>
  );
}

function Header({
  onDownload,
  disabled,
  multi,
}: {
  onDownload: () => void;
  disabled: boolean;
  multi: boolean;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
      <div className="min-w-0">
        <p className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground">
          PRINTFORGE
        </p>
        <p className="truncate text-sm text-foreground">P2S print partner</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="hidden sm:inline-flex">
          256 × 256 × 256
        </Badge>
        <Button onClick={onDownload} disabled={disabled} className="h-11 px-4">
          <Download />
          {multi ? "AMS STLs" : "STL"}
        </Button>
      </div>
    </header>
  );
}

function CatalogPanel({ compact = false }: { compact?: boolean }) {
  const designId = useStudio((s) => s.designId);
  const setDesign = useStudio((s) => s.setDesign);
  const library = useStudio((s) => s.library);
  const loadSaved = useStudio((s) => s.loadSaved);
  const removeSaved = useStudio((s) => s.removeSaved);
  const cats = useMemo(() => {
    const map = new Map<string, typeof DESIGNS>();
    for (const d of DESIGNS) {
      const list = map.get(d.category) ?? [];
      list.push(d);
      map.set(d.category, list);
    }
    return [...map.entries()];
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {cats.map(([cat, list]) => (
          <div key={cat} className="mb-4">
            <p className="mb-2 px-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
              {cat.toUpperCase()}
            </p>
            <div className={cn("grid gap-1.5", compact ? "grid-cols-1" : "grid-cols-1")}>
              {list.map((d) => {
                const Icon = ICONS[d.id] ?? Box;
                const active = d.id === designId;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDesign(d.id)}
                    className={cn(
                      "flex min-h-11 items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground hover:bg-accent",
                    )}
                  >
                    <Icon className="mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{d.name}</span>
                      {compact ? null : (
                        <span
                          className={cn(
                            "mt-0.5 block text-xs leading-snug",
                            active ? "text-primary-foreground/70" : "text-muted-foreground",
                          )}
                        >
                          {d.blurb}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {library.length ? (
          <div className="mb-4">
            <p className="mb-2 px-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
              SAVED
            </p>
            <ul className="space-y-1.5">
              {library.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg bg-card px-2 py-1"
                >
                  <button
                    type="button"
                    className="min-h-11 flex-1 truncate px-1 text-left text-sm"
                    onClick={() => loadSaved(item.id)}
                  >
                    {item.name}
                  </button>
                  <button
                    type="button"
                    className="grid size-11 place-items-center text-muted-foreground hover:text-destructive"
                    onClick={() => removeSaved(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="hidden border-t border-border lg:block">
        <AskPanel />
      </div>
    </div>
  );
}

function ParamPanel({
  designId,
  values,
}: {
  designId: string;
  values: Values;
}) {
  const design = getDesign(designId);
  const setValue = useStudio((s) => s.setValue);
  const setDesign = useStudio((s) => s.setDesign);
  const saveCurrent = useStudio((s) => s.saveCurrent);
  const [saveName, setSaveName] = useState("");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <div>
          <h2 className="text-base font-medium">{design.name}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {design.blurb}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          onClick={() => setDesign(design.id)}
          aria-label="Reset parameters"
        >
          <RotateCcw />
        </Button>
      </div>
      {design.category === "Crypto" ? (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          <PresetChip
            label="Token 28 mm"
            onClick={() => {
              setValue("diameter", 28);
              setValue("height", 14);
              setValue("rim", 1);
              setValue("wall", 0);
              setValue("fill", "through");
              setValue("fitP2s", false);
            }}
          />
          <PresetChip
            label="Desk 50 mm"
            onClick={() => {
              setValue("diameter", 50);
              setValue("height", 6);
              setValue("wall", 0);
              setValue("fill", "face");
              setValue("fitP2s", false);
              setValue("rim", 1.5);
            }}
          />
          <PresetChip
            label="Fit P2S"
            onClick={() => {
              setValue("fitP2s", true);
            }}
          />
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-4">
          {design.params.map((p) => (
            <ParamRow
              key={p.key}
              param={p}
              value={values[p.key] ?? p.default}
              onChange={(v) => setValue(p.key, v)}
            />
          ))}
        </div>
        <Separator className="my-4" />
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveCurrent(saveName);
            setSaveName("");
            toast.success("Saved to this browser");
          }}
        >
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Save as…"
            className="h-11"
          />
          <Button type="submit" variant="secondary" size="icon" aria-label="Save design">
            <Save />
          </Button>
        </form>
      </div>
    </div>
  );
}

function PresetChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {label}
    </button>
  );
}

function ParamRow({
  param,
  value,
  onChange,
}: {
  param: ParamDef;
  value: Values[string];
  onChange: (v: Values[string]) => void;
}) {
  if (param.kind === "bool") {
    return (
      <div className="flex h-11 items-center justify-between gap-3">
        <Label htmlFor={param.key}>{param.label}</Label>
        <Switch
          id={param.key}
          checked={Boolean(value)}
          onCheckedChange={onChange}
        />
      </div>
    );
  }
  if (param.kind === "text") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={param.key}>{param.label}</Label>
        <Input
          id={param.key}
          value={String(value)}
          maxLength={param.maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }
  if (param.kind === "select") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={param.key}>{param.label}</Label>
        <select
          id={param.key}
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-[var(--shadow-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
        >
          {param.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (param.kind !== "number") return null;
  const raw = typeof value === "number" ? value : param.default;
  const digits = param.step < 0.1 ? 2 : param.step < 1 ? 1 : 0;
  const n = Number(raw.toFixed(digits));

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={param.key}>{param.label}</Label>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {Number.isInteger(param.step) ? n : n.toFixed(param.step < 0.1 ? 2 : 1)}
          {param.unit ? ` ${param.unit}` : ""}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Slider
          className="flex-1"
          value={n}
          min={param.min}
          max={param.max}
          step={param.step}
          onValueChange={onChange}
        />
        <Input
          id={param.key}
          type="number"
          className="h-11 w-[4.6rem] px-2 text-right font-mono text-xs tabular-nums"
          min={param.min}
          max={param.max}
          step={param.step}
          value={n}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
        />
      </div>
    </div>
  );
}

function PrintPanel() {
  const built = useModel();

  const filamentId = useStudio((s) => s.filamentId);
  const setFilament = useStudio((s) => s.setFilament);
  const values = useStudio((s) => s.values);
  if (!built.design) return null;
  const card = built.design.advice(values);
  const stats = built.stats;
  const colored = built.parts.length > 1;

  return (
    <div className="flex min-h-0 max-h-[46%] flex-col overflow-y-auto border-t border-border px-4 py-4">
      <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
        P2S PROFILE
      </p>
      {stats ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <Stat label="Size" value={`${fmt(stats.size[0])} × ${fmt(stats.size[1])} × ${fmt(stats.size[2])}`} />
          <Stat label="PLA" value={`~${stats.gramsPla.toFixed(1)} g`} />
          <Stat label="Time" value={`~${Math.max(1, Math.round(stats.minutes))} min`} />
          <Stat label="Volume" value={`${(stats.volume / 1000).toFixed(1)} cm³`} />
        </dl>
      ) : (
        <p className="mt-3 text-sm text-destructive">{built.error}</p>
      )}
      {stats ? (
        <ul className="mt-3 space-y-1.5">
          {stats.checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2 text-xs">
              <Badge variant={c.ok ? "ok" : "warn"}>{c.ok ? "OK" : "Check"}</Badge>
              <span className="text-muted-foreground">{c.detail}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <dl className="mt-4 space-y-1.5 text-sm">
        <Row k="Layer" v={card.layer} />
        <Row k="Walls" v={card.walls} />
        <Row k="Infill" v={card.infill} />
        <Row k="Supports" v={card.supports} />
        <Row k="Material" v={card.material} />
      </dl>
      <ul className="mt-3 space-y-1">
        {card.notes.map((note) => (
          <li key={note} className="text-xs leading-relaxed text-muted-foreground">
            {note}
          </li>
        ))}
      </ul>
      {colored ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">AMS filaments</p>
          <div className="flex flex-wrap gap-2">
            {built.parts.map((p) => (
              <span
                key={p.name}
                className="inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-[11px]"
              >
                <span
                  className="size-3 rounded-full border border-border"
                  style={{ backgroundColor: p.color }}
                />
                {p.name} {p.color}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <>
          <p className="mt-4 text-xs text-muted-foreground">Filament preview</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {FILAMENTS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-label={f.name}
                onClick={() => setFilament(f.id)}
                className={cn(
                  "size-8 rounded-full border transition-transform duration-150",
                  filamentId === f.id ? "scale-110 border-primary" : "border-border",
                )}
                style={{ backgroundColor: f.color }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-mono text-xs tabular-nums">{v}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xs tabular-nums">{value}</dd>
    </div>
  );
}

function AskPanel() {
  const apply = useStudio((s) => s.apply);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(
    "Describe an object in millimetres. I will map it onto a printable model.",
  );

  async function run(text: string) {
    const q = text.trim();
    if (!q) return;
    setBusy(true);
    const local = parseBrief(q);
    try {
      const ai = await suggestDesign({ data: { prompt: q } });
      if (ai.ok) {
        apply(ai.designId, ai.values);
        setNote(ai.note);
      } else {
        apply(local.designId, local.values);
        setNote(local.note);
      }
    } catch {
      apply(local.designId, local.values);
      setNote(local.note);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-3">
      <p className="mb-2 font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
        BRIEF
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(prompt);
        }}
        className="space-y-2"
      >
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A 120 × 80 × 40 box with lid, 2 mm walls"
          rows={3}
        />
        <Button type="submit" className="h-11 w-full" disabled={busy}>
          {busy ? "Mapping…" : "Build from brief"}
        </Button>
      </form>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{note}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => {
              setPrompt(p);
              void run(p);
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function DimBar({
  size,
  grams,
  error,
}: {
  size?: [number, number, number];
  grams?: number;
  error: string | null;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
      <div className="pointer-events-auto rounded-full border border-border bg-card/90 px-3 py-1.5 text-[11px] font-mono tabular-nums text-muted-foreground backdrop-blur-sm">
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : size ? (
          <span>
            {fmt(size[0])} × {fmt(size[1])} × {fmt(size[2])} mm
            {grams !== undefined ? `  ·  ${grams.toFixed(1)} g` : ""}
          </span>
        ) : (
          "Building…"
        )}
      </div>
    </div>
  );
}

function MobileDock({
  tab,
  onTab,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
}) {
  const items: { id: Tab; label: string; icon: ComponentType<{ className?: string }> }[] = [
    { id: "models", label: "Models", icon: Box },
    { id: "dial", label: "Dial", icon: Wrench },
    { id: "print", label: "Print", icon: Printer },
    { id: "ask", label: "Brief", icon: RectangleHorizontal },
  ];
  return (
    <nav className="grid grid-cols-4 border-t border-border lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = tab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTab(item.id)}
            className={cn(
              "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px]",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
