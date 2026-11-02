# EMERALD-UI Feature Log

Planned and completed feature work on `Kenman-22-patch-1`. Line numbers refer to the commit in
each entry's "Based on commit" field and shift as edits land. If an implementation departs from
its plan, the entry is updated to say what changed.

---

## 1. Region selection from protein architecture

**Status:** Implemented and tested, uncommitted. Awaiting user review.
**Based on commit:** 350fe4d

### Goal

Add an interactive panel below Sequence A and Sequence B that shows the UniProt protein
architecture. The user can pick the residue range to align by clicking a domain or linker, by
dragging a sliding window, or by typing start and end residues. With nothing selected,
"Run EMERALD-UI" aligns the whole proteins, as it does today.

### Design

- `regionA` and `regionB` are stored in the sequence context as 1-based inclusive
  `{ start, end }`, or `null` for the whole protein.
- The panel derives its accession from the descriptor with `extractUniProtId`, the same source
  `App.tsx` uses, because the stored `structureA/B.uniprotId` can be stale (see `App.tsx:59-62`).
- The two regions are independent, and either can stay as the whole protein.
- A selection is one continuous range. Shift-click extends it across several features. Joining
  separate ranges is out of scope.
- The panel is full width, with A and B side by side like the Sequence A and B input columns
  (user request, replacing the earlier stacked layout). They stack on narrow screens. Each schematic
  uses its own scale and sits above that sequence's start and end inputs.
- It appears for every sequence. With no UniProt accession it shows a plain line, plus the
  sliding window and number inputs.
- The sliding window is a custom pointer and keyboard control, so no dependency is added. Dragging
  the middle moves the window at a fixed width, and dragging an edge resizes it. A native range
  input cannot move a fixed-width window.
- Changing a region clears existing results, the same way changing parameters does
  (`SequenceContext.tsx:350-371`), so a plot never describes a different range than the panel.

### Architecture display

UniProt features overlap, so they cannot sit on one flat line. Real data from UniProt:

| Protein | Length | Features |
|---|---|---|
| HoxA1 (P49639) | 335 | Homeobox 229-288; Disordered 61-80 and 281-335; Interaction with OGT 75-203; hexapeptide 204-209 |
| HoxA2 (O43364) | 376 | Homeobox 143-202; Disordered 42-93, 198-229, 257-279; hexapeptide 94-99 |
| Rhodopsin (P08100) | 348 | Region 330-348; Motif 134-136; no Domain features |

Agreed layout: one simple line, for choosing regions only.

- The line shows domain-level features only: Domain, DNA binding, Zinc finger, Repeat.
- Region, Motif and Coiled coil are left out of the schematic.
- Linker: anything between domains, clickable on the line. The stretches before the first domain
  and after the last domain are clickable in the same way.
- If domain-level features overlap, the shorter one is drawn on top so both stay clickable.
- A protein with no domain-level features, such as rhodopsin, shows a plain line. Selection then
  uses the sliding window or number inputs.
- The Domain strip on the alignment graph keeps showing its current feature types.

### Coordinates

The plot, zoom, safety windows and path selection all assume coordinates `0..length` of the
strings they receive, so the alignment itself stays region-relative. Three conversions are added
at the edges:

| Consumer | Coordinates | Conversion |
|---|---|---|
| Plot, zoom, path selection, alignment viewer | Region-relative | None |
| pLDDT strip | Region-relative | Slice with `plddt.slice(start - 1, end)` |
| Domain strip | Region-relative | Shift by `start - 1`, clip to the region, keep original numbers for the tooltip |
| Axis numbers, safety window labels, panel coordinates | Full-protein | Add display offset |
| 3D viewers | Full-protein | Add offset to safety windows; domains and pLDDT colouring are already full-protein |

Example: aligning the homeoboxes uses HoxA1 229-288 against HoxA2 143-202. Plot index 0 on X is
HoxA1 residue 229 and shows `plddt[228]`.

### Issues the plan must handle

1. **Displayed sequence.** `App.tsx:86-92` copies the full `sequences.sequenceA/B` into the plot
   after a successful run, which would pair a full sequence with region coordinates. Fix: store a
   snapshot of what was submitted, with its regions, in `ALIGNMENT_SUCCESS`.
