import React, { useMemo } from 'react';
import { useProteinDomains } from '../../hooks/useProteinDomains';
import { getDomainColor } from '../../utils/colors/domainColorScale';
import { buildArchitecture } from '../../utils/sequence/regionUtils';
import type { ArchitectureSegment, ResidueRange } from '../../utils/sequence/regionUtils';
import './ProteinArchitecture.css';

interface ProteinArchitectureProps {
  /** Used in the accessible name, e.g. "A". */
  label: string;
  /** Length of the whole protein, which is what residue numbers refer to. */
  sequenceLength: number;
  uniprotId: string | null | undefined;
  /** Panels with a white background need dark text. */
  tone?: 'dark' | 'light';
  /** Makes domains and linkers clickable. */
  onSegmentClick?: (e: React.MouseEvent, segment: ArchitectureSegment) => void;
  /** Segments inside this range are drawn as selected. */
  selectedRange?: ResidueRange | null;
  /** Shades the part of the protein that was aligned. */
  shadedRange?: ResidueRange | null;
  /** Safety windows to mark under the line. Leave undefined to hide the track. */
  windowRanges?: ResidueRange[];
  /** Appended to a message saying there are no domains to show. */
  noDomainsHint?: string;
}

// Below this share of the line a domain name cannot fit, and it is left to the list underneath.
const MIN_LABELLED_WIDTH_PERCENT = 14;

const ProteinArchitecture: React.FC<ProteinArchitectureProps> = ({
  label,
  sequenceLength,
  uniprotId,
  tone = 'dark',
  onSegmentClick,
  selectedRange,
  shadedRange,
  windowRanges,
  noDomainsHint = '',
}) => {
  const annotation = useProteinDomains(uniprotId);
  const annotationFits = annotation.sequenceLength === null || annotation.sequenceLength === sequenceLength;

  const segments = useMemo(
    () => buildArchitecture(annotation.status === 'success' && annotationFits ? annotation.domains : [], sequenceLength),
    [annotation, annotationFits, sequenceLength]
  );
  const domainSegments = useMemo(
    () => segments.filter(segment => segment.kind === 'domain').sort((a, b) => a.start - b.start),
    [segments]
  );

  const toPercent = (residues: number) => (residues / sequenceLength) * 100;
  const rangeStyle = (range: ResidueRange) => ({
    left: `${toPercent(range.start - 1)}%`,
    width: `${toPercent(range.end - range.start + 1)}%`,
  });

  const isSelected = (segment: ArchitectureSegment) =>
    !!selectedRange && segment.start >= selectedRange.start && segment.end <= selectedRange.end;

  const annotationMessage = !uniprotId
    ? `No UniProt ID for this sequence, so no domains to show.${noDomainsHint}`
    : annotation.status === 'loading'
      ? 'Loading domains from UniProt...'
      : annotation.status === 'error'
        ? `Could not load domains from UniProt.${noDomainsHint}`
        : !annotationFits
          ? `This sequence has ${sequenceLength} residues but UniProt ${uniprotId} has ${annotation.sequenceLength}, so UniProt domains and pLDDT numbering do not apply and are hidden.`
          : domainSegments.length === 0
            ? `UniProt lists no domains for ${uniprotId}.${noDomainsHint}`
            : null;

  return (
    <div className={`protein-architecture protein-architecture-${tone}`}>
      <div className="protein-architecture-track" aria-label={`Domain architecture of sequence ${label}`}>
        {shadedRange && <div className="protein-architecture-shade" style={rangeStyle(shadedRange)} />}
        <div className="protein-architecture-line" />
        {segments.map(segment => {
          const rangeText = `${segment.start}-${segment.end}`;
          const showLabel = segment.kind === 'domain' && toPercent(segment.end - segment.start + 1) >= MIN_LABELLED_WIDTH_PERCENT;
          const SegmentElement = onSegmentClick ? 'button' : 'div';
          return (
            <SegmentElement
              key={`${segment.kind}-${segment.start}-${segment.end}-${segment.name}`}
              {...(onSegmentClick
                ? {
                    type: 'button' as const,
                    'aria-label': `Select ${segment.name}, residues ${rangeText}`,
                    onClick: (e: React.MouseEvent) => onSegmentClick(e, segment),
                  }
                : {})}
              className={`region-segment region-segment-${segment.kind}${onSegmentClick ? ' clickable' : ''}${isSelected(segment) ? ' selected' : ''}`}
              style={{
                ...rangeStyle(segment),
                ...(segment.kind === 'domain' ? { backgroundColor: getDomainColor(segment.name) } : {}),
              }}
              title={`${segment.name}: residues ${rangeText}`}
            >
              {showLabel && <span className="region-segment-label">{segment.name}</span>}
            </SegmentElement>
          );
        })}
      </div>

      {windowRanges && (
        <div className="protein-architecture-windows" aria-label={`Safety windows on sequence ${label}`}>
          {windowRanges.map(range => (
            <div
              key={`${range.start}-${range.end}`}
              className="protein-architecture-window"
              style={rangeStyle(range)}
              title={`Safety window: residues ${range.start}-${range.end}`}
            />
          ))}
        </div>
      )}

      <div className="protein-architecture-scale">
        <span>1</span>
        <span>{sequenceLength}</span>
      </div>

      {domainSegments.length > 0 && (
        <ul className="region-domain-list">
          {domainSegments.map(segment => (
            <li key={`${segment.name}-${segment.start}`}>
              <span className="region-domain-swatch" style={{ backgroundColor: getDomainColor(segment.name) }} />
              {segment.name} {segment.start}-{segment.end}
            </li>
          ))}
        </ul>
      )}
      {annotationMessage && <div className="protein-architecture-note">{annotationMessage}</div>}
    </div>
  );
};

export default ProteinArchitecture;
