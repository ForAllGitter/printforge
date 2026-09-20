# PrintForge

Parametric CAD studio for the **Bambu Lab P2S**. Dial a model, preview it on a 256 mm bed, and download print-ready STLs — including AMS colour packs.

Built as a P2S print partner: crypto tokens, storage, desk, and everyday parts. Defaults are chosen for a 0.4 mm nozzle, no supports, and PLA.

## Crypto tokens

Five coins, same parametric shell: **28 mm diameter × 14 mm height × 1 mm white rim**. Through-colour so both faces read. Diameter, height, and rim stay live sliders.

| Coin | Field | Mark | Rim |
| --- | --- | --- | --- |
| Bitcoin | `#F7931A` orange | White ₿ | White 1 mm |
| Litecoin | `#345D9D` blue | White Ł | White 1 mm |
| Dogecoin | `#C2A633` gold | White D | White 1 mm |
| DigiByte | `#002352` navy + `#0066CC` ring | White D | White 1 mm |
| Monero | `#FF6600` orange / `#4C4C4C` grey | True white M | White 1 mm |

<p>
  <img src="docs/coins/coin-btc.png" alt="Bitcoin coin" width="19%" />
  <img src="docs/coins/coin-ltc.png" alt="Litecoin coin" width="19%" />
  <img src="docs/coins/coin-doge.png" alt="Dogecoin coin" width="19%" />
  <img src="docs/coins/coin-dgb.png" alt="DigiByte coin" width="19%" />
  <img src="docs/coins/coin-xmr.png" alt="Monero coin" width="19%" />
</p>

Each token is ~8 g of PLA. Prints on its face, 0.20 mm layers, 3 walls, no supports.

### AMS in Bambu Studio

1. Click **AMS STLs** — one file per colour, already aligned.
2. Import the first STL, right-click → **Add part** → remaining files.
3. Assign filaments to match the colour names.

Presets on every crypto model: **Token 28 mm**, **Desk 50 mm**, **Fit P2S**.

## Catalog

Crypto coins plus snap-lid boxes, divider bins, phone stands, cable clips, nameplates, washers, and other P2S-sized parts. Describe a part in the brief box to jump to a matching model.

## D3DD briquette press

Working cardboard-pulp / coffee-grounds press, 14% larger than the original Outin kit.

1. **Handle** — T-bar on top, blended into the shaft, D3DD recessed 1 mm. No hang hole.
2. **Sleeve** — two loose halves + closed clip. Dense Ø3.5 mm drain holes.
3. **Hex plate** — closed water tray, four rest pads with locating lips, D3DD in the well.
4. **Drain sieve** — tight in the sleeve bore, perforated floor.

Print-ready STLs: [`public/prints/d3dd-press/`](public/prints/d3dd-press/). P2S settings: [PRESS.md](PRESS.md).

## D3DD cardboard press

Rectangular pulp press, 140 × 70 mm inside.

1. **Sleeve** — through-tube, 5 mm walls, side drain holes.
2. **Stamp** — I-beam, D3DD recessed 1 mm, slides in the sleeve.
3. **Sieve** — hex floor, sleeve drops in from above.
4. **Tray** — closed well with gutter for side-hole water, four L-lips.

Print-ready STLs: [`public/prints/d3dd-cardboard/`](public/prints/d3dd-cardboard/). P2S settings: [CARDBOARD.md](CARDBOARD.md).

## Run locally

```bash
npm install
npm run dev
```

Then open the app in a browser. `npm run build` produces a production bundle.

Requires Node 22+.

## Stack

- TanStack Start + Vite
- React Three Fiber for the live P2S bed preview
- JSCAD constructive solid geometry
- Binary STL export with colour packs
- Zustand for studio state

## Print day

P2S settings: coins in [PRINT.md](PRINT.md), round press in [PRESS.md](PRESS.md), cardboard press in [CARDBOARD.md](CARDBOARD.md).

## License

MIT. Crypto marks belong to their respective projects; this repo only generates printable geometry from public brand colours and symbols.