2. **Textarea contents.** The textarea can hold a FASTA header, whitespace or a trailing `*`, so
   residue numbers must apply to the cleaned sequence. Slicing happens after
   `SequenceContext.tsx:821-822`, and the panel length uses the same cleaning.
3. **Region reset.** A region resets when the protein changes, but not when submit-time cleaning
   dispatches `UPDATE_SEQUENCE_A/B` (`SequenceContext.tsx:859-864`).
4. **Memory warning.** `EmeraldInput.tsx:67` must use region lengths, otherwise selecting a domain
   of a very long protein still warns about the full size.
5. **Shared links.** Links would drop the selection and show a whole-protein result. Add
   `rangeA` and `rangeB` to the URL only when set. Region must survive `FETCH_SEQUENCE_*_SUCCESS`
   on load.
6. **Shared link auto-run.** `SequenceContext.tsx:553-566` re-runs whenever status is `idle` and
   the URL has data. Since region changes clear results, every slider move would start an
   alignment on a shared-link page. Fix: auto-run once per page load.
7. **Sequences that do not match UniProt.** Domains and pLDDT are numbered against the canonical
   UniProt sequence. A pasted fragment with an accession in its descriptor would get shifted
   annotation. Fix: request `sequence` length from UniProt; on mismatch, show a warning, hide the
   features, and keep manual selection. Hide the pLDDT strip for a region run if lengths differ.
8. **Unknown feature positions.** UniProt can give features no numeric position, so these are
   filtered out in `useProteinDomains`.
9. **Very short regions.** WASM behaviour on very short regions is untested. The minimum length
   gets set from testing.

### Files

New files:

| File | Purpose |
|---|---|
| `src/utils/sequence/regionUtils.ts` | Region types, clamping, typed-input validation, domain-level filter, linker calculation, pLDDT and domain conversion |
| `src/components/sequence/RegionSelector.tsx` | Architecture schematic, sliding window, number inputs, one per sequence |
| `src/components/sequence/RegionSelector.css` | Panel styles |

Edits:

| File | Lines | Change |
|---|---|---|
| `src/hooks/useProteinDomains.ts` | 5-9, 11-15 | Add `type` to `ProteinDomain`; add `sequenceLength` to the result |
| | 47 | Request the `sequence` field |
| | 53-60 | Keep feature type, drop features without numeric positions |
| `src/context/SequenceContext.tsx` | 59-94, 96-132 | Add `regionA/B` and submitted-run snapshot to state |
| | 135-165 | Add `SET_REGION_A/B` actions |
| | 170-189 | Reset region only if the cleaned sequence changed |
| | 242-295, 302-316, 329-343, 372-397 | Reset region on new protein |
| | 404-409 | Store snapshot on success |
| | 502-545, 553-566 | Apply URL ranges; auto-run once |
| | 820-830, 867-880, 889-897 | Validate and slice region; submit and return the slice |
| `src/components/sequence/EmeraldInput.tsx` | 67-71 | Memory warning uses region lengths |
| | between 401 and 403 | Render `RegionSelector` for A and B |
| `src/App.tsx` | 68-69, 71-83 | Convert domains and pLDDT for the plot |
| | 86-102 | Use submitted snapshot |
| | 128-138 | Pass regions to the share URL |
| | 408-409 | Show the aligned range beside each descriptor |
| | 483-511 | Pass offsets to the results view; keep full-protein domains for 3D |
| `src/components/alignment/AlignmentGraphWithInfoPanel.tsx` | 25-54, 210, 511-543, 573-581, 650-654 | Accept and forward offsets and regions |
| `src/components/alignment/PointGridPlot.tsx` | 120-136, 1266-1285 | Accept offsets; tooltip shows original residue numbers |
| `src/utils/canvas/axes.tsx` | 56-69, 71-147, 296-376, 421-557 | Make index markers 1-based everywhere; add offsets; keep regular markers on round residue numbers |
| | 563-610, 620-688, 697-733, 748-785 | Add offsets to indexed labels and safety window labels |
| `src/utils/export/svgUtils.ts` | 278 | Forward offsets so exports match the screen |
| `src/components/alignment/SafetyWindowsInfoPanel.tsx` | 812, 816, 1017, 1021, 1225 | Show full-protein coordinates |
| `src/components/structure/AlignmentStructuresViewer.tsx` | 67-70 | Offset safety windows |
| `src/components/structure/StructureSuperpositionPanel.tsx` | 159-166 | Offset safety windows |
| `src/utils/export/urlSharing.ts` | 28-36, 41+, 129-139, 209-220 | Add `rangeA` and `rangeB` |
| `src/components/share/ShareUrlPanel.tsx` | 73 | Pass regions |
| `README.md` | 19-27 | Add the feature to Key Features |

