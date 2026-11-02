import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { DefaultPluginUISpec, type PluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginCommands } from 'molstar/lib/mol-plugin/commands';
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18';
import { Asset } from 'molstar/lib/mol-util/assets';
import { StructureSelection, QueryContext } from 'molstar/lib/mol-model/structure';
import { StructureElement } from 'molstar/lib/mol-model/structure';
import { compile } from 'molstar/lib/mol-script/runtime/query/compiler';
import { MolScriptBuilder as MS } from 'molstar/lib/mol-script/language/builder';
import { tmAlign } from 'molstar/lib/mol-model/structure/structure/util/tm-align';
import { StateTransforms } from 'molstar/lib/mol-plugin-state/transforms';
import { Color } from 'molstar/lib/mol-util/color';
import { MarkerAction, MarkerActions } from 'molstar/lib/mol-util/marker-action';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { useSequence } from '../../context/SequenceContext';
import ProteinArchitecture from '../sequence/ProteinArchitecture';
import { extractSafetyWindowsFromAlignments, getSafetyWindowRanges, getSafetyWindowResiduePairs, mergeSafetyWindows, shiftSafetyWindows } from '../../utils/sequence/safetyWindowUtils';
import type { ResiduePair } from '../../utils/sequence/safetyWindowUtils';
import { MIN_SUPERPOSITION_PAIRS, readCaResidues, superposeOnPairs } from '../../utils/structure/windowSuperposition';
import type { CaResidueMap } from '../../utils/structure/windowSuperposition';
import { getResidueOffset } from '../../utils/sequence/regionUtils';
import type { StructureDataResult } from '../../hooks/useStructureData';
import { downloadRawStructureFile, downloadStructureAsMmcif } from '../../utils/export/structureExport';
import { AFConfidenceColorThemeProvider } from '../../utils/structure/afConfidenceColorTheme';
import { DomainColorThemeProvider } from '../../utils/structure/domainColorTheme';
import type { ProteinDomain } from '../../hooks/useProteinDomains';
import { createStructureColorThemeParams } from 'molstar/lib/mol-plugin-state/helpers/structure-representation-params';
import './StructureSuperpositionPanel.css';

function sanitizeForFilename(value: string): string {
  return (value || 'structure').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60);
}

interface TMAlignStats {
  tmScoreA: number;
  tmScoreB: number;
  rmsd: number;
  alignedLength: number;
}

interface SuperpositionWindow {
  number: number; // Same numbering as the safety windows panel
  pairs: ResiduePair[];
  disabledReason: string | null;
}

// Color constants for the two structures
const COLOR_A = Color(0x4a90d9); // blue
const COLOR_B = Color(0xe05c2a); // orange/red

function getPluginSpec(): PluginUISpec {
  const spec = DefaultPluginUISpec();
  spec.canvas3d = {
    ...spec.canvas3d,
    renderer: {
      ...spec.canvas3d?.renderer,
      backgroundColor: Color(0xffffff),
      selectColor: Color(0x00cc66),
      highlightColor: Color(0x00cc66),
      selectStrength: 0,
      highlightStrength: 0,
    },
    marking: {
      ...spec.canvas3d?.marking,
      enabled: true,
      selectEdgeColor: Color(0x00cc66),
      highlightEdgeColor: Color(0x00cc66),
    },
  };
  spec.layout = {
    initial: {
      isExpanded: false,
      showControls: true,
      regionState: {
        bottom: 'hidden',
        left: 'collapsed',
        right: 'hidden',
        top: 'full',
      },
      controlsDisplay: 'reactive',
    },
  };
  return spec;
}


