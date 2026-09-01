# Print day — crypto tokens

**Printer:** Bambu Lab P2S · **Nozzle:** 0.4 mm · **Material:** PLA  
**Default size:** 28 mm diameter × 14 mm height × 1 mm white rim  
**Mass:** ~8 g each if solid through-colour

Print on the face. No supports. No brim unless the first layer lifts.

---

## 1. Decide through-colour vs face inlay *before* you slice

| Mode | Looks | Time / waste | Use when |
| --- | --- | --- | --- |
| **Face inlay** (recommended first) | Logo on the top face. Body, rim, and mark are white. Colour sits in the top ~1.6 mm. | Fast. Few AMS swaps. Little purge. | First set, gifts, testing colours. |
| **Through-colour** (current default) | Both faces read. Colour goes all the way through. | Slow. Every layer is 2–3 colours → purge tower all print. | You want a real two-sided token. |

Tomorrow: slice **one Bitcoin in face inlay** as the test. If the first layer and colours look right, print the set in face inlay. Do through-colour as a second pass once you like the marks.

In PrintForge: Colour fill → **Face inlay only**, then **AMS STLs**.

---

## 2. Filaments to have on the desk

White is in every coin. Load it in **AMS slot 1** and leave it there.

| Slot idea | Filament | Coins that need it | Close Bambu / PLA match |
| --- | --- | --- | --- |
| 1 | True white `#FFFFFF` | All five | PLA Basic White |
| 2 | BTC orange `#F7931A` | Bitcoin | PLA Basic Orange (or Gold + a drop of red if you have it) |
| 3 | LTC blue `#345D9D` | Litecoin | PLA Basic Blue, slightly dark |
| 4 | DOGE gold `#C2A633` | Dogecoin | PLA Basic Gold / Yellow-Gold |

Then swap 2–4 for:

| Filament | Hex | Coin |
| --- | --- | --- |
| XMR orange | `#FF6600` | Monero |
| XMR grey | `#4C4C4C` | Monero |
| DGB navy | `#002352` | DigiByte |
| DGB blue | `#0066CC` | DigiByte |

DigiByte is 3 colours (navy + blue + white). Monero is 3 (orange + grey + white). The others are 2.

P2S AMS holds 4. Do **one coin at a time**. Do not put all five on one plate.

---

## 3. Get the STLs

1. Open PrintForge. Crypto catalog → the coin.
2. Preset **Token 28 mm** (diameter 28, height 14, rim 1).
3. Colour fill → **Face inlay only** for the first set.
4. **AMS STLs** → zip of aligned parts.
5. Unzip. Names match the colours (`orange.stl`, `white.stl`, …).

Repo with the studio: https://github.com/ForAllGitter/printforge

---

## 4. Bambu Studio

1. File → New project. Printer **Bambu Lab P2S 0.4 nozzle**. Process **0.20 mm Standard**.
2. Import the **white** STL first (it is the body + rim + mark).
3. Right-click that part on the plate → **Add part** → import the coloured STL(s). They should land on the same origin. Do **not** auto-arrange.
4. Objects panel: assign filaments by colour name.
5. Check the colour painting / preview: white ring around the edge, mark in the centre, brand colour in the field.
6. Settings:
   - Layer height **0.20 mm**
   - Walls **3**
   - Infill **15% gyroid**
   - Supports **off**
   - Brim **off** (on if the rim lifts)
   - Plate: **textured PEI** for a minted face, **smooth PEI** for a shiny face
   - First layer 0.20 mm, bed 35 °C PLA, nozzle 220 °C (or your PLA profile)
7. Flushing: default is fine for face inlay. For through-colour, expect a large purge tower — that is normal.
8. Slice. Face-inlay 28×14 mm is roughly **25–40 min** and **~8–10 g** including purge. Through-colour can run **hours** with a tall purge tower.

---

## 5. Print order

1. **Bitcoin face inlay** — test first layer, rim, and ₿.
2. If good: Litecoin, Dogecoin (same white, swap the accent).
3. DigiByte (load navy + blue).
4. Monero (load XMR orange + grey).
5. Optional: one Bitcoin **through-colour** if you want a two-sided keeper.

Let the plate cool before popping them off so the rim does not ding.

---

## 6. What “good” looks like

- Rim is a clean 1 mm white ring, not smeared into the field.
- Mark is readable at arm’s length.
- No elephant foot burying the rim — drop first-layer expansion a notch if the ring looks fat.
- Colours meet at the mark without a gap (the parts were built overlapping on purpose).

If the mark is shallow or missing, you exported through-colour parts as separate plates, or **Add part** was skipped. Re-import as parts of one object.

---

## 7. If something is wrong

- **Only a white disc:** coloured part not added, or assigned white.
- **Colours shifted:** you used Arrange after adding parts. Undo, re-import, do not arrange.
- **Rim missing:** rim slider was 0. Set rim to 1 mm and re-export.
- **Too big for a test:** Desk 50 mm preset is a coaster; Token 28 mm is the pocket coin.

Tomorrow we can tweak a mark, change a hex, or add a split kit. Bring a photo of the first Bitcoin if the ₿ or rim needs a pass.