Not changed: `src/emerald-wasm/` (the algorithm), `confidenceStrip.tsx`, `domainStrip.tsx`,
`PointGridPlot` scales and zoom.

### Stages

1. Types, `regionUtils.ts`, context changes and the number inputs: a working end-to-end slice.
2. pLDDT, domain, axis, panel, 3D and export coordinates (the second requested feature).
3. Architecture schematic and sliding window.
4. Shared links and the README.

### Verification plan

- `npm run build` and `npm run lint` (`npm install` needed first).
- HoxA1 229-288 against HoxA2 143-202: compare strip colours, axis numbers and 3D highlights with
  the same residues in a whole-protein run.
- Whole-protein run with no selection: results match current behaviour, except axis markers are
  now 1-based.
- One region only, linker selection, Shift-click span, invalid typed input.
- Pasted sequence with no accession, pasted fragment with a mismatched accession, upload of a
  structure file.
- Shared link round trip with ranges, with no auto-run on later slider moves.

### Open decisions

None.

### Decisions

- The schematic shows domain-level features only. The results Domain strip keeps its wider list,
  so the two views differ. The user's reply "yes please start" was taken as accepting this
  recommendation, and it affects stage 3 only.
- Axis markers become 1-based everywhere, including whole-protein plots. They were 0-based
  (`axes.tsx:107`), while safety window labels (`axes.tsx:658`) and panels were already 1-based.
- The schematic is one main line of domain-level features, with no secondary row.
- A linker is anything between domains. The schematic is only a simple selection aid.
- Shared links add the range to the URL. All UniProt annotation is still fetched for the whole
  protein, then matched to the selected range.

### Implementation record

Stage 1 (typed residue ranges, end to end), uncommitted:

| File | Change |
|---|---|
| `src/utils/sequence/regionUtils.ts` | New: `ResidueRange`, `MIN_REGION_LENGTH`, `getRegionLength`, `extractRegion`, `parseRegionInput` |
| `src/components/sequence/RegionSelector.tsx` | New: start and end inputs, Whole protein button, selection summary |
| `src/components/sequence/RegionSelector.css` | New: panel styles |
| `src/utils/sequence/fastaInput.ts` | New `cleanProteinSequence`, the single definition of the submitted sequence form |
| `src/utils/sequence/index.ts` | Export `regionUtils` |
| `src/context/SequenceContext.tsx` | `regionA/B`, `submittedAlignment`, `SET_REGION_A/B`, region reset rules, submit the selected slice |
| `src/components/sequence/EmeraldInput.tsx` | Render the panel; memory warning uses submitted lengths |
| `src/App.tsx` | Plot reads `submittedAlignment`; axis descriptions show the range |

Departures from the plan:

- `src/utils/sequence/fastaInput.ts` and `index.ts` were not in the original file table.
- Added a temporary gate, `hasRegionRun` in `src/App.tsx`. It withholds the pLDDT and domain strips
  on region runs until stage 2 converts them, so they cannot show misaligned data. The toggles
  still read "On" during this time. Remove the gate in stage 2.
- Typed input applies on Enter or when focus leaves both fields, not per keystroke, because each
  change clears results.
- A blank start or end means the start or end of the protein.

The known gaps recorded at the end of stage 1 were closed by stages 2 and 4.

Stages 2 to 4, uncommitted:

