// Custom Mol* color theme that paints each residue by the UniProt domain it falls in, using
// the exact domain list and palette already driving the "Domain" annotation strip on the
// alignment graph axes (hooks/useProteinDomains + utils/colors/domainColorScale). A domain
// therefore carries the same color in the 2D strip and in the 3D structure, and the same named
// domain matches across both sequences.
//
// Unlike the pLDDT theme next door, this one needs per-structure data, so the domain list is
// passed in as a theme parameter (PD.Value, hidden from Mol*'s own UI) rather than read off the
// model. Residue identity comes from auth_seq_id, which for AlphaFold DB models is the 1..N
// UniProt sequence numbering the domain ranges are expressed in - the same assumption
// utils/structure/plddtParser.ts already relies on.
import { Color } from 'molstar/lib/mol-util/color';
import { StructureElement, StructureProperties, Unit, Bond } from 'molstar/lib/mol-model/structure';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { ColorThemeCategory } from 'molstar/lib/mol-theme/color/categories';
import { TableLegend } from 'molstar/lib/mol-util/legend';
import type { ColorTheme } from 'molstar/lib/mol-theme/color';
import type { ThemeDataContext } from 'molstar/lib/mol-theme/theme';
import { getDomainColor } from '../colors/domainColorScale';
import type { ProteinDomain } from '../../hooks/useProteinDomains';

/**
 * Residues outside every annotated domain - muted so the annotated domains read as the signal,
 * but kept dark enough to stay visible against the viewer's white background (a lighter grey
 * washed the unannotated backbone out almost entirely).
 */
const UnannotatedColor = Color(0xa8a8a8);
const DefaultColor = Color(0xaaaaaa);

export const DomainColorThemeParams = {
  domains: PD.Value<ProteinDomain[]>([], { isHidden: true }),
};
export type DomainColorThemeParamValues = PD.Values<typeof DomainColorThemeParams>;

export function getDomainColorThemeParams(_ctx: ThemeDataContext) {
  return DomainColorThemeParams;
}

/**
 * Flattens the domain list into a residue-number -> color lookup once per theme instance, so
 * the per-element color() call below stays a single map lookup rather than a scan over every
 * domain. Later domains win on overlap, matching the strip's own last-drawn-wins behavior.
 */
function buildResidueColorMap(domains: ProteinDomain[]): Map<number, Color> {
  const map = new Map<number, Color>();
  for (const domain of domains) {
    const color = Color(parseInt(getDomainColor(domain.name).slice(1), 16));
    for (let residue = domain.start; residue <= domain.end; residue++) {
      map.set(residue, color);
    }
  }
  return map;
}

export function DomainColorTheme(
  _ctx: ThemeDataContext,
  props: DomainColorThemeParamValues
): ColorTheme<typeof DomainColorThemeParams> {
  const domains = props.domains ?? [];
  const residueColors = buildResidueColorMap(domains);

  const getColor = (location: StructureElement.Location): Color => {
    if (!Unit.isAtomic(location.unit)) return DefaultColor;
    const seqId = StructureProperties.residue.auth_seq_id(location);
    return residueColors.get(seqId) ?? UnannotatedColor;
  };

  const color = (location: unknown): Color => {
    if (StructureElement.Location.is(location)) {
      return getColor(location);
    } else if (Bond.isLocation(location)) {
      return getColor(
        StructureElement.Location.create(
          location.aStructure ?? undefined,
          location.aUnit,
          location.aUnit.elements[location.aIndex]
        )
      );
    }
    return DefaultColor;
  };

  // One legend row per distinct domain name, so overlapping/repeated domains aren't listed twice.
  const legendEntries: [string, Color][] = [];
  const seen = new Set<string>();
  for (const domain of domains) {
    if (seen.has(domain.name)) continue;
    seen.add(domain.name);
    legendEntries.push([domain.name, Color(parseInt(getDomainColor(domain.name).slice(1), 16))]);
  }
  if (legendEntries.length > 0) {
    legendEntries.push(['No annotated domain', UnannotatedColor]);
  }

  return {
    factory: DomainColorTheme,
    granularity: 'group',
    // Domains are discrete ranges with hard boundaries; smoothing would blur one domain's color
    // into its neighbour along the cartoon spline and misrepresent where a domain actually ends.
    preferSmoothing: false,
    color,
    props,
    description: 'Colors residues by their UniProt domain annotation, matching the domain strip on the alignment graph axes.',
    legend: legendEntries.length > 0 ? TableLegend(legendEntries) : undefined,
  };
}

export const DomainColorThemeProvider = {
  name: 'domain-annotation',
  label: 'UniProt Domain',
  category: ColorThemeCategory.Residue,
  factory: DomainColorTheme,
  getParams: getDomainColorThemeParams,
  defaultValues: PD.getDefaultValues(DomainColorThemeParams),
  isApplicable: (ctx: ThemeDataContext) => !!ctx.structure,
};