/** Resolve the download URL and format for a structure entry from context state. */
async function resolveStructureSource(
  s: { uniprotId?: string | null; pdbId?: string | null; fileContent?: string | null; fileType?: 'pdb' | 'cif' | null }
): Promise<{ url: string; format: 'pdb' | 'mmcif'; objectUrl?: string }> {
  if (s.fileContent) {
    const blob = new Blob([s.fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    return { url, format: s.fileType === 'cif' ? 'mmcif' : 'pdb', objectUrl: url };
  }
  if (s.pdbId) {
    return { url: `https://files.rcsb.org/download/${s.pdbId.toUpperCase()}.pdb`, format: 'pdb' };
  }
  if (s.uniprotId) {
    const response = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${s.uniprotId}`);
    if (!response.ok) {
      throw new Error(`AlphaFold API returned ${response.status} for UniProt ID: ${s.uniprotId}`);
    }
    const predictions = await response.json();
    if (!predictions || predictions.length === 0) {
      throw new Error(`No AlphaFold predictions found for UniProt ID: ${s.uniprotId}`);
    }
    const prediction = predictions[0];
    if (prediction.cifUrl) {
      return { url: prediction.cifUrl, format: 'mmcif' };
    }
    if (prediction.pdbUrl) {
      return { url: prediction.pdbUrl, format: 'pdb' };
    }
    throw new Error(`No structure files available for UniProt ID: ${s.uniprotId}`);
  }
  throw new Error('No structure source provided');
}

interface StructureSuperpositionPanelProps {
  /** Shared AlphaFold fetch results (from useStructureData), reused for the "Download PDB"
   * buttons here so the original structures' raw file text doesn't need a duplicate fetch. */
  structureDataA?: StructureDataResult;
  structureDataB?: StructureDataResult;
  /**
   * Per-sequence UniProt domain annotations, used by "Colour by domain". Each structure is
   * colored from its own list, but the palette is keyed by domain *name*, so a domain shared
   * between the two proteins gets the same color in both - which is what makes it possible to
   * see at a glance whether equivalent domains actually superpose.
   */
  proteinDomainsA?: ProteinDomain[];
  proteinDomainsB?: ProteinDomain[];
}

export const StructureSuperpositionPanel: React.FC<StructureSuperpositionPanelProps> = ({
  structureDataA,
  structureDataB,
  proteinDomainsA,
  proteinDomainsB,
}) => {
  const { state } = useSequence();
  const { sequences, alignments, structureA, structureB, submittedAlignment } = state;

  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<any>(null);
  // State-tree cell refs for the loaded structures, captured once TM-align finishes, so the
  // download buttons can pull each structure's *current* (possibly transformed) coordinates
  // straight from Mol*'s live state rather than re-fetching or re-deriving them.
  const structRefsRef = useRef<{ a: string | null; b: string | null; alignedB: string | null }>({ a: null, b: null, alignedB: null });
  // Kept so that returning to the global view does not have to rerun TM-align.
  const tmAlignTransformRef = useRef<unknown>(null);
  // Representation state-tree nodes (and the structure object each was built from), captured so
  // the color effect below can update their color theme directly - updateRepresentationsTheme
  // against the hierarchy manager's component list turned out to silently no-op here too (see
  // the matching note in StructureViewer.tsx), since these structures are loaded via the plain
  // builders API without a hierarchy preset applied.
  const reprRefsRef = useRef<{ a: any; b: any }>({ a: null, b: null });
  const [isPluginReady, setIsPluginReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tmStats, setTmStats] = useState<TMAlignStats | null>(null);
  const [caResidues, setCaResidues] = useState<{ a: CaResidueMap; b: CaResidueMap } | null>(null);
  // Number of the safety window to superpose on, null for global TM-align.
  const [selectedWindowNumber, setSelectedWindowNumber] = useState<number | null>(null);
  // Bumped once a transform is on screen, because that replaces what the highlights were set on.
  const [transformRevision, setTransformRevision] = useState(0);
  const [useSecondaryColors, setUseSecondaryColors] = useState(true);
  const [usePlddtColors, setUsePlddtColors] = useState(false);
  // Mutually exclusive with pLDDT for the same reason as on the plain structure panels: both
  // repaint every residue, so only one can actually be on screen.
  const [useDomainColors, setUseDomainColors] = useState(false);
  const hasAnyDomains = (proteinDomainsA?.length ?? 0) > 0 || (proteinDomainsB?.length ?? 0) > 0;
  const [showSafetyWindows, setShowSafetyWindows] = useState(true);
  const [hasSuperpositionLoaded, setHasSuperpositionLoaded] = useState(false);

  const safetyWindowMapping = useMemo(
    () => (alignments.length > 0
      ? extractSafetyWindowsFromAlignments(alignments)
      : { sequenceA: [], sequenceB: [] }),
    [alignments]
  );
  // Structures are numbered for the whole protein, windows for what was aligned.
  const offsetA = getResidueOffset(submittedAlignment?.regionA);
  const offsetB = getResidueOffset(submittedAlignment?.regionB);
  const safetyWindowsA = useMemo(() => mergeSafetyWindows(shiftSafetyWindows(safetyWindowMapping.sequenceA, offsetA)), [safetyWindowMapping, offsetA]);
  const safetyWindowsB = useMemo(() => mergeSafetyWindows(shiftSafetyWindows(safetyWindowMapping.sequenceB, offsetB)), [safetyWindowMapping, offsetB]);

  const superpositionWindows = useMemo<SuperpositionWindow[]>(() => {
    if (!caResidues) return [];
    const textAlignment = alignments.find(alignment => alignment.textAlignment)?.textAlignment;

    return alignments
      .filter(alignment => alignment.startDot && alignment.endDot)
      .map((alignment, index) => {
        const allPairs = getSafetyWindowResiduePairs(
          {
            xStart: Math.floor(alignment.startDot!.x),
            xEnd: Math.floor(alignment.endDot!.x),
            yStart: Math.floor(alignment.startDot!.y),
            yEnd: Math.floor(alignment.endDot!.y),
          },
          textAlignment?.representative.sequence,
          textAlignment?.member.sequence,
          offsetA,
          offsetB
        );
        const pairs = allPairs.filter(pair => caResidues.a.has(pair.a) && caResidues.b.has(pair.b));

        // Residue numbers in an uploaded or PDB file need not match sequence positions.
        const matchesSequence = (residue: string, expected: string | undefined) =>
          residue === 'X' || expected === 'X' || residue === expected;
        const numberingMatches = pairs.every(pair =>
          matchesSequence(caResidues.a.get(pair.a)!.letter, submittedAlignment?.sequenceA[pair.a - offsetA - 1]) &&
          matchesSequence(caResidues.b.get(pair.b)!.letter, submittedAlignment?.sequenceB[pair.b - offsetB - 1])
        );

        let disabledReason: string | null = null;
        if (!numberingMatches) {
          disabledReason = 'structure numbering does not match the sequence';
        } else if (pairs.length < MIN_SUPERPOSITION_PAIRS) {
          disabledReason = `needs at least ${MIN_SUPERPOSITION_PAIRS} residue pairs`;
        }
        return { number: index + 1, pairs, disabledReason };
      });
  }, [alignments, caResidues, offsetA, offsetB, submittedAlignment]);

  const usableWindows = useMemo(
    () => superpositionWindows.filter(window => !window.disabledReason),
    [superpositionWindows]
  );
  const selectedWindow = usableWindows.find(window => window.number === selectedWindowNumber) ?? null;
  const windowFit = useMemo(
    () => (selectedWindow && caResidues ? superposeOnPairs(selectedWindow.pairs, caResidues.a, caResidues.b) : null),
    [selectedWindow, caResidues]
  );

  const highlightedWindowsA = useMemo(() => (selectedWindow
    ? [{ startPosition: selectedWindow.pairs[0].a, endPosition: selectedWindow.pairs[selectedWindow.pairs.length - 1].a }]
    : safetyWindowsA), [selectedWindow, safetyWindowsA]);
  const highlightedWindowsB = useMemo(() => (selectedWindow
    ? [{ startPosition: selectedWindow.pairs[0].b, endPosition: selectedWindow.pairs[selectedWindow.pairs.length - 1].b }]
    : safetyWindowsB), [selectedWindow, safetyWindowsB]);

  const windowRanges = useMemo(() => getSafetyWindowRanges(alignments, offsetA, offsetB), [alignments, offsetA, offsetB]);
  const markedRangesA = selectedWindow
    ? [{ start: highlightedWindowsA[0].startPosition, end: highlightedWindowsA[0].endPosition }]
    : windowRanges.flatMap(window => (window.rangeA ? [window.rangeA] : []));
  const markedRangesB = selectedWindow
    ? [{ start: highlightedWindowsB[0].startPosition, end: highlightedWindowsB[0].endPosition }]
    : windowRanges.flatMap(window => (window.rangeB ? [window.rangeB] : []));

  const stepWindow = (direction: 1 | -1) => {
    const current = usableWindows.findIndex(window => window.number === selectedWindowNumber);
    const next = (current + direction + usableWindows.length) % usableWindows.length;
    setSelectedWindowNumber(usableWindows[next].number);
  };

  const hasStructureA = !!(structureA?.uniprotId || structureA?.pdbId || structureA?.fileContent);
  const hasStructureB = !!(structureB?.uniprotId || structureB?.pdbId || structureB?.fileContent);
  const shouldShow = alignments.length > 0 && hasStructureA && hasStructureB;

  const createSafetyWindowLoci = (
    structureData: any,
    windows: Array<{ startPosition: number; endPosition: number }>
  ) => {
    const items: Array<{ label_seq_id: number }> = [];
    for (const window of windows) {
      for (let residueId = window.startPosition; residueId <= window.endPosition; residueId++) {
        items.push({ label_seq_id: residueId });
      }
    }
    if (items.length === 0) return StructureElement.Loci.none(structureData);
    return StructureElement.Loci.fromSchema(structureData, { items });
  };

  const applySafetyWindowHighlights = () => {
    const plugin = pluginRef.current;
    if (!plugin) return;

    const selectionManager = plugin.managers?.structure?.selection;
    const highlightManager = plugin.managers?.interactivity?.lociHighlights;
    const structures = plugin.managers?.structure?.hierarchy?.current?.structures ?? [];
    const set3DMarkingEnabled = (enabled: boolean) => {
      if (!plugin.canvas3d?.setProps) return;
      const currentMarking = plugin.canvas3d.props?.marking ?? {};
      plugin.canvas3d.setProps({
        marking: {
          ...currentMarking,
          enabled,
        },
      });
    };

    const setRepresentationMarkerActions = (disableMarkers: boolean) => {
      for (const s of structures) {
        for (const component of s.components ?? []) {
          for (const reprRef of component.representations ?? []) {
            const repr = reprRef?.cell?.obj?.data?.repr;
            if (repr?.setState) {
              repr.setState({
                markerActions: disableMarkers ? MarkerAction.None : MarkerActions.All,
              });
            }
          }
        }
      }
    };

    if (!selectionManager) return;

    // Always clear previous highlighting state first.
    if (highlightManager.clearHighlights) highlightManager.clearHighlights();
    if (selectionManager.clear) selectionManager.clear();

    if (structures.length < 2) return;

    if (!showSafetyWindows) {
      set3DMarkingEnabled(false);
      setRepresentationMarkerActions(true);
      return;
    }

    set3DMarkingEnabled(true);
    setRepresentationMarkerActions(false);

    const dataA = structures[0]?.cell?.obj?.data;
    const dataB = structures[1]?.cell?.obj?.data;
    if (!dataA || !dataB) return;

    const lociA = createSafetyWindowLoci(dataA, highlightedWindowsA);
    const lociB = createSafetyWindowLoci(dataB, highlightedWindowsB);

    if (!StructureElement.Loci.isEmpty(lociA) && selectionManager.fromLoci) {
      selectionManager.fromLoci('set', lociA);
    }
    if (!StructureElement.Loci.isEmpty(lociB) && selectionManager.fromLoci) {
      selectionManager.fromLoci('add', lociB);
    }
  };

  // Initialize plugin on mount
  useEffect(() => {
    setIsPluginReady(false);
    setError('');

    let disposed = false;

    const initWhenReady = async () => {
      // Wait for container to have dimensions
      let retries = 0;
      while (retries < 20) {
        if (
          containerRef.current &&
          containerRef.current.offsetWidth > 0 &&
          containerRef.current.offsetHeight > 0
        ) break;
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }

      if (disposed || !containerRef.current) return;

      // Clean up any previous plugin
      if (pluginRef.current) {
        try { pluginRef.current.dispose(); } catch { /* ignore */ }
        pluginRef.current = null;
      }
      containerRef.current.innerHTML = '';

      await new Promise(resolve => setTimeout(resolve, 100));
      if (disposed || !containerRef.current) return;

      try {
        const plugin = await createPluginUI({
          target: containerRef.current,
          render: renderReact18,
          spec: getPluginSpec(),
        });
        if (disposed) {
          plugin.dispose();
          return;
        }
        plugin.representation.structure.themes.colorThemeRegistry.add(AFConfidenceColorThemeProvider);
        plugin.representation.structure.themes.colorThemeRegistry.add(DomainColorThemeProvider);
        pluginRef.current = plugin;
        setIsPluginReady(true);
      } catch (err) {
        console.error('StructureSuperpositionPanel: Failed to initialize Mol* plugin:', err);
        setError(`Failed to initialize viewer: ${err}`);
      }
    };

    const timer = setTimeout(initWhenReady, 50);

    return () => {
      disposed = true;
      clearTimeout(timer);
      if (pluginRef.current) {
        try { pluginRef.current.dispose(); } catch { /* ignore */ }
        pluginRef.current = null;
      }
      setIsPluginReady(false);
    };
  }, []); // run once on mount — parent controls mounting via shouldShow

  // Run TM-align superposition when plugin is ready or structures change
  useEffect(() => {
    if (!isPluginReady || !pluginRef.current) return;
    if (!structureA || !structureB) return;

    const objectUrls: string[] = [];
    let cancelled = false;

    const runSuperposition = async () => {
      setIsLoading(true);
      setError('');
      setTmStats(null);
      setCaResidues(null);
      setSelectedWindowNumber(null);
      setHasSuperpositionLoaded(false);

      try {
        const plugin = pluginRef.current;

        // Clear any previously loaded structures
        await plugin.clear();

        if (cancelled) return;

        // ---- Resolve download sources for both structures ----
        const [srcA, srcB] = await Promise.all([
          resolveStructureSource(structureA),
          resolveStructureSource(structureB),
        ]);
        if (srcA.objectUrl) objectUrls.push(srcA.objectUrl);
        if (srcB.objectUrl) objectUrls.push(srcB.objectUrl);

        if (cancelled) return;

        // ---- Load helper ----
        const loadOne = async (url: string, format: 'pdb' | 'mmcif', color: Color) => {
          const data = await plugin.builders.data.download(
            { url: Asset.Url(url) },
            { state: { isGhost: false } }
          );
          const trajectory = await plugin.builders.structure.parseTrajectory(data, format);
          const model = await plugin.builders.structure.createModel(trajectory);
          const structure = await plugin.builders.structure.createStructure(model);

          const representationParams = useSecondaryColors
            ? {
                type: 'cartoon' as const,
                color: 'uniform' as const,
                colorParams: { value: color },
              }
            : {
                type: 'cartoon' as const,
                color: 'uniform' as const,
              };

          const repr = await plugin.builders.structure.representation.addRepresentation(structure, representationParams);
          return { structure, repr };
        };

        // ---- Load both structures ----
        const { structure: structNodeA, repr: reprA } = await loadOne(srcA.url, srcA.format, COLOR_A);
        if (cancelled) return;
        const { structure: structNodeB, repr: reprB } = await loadOne(srcB.url, srcB.format, COLOR_B);
        if (cancelled) return;
        structRefsRef.current.a = structNodeA.ref;
        structRefsRef.current.b = structNodeB.ref;
        structRefsRef.current.alignedB = null;
        reprRefsRef.current.a = reprA;
        reprRefsRef.current.b = reprB;

        // ---- Extract C-alpha loci ----
        const caQuery = compile<StructureSelection>(
          MS.struct.generator.atomGroups({
            'atom-test': MS.core.rel.eq([
              MS.struct.atomProperty.macromolecular.label_atom_id(),
              'CA',
            ]),
          })
        );

        const dataA = structNodeA.cell?.obj?.data;
        const dataB = structNodeB.cell?.obj?.data;

        if (!dataA || !dataB) throw new Error('Could not access structure data');

        const lociA = StructureSelection.toLociWithCurrentUnits(
          caQuery(new QueryContext(dataA))
        ) as StructureElement.Loci;

        const lociB = StructureSelection.toLociWithCurrentUnits(
          caQuery(new QueryContext(dataB))
        ) as StructureElement.Loci;

        if (cancelled) return;

        // ---- Run TM-align ----
        const result = tmAlign(lociA, lociB);

        // ---- Apply transformation to structure B ----
        const transformBuilder = plugin.state.data
          .build()
          .to(structNodeB)
          .insert(StateTransforms.Model.TransformStructureConformation, {
            transform: {
              name: 'matrix',
              params: { data: result.bTransform, transpose: false },
            },
          });
        await plugin.runTask(plugin.state.data.updateTree(transformBuilder));
        structRefsRef.current.alignedB = transformBuilder.ref;
        tmAlignTransformRef.current = result.bTransform;

        if (cancelled) return;

        // ---- Reset camera ----
        await PluginCommands.Camera.Reset(plugin, {});

        // Source units, because the loci above resolve to only a fraction of the C-alpha atoms.
        const residueLociA = StructureSelection.toLociWithSourceUnits(caQuery(new QueryContext(dataA))) as StructureElement.Loci;
        const residueLociB = StructureSelection.toLociWithSourceUnits(caQuery(new QueryContext(dataB))) as StructureElement.Loci;
        setCaResidues({ a: readCaResidues(residueLociA), b: readCaResidues(residueLociB) });
        setHasSuperpositionLoaded(true);
        setTmStats({
          tmScoreA: result.tmScoreA,
          tmScoreB: result.tmScoreB,
          rmsd: result.rmsd,
          alignedLength: result.alignedLength,
        });
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(`Superposition failed: ${msg}`);
          setHasSuperpositionLoaded(false);
          console.error('StructureSuperpositionPanel error:', err);
        }
      } finally {
        objectUrls.forEach(u => URL.revokeObjectURL(u));
        if (!cancelled) setIsLoading(false);
      }
    };

    runSuperposition();

    return () => { cancelled = true; };
  }, [
    isPluginReady,
    structureA?.uniprotId,
    structureA?.pdbId,
    structureA?.fileContent,
    structureB?.uniprotId,
    structureB?.pdbId,
    structureB?.fileContent,
    // useSecondaryColors intentionally excluded - color changes are applied in place by the
    // effect below, without re-running TM-align and reloading both structures from scratch.
  ]);

  useEffect(() => {
    if (!isPluginReady || !hasSuperpositionLoaded) return;
    applySafetyWindowHighlights();
  }, [
    isPluginReady,
    hasSuperpositionLoaded,
    showSafetyWindows,
    highlightedWindowsA,
    highlightedWindowsB,
    transformRevision,
  ]);

  // A new alignment has its own windows, so a selection does not carry over to it.
  useEffect(() => {
    setSelectedWindowNumber(null);
  }, [alignments]);

  // Only structure B's transform changes, so switching view reloads nothing and keeps the colors.
  const windowTransform = windowFit?.bTransform ?? null;
  useEffect(() => {
    const plugin = pluginRef.current;
    const alignedRef = structRefsRef.current.alignedB;
    const transform = windowTransform ?? tmAlignTransformRef.current;
    if (!isPluginReady || !hasSuperpositionLoaded || !plugin || !alignedRef || !transform) return;

    let cancelled = false;
    const update = plugin.state.data.build().to(alignedRef).update({
      transform: { name: 'matrix', params: { data: transform, transpose: false } },
    });
    plugin.runTask(plugin.state.data.updateTree(update))
      .then(() => PluginCommands.Camera.Reset(plugin, {}))
      .then(() => {
        if (!cancelled) setTransformRevision(revision => revision + 1);
      })
      .catch((err: unknown) => {
        console.warn('Could not update the superposition:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [isPluginReady, hasSuperpositionLoaded, windowTransform]);

  // Apply the color scheme in place when either color toggle changes, without re-running
  // TM-align or reloading the structures. "Color by pLDDT" overrides "Color by Chain" when both
  // are on, matching the same override relationship used on the plain structure panels.
  useEffect(() => {
    if (!isPluginReady || !hasSuperpositionLoaded || !pluginRef.current) return;
    const plugin = pluginRef.current;

    const applyTheme = (which: 'a' | 'b', color: Color, domains: ProteinDomain[]) => {
      const repr = reprRefsRef.current[which];
      const structureRef = structRefsRef.current[which];
      const structureObj = structureRef ? plugin.state.data.cells.get(structureRef)?.obj?.data : null;
      if (!repr || !structureObj) return;

      const colorTheme = useDomainColors
        ? createStructureColorThemeParams(plugin, structureObj, 'cartoon', 'domain-annotation', { domains })
        : usePlddtColors
          ? createStructureColorThemeParams(plugin, structureObj, 'cartoon', 'af-confidence', {})
          : useSecondaryColors
            ? createStructureColorThemeParams(plugin, structureObj, 'cartoon', 'uniform', { value: color })
            : createStructureColorThemeParams(plugin, structureObj, 'cartoon', 'uniform', {});

      const update = plugin.state.data.build()
        .to(repr)
        .update(StateTransforms.Representation.StructureRepresentation3D, (old: any) => ({ ...old, colorTheme }));
      plugin.runTask(plugin.state.data.updateTree(update)).catch((err: unknown) => {
        console.warn(`Could not update structure ${which}'s color theme:`, err);
      });
    };
    applyTheme('a', COLOR_A, proteinDomainsA ?? []);
    applyTheme('b', COLOR_B, proteinDomainsB ?? []);
  }, [isPluginReady, hasSuperpositionLoaded, useSecondaryColors, usePlddtColors, useDomainColors, proteinDomainsA, proteinDomainsB]);

  // Downloads the current (possibly TM-align-transformed) coordinates for a loaded structure as
  // mmCIF - the only format Mol* can re-serialize from its live in-memory state.
  const handleDownloadMmcif = (which: 'a' | 'b' | 'alignedB') => {
    const plugin = pluginRef.current;
    const ref = structRefsRef.current[which];
    if (!plugin || !ref) return;
    const structure = plugin.state.data.cells.get(ref)?.obj?.data;
    if (!structure) return;
    const label = which === 'a' ? sequences.descriptorA : sequences.descriptorB;
    const suffix = which === 'alignedB' ? '_aligned' : '';
    downloadStructureAsMmcif(structure, sanitizeForFilename(label), `${sanitizeForFilename(label)}${suffix}.cif`);
  };

  if (!shouldShow) return null;

  return (
    <div className="structure-superposition-panel">
      <div className="superposition-header">
        <h2 className="structures-title">TM-align Structure Superposition</h2>
        <div className="superposition-controls">
          <button
            type="button"
            className={`structure-panel-toggle ${useSecondaryColors ? 'active' : ''}`}
            onClick={() => setUseSecondaryColors(prev => !prev)}
            title={useSecondaryColors ? 'Switch to basic gray coloring' : 'Switch to color by chain'}
          >
            Color by Chain: {useSecondaryColors ? 'On' : 'Off'}
          </button>
          <button
            type="button"
            className={`structure-panel-toggle ${usePlddtColors ? 'active' : ''}`}
            onClick={() => {
              setUsePlddtColors(prev => !prev);
              setUseDomainColors(false);
            }}
            title={usePlddtColors ? 'Switch off pLDDT coloring' : 'Color both structures by AlphaFold pLDDT confidence'}
          >
            Color by pLDDT: {usePlddtColors ? 'On' : 'Off'}
          </button>
          {hasAnyDomains && (
            <button
              type="button"
              className={`structure-panel-toggle ${useDomainColors ? 'active' : ''}`}
              onClick={() => {
                setUseDomainColors(prev => !prev);
                setUsePlddtColors(false);
              }}
              title={useDomainColors
                ? 'Switch off domain coloring'
                : 'Color both structures by their UniProt domains - a domain shared by both proteins gets the same color, so you can see whether it superposes'}
            >
              Colour by domain: {useDomainColors ? 'On' : 'Off'}
            </button>
          )}
          <button
            type="button"
            className={`structure-panel-toggle ${showSafetyWindows ? 'active' : ''}`}
            onClick={() => setShowSafetyWindows(prev => !prev)}
            title={showSafetyWindows ? 'Hide safety window highlighting' : 'Show safety window highlighting'}
          >
            Safety Windows (merged): {showSafetyWindows ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {hasSuperpositionLoaded && (
        <div className="superposition-downloads">
          {structureDataA?.rawContent && structureDataA.format === 'pdb' && (
            <button
              type="button"
              className="structure-panel-toggle"
              onClick={() => downloadRawStructureFile(structureDataA.rawContent!, 'pdb', `${sanitizeForFilename(sequences.descriptorA)}.pdb`)}
              title="Download the original (pre-alignment) Sequence A structure as a PDB file"
            >
              Download A: PDB
            </button>
          )}
          <button
            type="button"
            className="structure-panel-toggle"
            onClick={() => handleDownloadMmcif('a')}
            title="Download the original (pre-alignment) Sequence A structure as an mmCIF file"
          >
            Download A: mmCIF
          </button>
          {structureDataB?.rawContent && structureDataB.format === 'pdb' && (
            <button
              type="button"
              className="structure-panel-toggle"
              onClick={() => downloadRawStructureFile(structureDataB.rawContent!, 'pdb', `${sanitizeForFilename(sequences.descriptorB)}.pdb`)}
              title="Download the original (pre-alignment) Sequence B structure as a PDB file"
            >
              Download B: PDB
            </button>
          )}
          <button
            type="button"
            className="structure-panel-toggle"
            onClick={() => handleDownloadMmcif('b')}
            title="Download the original (pre-alignment) Sequence B structure as an mmCIF file"
          >
            Download B: mmCIF
          </button>
          <button
            type="button"
            className="structure-panel-toggle"
            onClick={() => handleDownloadMmcif('alignedB')}
            title="Download Sequence B's TM-align-superposed (aligned to A) structure as an mmCIF file - Mol* cannot re-export transformed coordinates as PDB, only mmCIF"
          >
            Download Alignment: mmCIF
          </button>
        </div>
      )}
      <p className="structures-subtitle">
        {selectedWindow
          ? `Structure B fitted to A on the residue pairs of safety window ${selectedWindow.number} only, so other parts of the proteins can sit far apart.`
          : 'Structural superposition computed using TM-align.'}{' '}
        <span className="legend-dot legend-dot--a" />{' '}
        {sequences.descriptorA || 'Sequence A'} (Sequence A){' '}
        <span className="legend-dot legend-dot--b" />{' '}
        {sequences.descriptorB || 'Sequence B'} (Sequence B)
      </p>

      {tmStats && (
        <div className="tm-stats">
          <div className="tm-stat-item">
            <span className="tm-stat-label">TM-score (ref A)</span>
            <span className="tm-stat-value">{tmStats.tmScoreA.toFixed(4)}</span>
          </div>
          <div className="tm-stat-item">
            <span className="tm-stat-label">TM-score (ref B)</span>
            <span className="tm-stat-value">{tmStats.tmScoreB.toFixed(4)}</span>
          </div>
          <div className="tm-stat-item">
            <span className="tm-stat-label">RMSD</span>
            <span className="tm-stat-value">{tmStats.rmsd.toFixed(3)} Å</span>
          </div>
          <div className="tm-stat-item">
            <span className="tm-stat-label">Aligned residues</span>
            <span className="tm-stat-value">{tmStats.alignedLength}</span>
          </div>
          {selectedWindow && windowFit && (
            <>
              <div className="tm-stat-item">
                <span className="tm-stat-label">Window RMSD</span>
                <span className="tm-stat-value">{windowFit.rmsd.toFixed(3)} Å</span>
              </div>
              <div className="tm-stat-item">
                <span className="tm-stat-label">Window residue pairs</span>
                <span className="tm-stat-value">{selectedWindow.pairs.length}</span>
              </div>
            </>
          )}
        </div>
      )}

      {isLoading && (
        <div className="superposition-loading">
          <div className="superposition-spinner" />
          <p>Computing TM-align superposition…</p>
        </div>
      )}

      {error && (
        <div className="superposition-error">
          <p>{error}</p>
        </div>
      )}

      {submittedAlignment && hasSuperpositionLoaded && (
        <div className="superposition-architecture">
          <div>
            <h3 className="superposition-architecture-title">Sequence A</h3>
            <ProteinArchitecture
              label="A"
              tone="light"
              sequenceLength={submittedAlignment.fullLengthA}
              uniprotId={structureA?.uniprotId}
              shadedRange={submittedAlignment.regionA}
              windowRanges={markedRangesA}
            />
          </div>
          <div>
            <h3 className="superposition-architecture-title">Sequence B</h3>
            <ProteinArchitecture
              label="B"
              tone="light"
              sequenceLength={submittedAlignment.fullLengthB}
              uniprotId={structureB?.uniprotId}
              shadedRange={submittedAlignment.regionB}
              windowRanges={markedRangesB}
            />
          </div>
        </div>
      )}

      {hasSuperpositionLoaded && superpositionWindows.length > 0 && (
        <div className="superposition-window-selector">
          <span className="superposition-window-label">Superpose on:</span>
          <button
            type="button"
            className={`structure-panel-toggle window-mode-button ${!selectedWindow ? 'active' : ''}`}
            onClick={() => setSelectedWindowNumber(null)}
          >
            Global
          </button>
          <button
            type="button"
            className={`structure-panel-toggle window-mode-button ${selectedWindow ? 'active' : ''}`}
            onClick={() => setSelectedWindowNumber(usableWindows[0].number)}
            disabled={usableWindows.length === 0}
          >
            Safety window
          </button>
          {selectedWindow && (
            <>
              <button
                type="button"
                className="nav-button"
                onClick={() => stepWindow(-1)}
                aria-label="Previous safety window"
                disabled={usableWindows.length < 2}
              >
                <span className="nav-arrow">‹</span>
              </button>
              <span className="window-current-box superposition-window-current">
                Window {selectedWindow.number} of {superpositionWindows.length}
              </span>
              <button
                type="button"
                className="nav-button"
                onClick={() => stepWindow(1)}
                aria-label="Next safety window"
                disabled={usableWindows.length < 2}
              >
                <span className="nav-arrow">›</span>
              </button>
            </>
          )}
          {usableWindows.length < superpositionWindows.length && (
            <span className="superposition-window-note">
              {superpositionWindows.length - usableWindows.length} of {superpositionWindows.length} windows unavailable: {superpositionWindows.find(window => window.disabledReason)?.disabledReason}.
            </span>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className="superposition-viewer"
      />
    </div>
  );
};

export default StructureSuperpositionPanel;