| File | Change |
|---|---|
| `src/utils/sequence/regionUtils.ts` | Offsets, pLDDT and domain conversion, `normalizeRegion`, `moveRange`, `resizeRange`, `buildArchitecture` |
| `src/hooks/useProteinDomains.ts` | Feature `type`, `displayStart/End`, `sequenceLength`; features without numeric positions dropped |
| `src/App.tsx` | Strips converted to the region; hidden if UniProt length differs; temporary gate removed; regions in share URL |
| `src/utils/canvas/axes.tsx`, `interactions.tsx` | 1-based numbers with residue offsets, including hover text |
| `src/components/alignment/PointGridPlot.tsx` | Offsets; tooltip shows a clipped domain's true range |
| `src/components/alignment/AlignmentGraphWithInfoPanel.tsx` | Reads regions from context and forwards offsets |
| `src/components/alignment/SafetyWindowsInfoPanel.tsx`, `SequenceAlignmentViewer.tsx` | Full-protein coordinates |
| `src/utils/export/svgUtils.ts` | Offsets in exported figures |
| `src/components/structure/AlignmentStructuresViewer.tsx`, `StructureSuperpositionPanel.tsx` | Safety window highlights use protein numbers |
| `src/components/sequence/RegionSelector.tsx`, `.css`, `EmeraldInput.tsx` | Architecture line, domain list, sliding window, side-by-side layout |
| `src/utils/export/urlSharing.ts`, `src/components/share/ShareUrlPanel.tsx` | `rangeA` and `rangeB` |
| `src/context/SequenceContext.tsx` | URL ranges applied on fetch; shared links auto-run once |
| `README.md` | Region Selection was added to Key Features, then the file was restored to its original state outside this work on 2026-11-02, so it is unchanged |

Further departures from the plan:

- A protein whose length differs from UniProt also loses its pLDDT and domain strips on
  whole-protein runs, not only region runs. Previously they were drawn misplaced.
- Parameter changes on a shared-link page no longer re-run automatically either.
- A range in a shared link that does not fit the protein is ignored, and the run uses the whole
  protein. This is logged to the console only.
- The unused `drawIndexedAxisLabels` code path in `axes.tsx` was left unchanged.
- The Domain strip on the graph is converted to the region but still uses its wider feature list.

`npm install` removed an unrelated optional `yaml` entry from `package-lock.json`. That change was
reverted, so the lockfile is untouched.

### Verification

Stage 1:

- Baseline before edits: `npm run build` passed; lint reported 98 problems (66 errors, 32 warnings).
- After edits: `tsc -b` passes; lint is unchanged at 98 problems.
- Browser test in headless Chrome against the dev server, using live UniProt data: all 18 checks
  passed. Cases: whole-protein run (P49639 against O43364); HoxA1 229-288 against HoxA2 143-202;
  a region on one sequence only (5-60); results cleared on region change; reversed, out-of-range,
  non-numeric and too-short input; Tab between fields; blank end; a full range treated as whole
  protein; a 2-residue run; region kept when a trailing `*` is added; region dropped when the
  sequence changes.
- Bug found and fixed by this test: moving from Start to End applied the range and filled in End,
  so typed digits joined the auto-filled value. Input now applies on Enter or when focus leaves
  both fields.
- Not checked yet: FASTA-header pastes, structure file upload, shared links, and the memory warning.
  Scientific correctness of results is not separately validated, beyond the correct stretch being
  submitted and plotted.
- `MIN_REGION_LENGTH` is 2, because a 2-residue run completes in the WASM build.

Stages 2 to 4, in headless Chrome with live UniProt and AlphaFold data:

- `tsc -b` and `npm run build` pass. Lint is unchanged at 98 problems.
- pLDDT strip, HoxA1 229-288: canvas pixels matched AlphaFold scores at 60 of 60 residues. The
  same comparison at the wrong offset (residues 1-60) matched 2 of 60.
- Axis text intercepted on the canvas: region run shows 229-288 and 143-202 with round markers and
  no 0. A whole run shows 1, 168, 335 at that zoom.
- Clicks on domains and linkers, Shift-click spans, window drag, both edge handles, quick release
  and arrow keys all pass. Moving the sliding window applies only on release.
- Shared link round trip passes, including whole-protein annotation, no auto-run after a change,
  and invalid ranges ignored.
- Pasted 59-residue fragment under accession P49639: warning shown, no domains, no pLDDT strip.
- Bug found and fixed: a quick release could lose the last drag position.
- Not checked: FASTA-header pastes, structure file upload, the memory warning, SVG/PDF output
  numbering, and narrow screens.

---

