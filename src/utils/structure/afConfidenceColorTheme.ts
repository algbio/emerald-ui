// Custom Mol* color theme reproducing the AlphaFold Database's exact per-residue pLDDT
// confidence coloring (same 4 bins/hex values as utils/colors/confidenceColorScale.ts, used for
// the sequence-axis confidence strip), reading the score straight from each residue's B-factor
// column - the same column AlphaFold DB model files store pLDDT in.
//
// Mol*'s own built-in 'uncertainty' theme (registered as ColorTheme.BuiltIn.uncertainty) also
// reads B-factor, but renders it as a continuous red-white-blue gradient over [0,100] - it
// doesn't reproduce AlphaFold's actual discrete 4-color scale or thresholds. Mol* does ship an
// exact-match theme ('plddt-confidence'), but only inside the model-archive/quality-assessment
// extension, which requires registering a whole PluginBehavior and attaching custom structure
// properties just to reach the same B-factor fallback this simpler theme reads directly - not
// worth the extra moving parts for what's fundamentally a 4-line color lookup.
import { Color } from 'molstar/lib/mol-util/color';
import { StructureElement, Unit, Bond } from 'molstar/lib/mol-model/structure';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { ColorThemeCategory } from 'molstar/lib/mol-theme/color/categories';
import { TableLegend } from 'molstar/lib/mol-util/legend';
import type { ColorTheme } from 'molstar/lib/mol-theme/color';
import type { ThemeDataContext } from 'molstar/lib/mol-theme/theme';

const DefaultColor = Color(0xaaaaaa);

const ConfidenceColors = {
  'Very low (pLDDT < 50)': Color(0xff7d45),
  'Low (70 > pLDDT ≥ 50)': Color(0xffdb13),
  'Confident (90 > pLDDT ≥ 70)': Color(0x65cbf3),
  'Very high (pLDDT ≥ 90)': Color(0x0053d6),
};
const ConfidenceColorLegend = TableLegend(Object.entries(ConfidenceColors));

function getAFConfidenceColor(score: number): Color {
  if (score < 50) return ConfidenceColors['Very low (pLDDT < 50)'];
  if (score < 70) return ConfidenceColors['Low (70 > pLDDT ≥ 50)'];
  if (score < 90) return ConfidenceColors['Confident (90 > pLDDT ≥ 70)'];
  return ConfidenceColors['Very high (pLDDT ≥ 90)'];
}

export const AFConfidenceColorThemeParams = {};
export function getAFConfidenceColorThemeParams(_ctx: ThemeDataContext) {
  return AFConfidenceColorThemeParams;
}

export function AFConfidenceColorTheme(_ctx: ThemeDataContext, props: PD.Values<typeof AFConfidenceColorThemeParams>): ColorTheme<typeof AFConfidenceColorThemeParams> {
  const getColor = (location: StructureElement.Location): Color => {
    const { unit, element } = location;
    if (!Unit.isAtomic(unit)) return DefaultColor;
    const score = unit.model.atomicConformation.B_iso_or_equiv.value(element);
    if (typeof score !== 'number' || Number.isNaN(score)) return DefaultColor;
    return getAFConfidenceColor(score);
  };

  const color = (location: unknown): Color => {
    if (StructureElement.Location.is(location)) {
      return getColor(location);
    } else if (Bond.isLocation(location)) {
      return getColor(StructureElement.Location.create(location.aStructure ?? undefined, location.aUnit, location.aUnit.elements[location.aIndex]));
    }
    return DefaultColor;
  };

  return {
    factory: AFConfidenceColorTheme,
    granularity: 'group',
    preferSmoothing: true,
    color,
    props,
    description: 'Colors residues by pLDDT confidence, using the AlphaFold Database\'s own color scale (read from the B-factor column).',
    legend: ConfidenceColorLegend,
  };
}

export const AFConfidenceColorThemeProvider = {
  name: 'af-confidence',
  label: 'AlphaFold pLDDT',
  category: ColorThemeCategory.Validation,
  factory: AFConfidenceColorTheme,
  getParams: getAFConfidenceColorThemeParams,
  defaultValues: PD.getDefaultValues(AFConfidenceColorThemeParams),
  isApplicable: (ctx: ThemeDataContext) => !!ctx.structure && ctx.structure.models.some(m => m.atomicConformation.B_iso_or_equiv.isDefined),
};
