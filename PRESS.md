# Print day — D3DD briquette press

**Printer:** Bambu Lab P2S · **Nozzle:** 0.4 mm · **Material:** PETG (wet pulp) or PLA  
**Scale:** 114% (built into these STLs)  
**Supports:** none · **Bed:** textured PEI, 0.20 mm layers, 3 walls, 25% gyroid

Print every part **as it sits in the STL** (already on the bed).

---

## Files

| File | What | Orient | Est. |
| --- | --- | --- | --- |
| `D3DD_handle.stl` | Press handle, T-bar on top, D3DD recessed | As exported | ~80 mm tall |
| `D3DD_sleeve.stl` | One-piece sleeve, slit + lugs on the clip side | Standing | ~66 mm |
| `D3DD_clip.stl` | Closed box that slides onto the two lugs | Opening to the side | ~47 mm |
| `D3DD_hex-plate.stl` | Water tray, 4 pads + lips, D3DD in the well | Floor on the bed | 150 × 173 × 16 mm |
| `D3DD_sieve.stl` | Tight water sieve | Floor on the bed | Ø93 × 11 mm |

Sleeve: **standing**. One piece except a 0.55 mm slit at the lugs. Clip: no supports. Sieve holes are Ø~3.8 mm — they print without supports at 0.20 mm.

---

## Settings

- Layer 0.20 mm · 3 walls · 25% gyroid · 4 top / 4 bottom
- First layer 0.20 mm, 50 mm/s, brim off unless PETG lifts
- PETG: 250 / 80 °C. PLA: 220 / 60 °C
- Sleeve + sieve: 15% infill is enough. Handle: 25–40% so the plunger does not crush
- Clip: 100% infill or 5 walls — it takes the hoop load

---

## Assemble

1. Drop the **sieve** onto the four pads of the **hex plate**.
2. Drop the **sleeve** onto the sieve. Outer foot sits on the pads; the small lips lock it.
3. Slide the **clip** onto the two lugs to close the slit.
4. Fill with cardboard pulp (or coffee grounds). Press with the **handle**.
5. Water runs through the sieve into the tray. Unclip, split the sleeve, pop the briquette out.

Clearance: sieve is 0.25 mm under the sleeve bore. If it is tight on PETG, scrape the rim once; if it is loose, print the sieve at 101%.

---

## Plate order

Print **sieve + clip** first (small, fast fit check). Then sleeve halves. Then plate. Handle last.