## 2. Safety-window-guided structure superposition

**Status:** Implemented and tested, uncommitted. Awaiting user review.
**Based on commit:** 350fe4d
**Depends on:** entry 1, stage 2, for full-protein residue numbers when a region is selected.

### Goal

Let the user choose a safety window in the TM-align panel and superpose the two structures on
those residues. Global TM-align stays the default view.

### Method

Superpose on the window's residue pairs by RMSD minimisation, rather than running TM-align on
the window. The code calls `MinimizeRmsd.compute` directly, which `superpose()` wraps, because that
allows pairs to be matched by residue number and rules out the shift described in issue 2 below.

- A safety window already says which residue pairs with which. TM-align would discard that and
  search for its own pairing, so the result might not use the window's correspondence.
- `tmAlign()` is built for finding structural similarity across whole chains. Its score and
  pairing are not meaningful on the short windows seen in practice.

### Behaviour

A "Superpose on" row is added above the viewer:

- **Global TM-align:** default, restored instantly from the stored transform.
- **Single window:** previous and next buttons in the style of the safety windows panel
  (`SafetyWindowsInfoPanel.tsx:956-982`), using the same window numbers, plus the residue ranges
  for A and B.

Details:

- Selector state belongs to this panel. It is not tied to the plot selection, because the plot
  auto-selects window 1 on load and each plot click would otherwise move the 3D view.
- Only structure B's transform is updated in place, so nothing reloads and TM-align does not rerun.
  The current colour modes carry over.
- In single-window mode, only that window is highlighted.
- TM-scores stay global-level. In window mode, the window's RMSD and residue pair count are shown
  as well.
- "Download Alignment: mmCIF" exports whichever superposition is on screen.
- A new alignment run resets the selector to Global TM-align.

### Issues the plan must handle

1. **Merged windows lose pairing.** `mergeSafetyWindows` merges A and B independently, so its
   output cannot be used to pair residues. Pairs come from the unmerged window list.
2. **Silent misalignment from missing residues.** `superpose()` takes the first `n` positions of
   each selection. If a CA is missing from one structure, every later pair shifts by one with no
   error. Pairs are filtered to residues with a CA in both structures before superposing.
3. **Windows with unequal spans.** `SafetyWindowsInfoPanel.tsx:172-173` tracks X and Y lengths
   separately. The only saved sample (`src/temp/test.json`, 3 windows) has equal spans, which
   is too little evidence to assume they always match. Equal spans pair residue by residue. For
   unequal spans, use the aligned pairs of the optimal path inside the window, and if there are
   none, disable that window with an explanation. Real runs need checking during implementation.
4. **Short windows.** The sample has windows of 2 and 3 residues. Superposing needs at least 3
   pairs, so shorter windows are disabled. A caution is shown for small windows, because a low
   RMSD on a few residues says little. The threshold gets set from testing.
5. **Non-AlphaFold structures.** Pairing assumes `label_seq_id` equals sequence position. That
   holds for AlphaFold, but may not for RCSB or uploaded files. Residue letters are checked against
   the aligned sequences, and window modes are disabled on mismatch.
6. **Regions from entry 1.** Window positions are region-relative, so pairs add the region offsets.
7. **Rest of the protein.** Superposing on a short window can leave other parts far apart. This
   is expected, and the panel text will say so.

### Files

| File | Lines | Change |
|---|---|---|
| `src/utils/sequence/safetyWindowUtils.ts` | end of file | Add residue pair builder: handles offsets and unequal spans |
| `src/components/structure/StructureSuperpositionPanel.tsx` | 7-11 | Import `superpose` and any selection helpers |
| | 30-35, 139, 149 | Stats for each mode; stored global transform; selector state |
| | 159-166 | Add unmerged window list for pairing |
| | 240-241 | Highlight only the chosen window in single-window mode |
| | 410-436 | Store the global transform, stats and original coordinates |
| | after 474 | New effect that updates the transform for the current selection |
| | between 571 and 573 | Add the "Superpose on" row |
| | 621-627, 629-648 | Update description; stats by mode |
| `src/components/structure/StructureSuperpositionPanel.css` | end of file | Selector row styles |

Not changed: `src/emerald-wasm/`, the default global TM-align calculation, and
`StructureViewer.tsx`.

### Stages

5. Pair builder, then in-place transform with single-window mode.
6. Stats, highlighting, cautions and download check.

### Verification plan

- Run HoxA1 against HoxA2. Confirm global TM-align values are unchanged by this feature.
- For one window, compute the expected RMSD separately from the structure coordinates and compare
  it with the displayed value.
- Confirm paired CA atoms sit close together in the viewer.
- Switch modes repeatedly and return to Global TM-align: same stats, no reload.
- Check mode changes with each colour toggle, and the downloaded mmCIF.
- With a region selected, confirm pairs use full-protein residue numbers.
- Test windows that are too short, and an uploaded structure file.

### Open decisions

- Approval to start, after entry 1 stage 2.

### Pre-existing bug found: global TM-align uses only part of each protein

`StructureSuperpositionPanel.tsx` builds the TM-align input with
`StructureSelection.toLociWithCurrentUnits`. On these structures that resolves to about one
C-alpha in every 8 (45 of 335 for HoxA1, at residues 2, 10, 18, 26, 31 and so on). Mol\*'s own
TM-align code uses `toLociWithSourceUnits`. Commit 350fe4d gives identical values, so this bug
predates this work.

| Pair | Shown now | With all C-alpha atoms |
|---|---|---|
| Rhodopsin (P08100) / beta-2 adrenergic receptor (P07550) | TM 0.0677 / 0.0596, 43 aligned | TM 0.730 / 0.624, 341 aligned |
| HoxA1 (P49639) / HoxA2 (O43364) | TM 0.0250 / 0.0228, 28 aligned | TM 0.248 / 0.224, 227 aligned |

**On hold (user decision, 2026-10-30):** keep global TM-align as it is until the user has reviewed
the code that selects these residues. Do not change `toLociWithCurrentUnits` at
`StructureSuperpositionPanel.tsx:486-490` before then.

The global values are **not changed**, because this alters results the app already reports and
needs the user's decision. Window superposition reads C-alpha atoms with source units, so it is not
affected. The Mol\* `rmsd` value stayed high with all atoms (14.65 Angstrom for the GPCR pair over
341 residues). That looks inconsistent with a TM-score of 0.73 and has not been explained.

### Implementation record

| File | Change |
|---|---|
| `src/utils/structure/windowSuperposition.ts` | New: reads C-alpha atoms by residue number; fits B onto A over given pairs |
| `src/utils/sequence/safetyWindowUtils.ts` | `ResiduePair`, `getSafetyWindowResiduePairs`, `shiftSafetyWindows` |
| `src/components/structure/StructureSuperpositionPanel.tsx` | "Superpose on" row, in-place transform update, window stats, single-window highlight |
| `src/components/structure/StructureSuperpositionPanel.css` | Selector styles |

Departures from the plan:

- `src/utils/structure/windowSuperposition.ts` was not in the original file table.
- Previous and next skip windows that cannot be used, and a note says how many are unavailable.
- The small-window caution appears below 10 residue pairs. This threshold is a judgement call.

Known limitation: a window with equal spans is assumed to pair one to one. If it contained an
insertion and a deletion that cancel out, those pairs would be misaligned. Not observed, and not
ruled out.

### Decisions

- Use `superpose()`-style RMSD fitting on the window's residue pairs.
- TM-scores stay at global level. Window mode adds a local RMSD for the selected window.
- Start with Global TM-align and one window at a time. All windows and multi-select are not
  included.

### Verification

In headless Chrome with live AlphaFold structures. Each result was checked by downloading the
"Download Alignment" mmCIF and recomputing RMSD in Python:

| Window | Pairs | Shown | Downloaded coordinates | Independent Kabsch |
|---|---|---|---|---|
| HoxA1 229-288 / HoxA2 143-202 | 60 | 1.411 | 1.411 | 1.411 |
| Rhodopsin 33-38 / beta-2 30-35 | 6 | 0.560 | 0.560 | 0.560 |
| Rhodopsin 35-39 / beta-2 32-36 | 5 | 0.231 | 0.231 | 0.231 |
| Rhodopsin 55-97 / beta-2 51-93 | 43 | 0.634 | 0.634 | 0.634 |
| Rhodopsin 103-139 / beta-2 99-135 | 37 | 1.096 | 1.096 | 1.096 |

- Returning to Global TM-align restores structure B exactly (0.0000 difference) with no reload, and
  stats are unchanged.
- Windows with unequal spans occur in real runs for this pair: 1 of 26 at alpha 0.75, delta 8;
  4 of 38 at 0.6, 16; 1 of 11 at 0.9, 4; 2 of 3 at 1, 0. The fallback for these has not had its
  own RMSD check.
- Not checked: uploaded or RCSB structures, and colour modes combined with window switching.

---

## 3. 3D panel layout, window scrolling and architecture

**Status:** Implemented and tested, uncommitted.
**Based on commit:** 350fe4d plus the uncommitted work in entries 1 and 2.

### Goal

- TM-align panel: move the "Superpose on" controls under the domain architecture, above the 3D
  viewer. (First built inside the stats box as requested, then moved here at the user's request.)
- Window choice buttons in both panels: larger and green, so they stand out.
- TM-align panel: remove the line "TM-scores, RMSD and aligned residues are from the global
  TM-align. This window has only N residue pairs, so a low RMSD says little."
- Safety Windows Mapped on 3D structures panel: scroll through windows one at a time, or light up
  all of them.
- Both panels: show the Sequence A and B domain architecture, with the selected safety window
  highlighted.

### Plan

- Extract the architecture line from `RegionSelector` into a shared read-only-capable component, so
  all three places draw the same schematic.
- Mark windows on the architecture line. "All" marks every window; a single window marks only it.
- The line always shows the whole protein. On a region run the aligned region is shaded.
- In the 3D panel, one shared control drives A and B together, because a safety window is a pair of
  residue ranges. It offers All windows, or previous and next through single windows.
- "All windows" keeps the current merged highlighting. Single windows use the same numbering as the
  safety windows panel.
- The existing per-structure "Safety Windows (merged)" on/off toggles stay.

### Files

| File | Lines | Change |
|---|---|---|
| `src/components/sequence/ProteinArchitecture.tsx` | new | Shared schematic with optional clicks, window marks and region shading |
| `src/components/sequence/ProteinArchitecture.css` | new | Schematic styles, moved from `RegionSelector.css` |
| `src/components/sequence/RegionSelector.tsx` | schematic block | Use the shared component |
| `src/components/sequence/RegionSelector.css` | schematic rules | Remove moved rules |
| `src/components/structure/AlignmentStructuresViewer.tsx` | 41-46, 66-72 | Window selection state and unmerged window list |
| | 117-118 | Add the window scrolling row |
| | 208-209, 325-326 | Add architecture above each viewer |
| | 223-224, 340-341 | Pass the single window or all windows to `StructureViewer` |
| `src/components/structure/StructureSuperpositionPanel.tsx` | 48 | Remove `FEW_PAIRS_CAUTION` |
| | 745-794 | Move the selector below the architecture, above the viewer |
| | 839-844 | Remove the note line |
| | above viewer | Add A and B architecture |
| `src/components/structure/StructureSuperpositionPanel.css` | 149+ | Selector and architecture styles |
| `src/components/structure/AlignmentStructuresViewer.css` | end of file | Window row and architecture spacing |

Not changed: global TM-align (on hold, see entry 2), and `StructureViewer.tsx`, which already
accepts any list of windows.

### Open decisions

None.

### Decisions

- The 3D panel and the TM-align panel keep separate window selections.
- Implementation approved by the user on 2026-10-30.

### Implementation record

| File | Change |
|---|---|
| `src/components/sequence/ProteinArchitecture.tsx`, `.css` | New shared schematic with optional clicks, region shading, safety window track and a light variant for white panels |
| `src/components/sequence/RegionSelector.tsx`, `.css` | Use the shared schematic; moved styles removed |
| `src/utils/sequence/safetyWindowUtils.ts` | New `getSafetyWindowRanges`, which keeps each window's A and B ranges paired |
| `src/components/structure/AlignmentStructuresViewer.tsx`, `.css` | All windows or previous/next row; architecture above each viewer; single window passed to `StructureViewer` |
| `src/components/structure/StructureSuperpositionPanel.tsx`, `.css` | A and B architecture; "Superpose on" row moved under it, above the viewer; note line and `FEW_PAIRS_CAUTION` removed |

Departures from the plan:

- The "Superpose on" row was first built inside the stats box, to the right of the stats. With six
  stats there was little room, and after seeing it the user asked for it below the architecture.
  The stats box is back to its original structure.
- An edit script for the move failed on an indentation mismatch and the job carried on, so the app
  and this log briefly disagreed. The user caught it. The move was then redone and confirmed in the
  file: stats, architecture, "Superpose on", viewer.
- New `.window-choice-button` style (in `AlignmentStructuresViewer.css`) on All windows, Global
  TM-align, Safety window and the arrows: larger, solid green, dark green when selected.
- User refinements after review: All windows is blue when selected and white when not; arrows use
  the black `nav-button` style from the safety windows panel, in both 3D panels; the current window
  shows as "Window N of M" in a green box, with residue ranges removed from it, and the 3D panel box
  reads "All windows" when all are selected. The "Superpose on" buttons are blue when selected and
  white when not, and "Global TM-align" is renamed "Global". Only the window box is green, and the
  unused `.window-choice-button` style was removed.
- Safety windows are marked on a thin green track under the architecture line, so domain labels stay
  readable.
- The small-window caution went with the removed line. Windows under 3 pairs stay unavailable, and
  the "N of M windows unavailable" note stays beside the controls.
- From All windows, next goes to the first window and previous goes to the last.

### Verification

- `tsc -b` passes and lint was unchanged at 98 problems after the final edit.
- Before the final move of the "Superpose on" row, 19 of 20 new checks passed in headless Chrome.
  The one failure was the old stats-box layout check, now replaced by a position check. Passing
  checks covered: scrolling (first, next, last, All), window 2 of the rhodopsin/beta-2 pair marked at
  residues 33-38, 26 marks in All view, the two panels' selections staying separate in both
  directions, the note line removed, the aligned region shaded on a region run, window marks in
  full-protein positions, and schematics in the 3D panels not clickable.
- Screenshots confirmed one window highlighted at a time in the Mol\* sequence and 3D views.
- Final run after the move and the green buttons, in headless Chrome: all 20 panel checks and all 34
  regression checks passed, with no page errors. The first regression attempt timed out waiting for
  a sequence fetch. UniProt answered normally straight afterwards and the rerun passed, so this
  looks like a one-off, but the cause was not established.
- Window RMSD recheck after the move: all 5 windows still match the independent calculation.
- The final screenshot confirms the order: stats, architecture, "Superpose on", viewer.

---

## 4. Test site on the fork

**Status:** Proposed. Awaiting approval, nothing committed or pushed.
**Based on commit:** 350fe4d plus the uncommitted work in entries 1 to 3.

### Goal

Publish the updated app at `https://kenman-22.github.io/emerald-ui_update/` from
`https://github.com/Kenman-22/emerald-ui_update`, alongside the original site.

### Findings

- The fork's `main` is at 350fe4d, the same commit as the local branch, so a normal push works.
- `vite.config.ts:7` hard-codes `base` to `https://algbio.github.io/emerald-ui/`. A fork build would
  load its code from the original site, so the test page would not show the new features.
- `counterService.ts` falls back to the production counter, so test runs would add to the public
  alignment count.
- `.github/workflows/deploy-pages.yml` deploys on push to `main`, so it needs no trigger change.
- Shared links are built from the current page address, so they will point at the test site.

### Plan

| File | Lines | Change |
|---|---|---|
| `vite.config.ts` | 7 | Read `base` from `PAGES_BASE`, defaulting to the current address |
| `.github/workflows/deploy-pages.yml` | build step | Set `PAGES_BASE` from the repository name |
| `src/utils/api/counterService.ts` | counter calls | Do nothing when the test-site setting is on |
| `.github/workflows/deploy-pages.yml` | build step | Turn that setting on outside `algbio/emerald-ui` |

Then add the fork as a remote named `fork`, commit on `Kenman-22-patch-1`, and push that branch to
the fork's `main`. `origin` is not pushed to.

### Settings the user must change on GitHub

- Actions tab: enable workflows, which GitHub turns off on forks.
- Settings > Pages > Source: GitHub Actions.

### Decisions

None approved yet.
