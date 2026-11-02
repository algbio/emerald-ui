import React, { useEffect, useRef, useState } from 'react';
import ProteinArchitecture from './ProteinArchitecture';
import {
  moveRange,
  normalizeRegion,
  parseRegionInput,
  resizeRange,
} from '../../utils/sequence/regionUtils';
import type { ArchitectureSegment, ResidueRange } from '../../utils/sequence/regionUtils';
import './RegionSelector.css';

interface RegionSelectorProps {
  /** Used in labels and element ids, e.g. "A". */
  label: string;
  /** Length of the cleaned sequence, which is what residue numbers refer to. */
  sequenceLength: number;
  uniprotId: string | null;
  region: ResidueRange | null;
  onRegionChange: (region: ResidueRange | null) => void;
}

type DragMode = 'move' | 'start' | 'end';

const RegionSelector: React.FC<RegionSelectorProps> = ({ label, sequenceLength, uniprotId, region, onRegionChange }) => {
  const [startText, setStartText] = useState('');
  const [endText, setEndText] = useState('');
  const [error, setError] = useState<string | null>(null);
  // The range while the window is being dragged. It is only applied on release, because applying
  // a region clears any existing results.
  const [draft, setDraft] = useState<ResidueRange | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ mode: DragMode; pointerX: number; range: ResidueRange; latest: ResidueRange | null } | null>(null);

  const wholeProtein = { start: 1, end: sequenceLength };
  const appliedRange = region ?? wholeProtein;
  const shownRange = draft ?? appliedRange;

  // The context can reset the region (for example when a new protein is loaded).
  useEffect(() => {
    setStartText(region ? String(region.start) : '');
    setEndText(region ? String(region.end) : '');
    setError(null);
  }, [region]);

  const applyRegion = (next: ResidueRange | null) => {
    setError(null);
    if (next?.start !== region?.start || next?.end !== region?.end) {
      onRegionChange(next);
    }
  };

  // Applied on Enter or when focus leaves both fields, rather than per keystroke: changing the
  // region clears any existing results, and typing "229" would otherwise pass through the ranges
  // starting at 2 and 22. Moving from start to end must not apply either, because the applied
  // range fills in the end field while the user is about to type in it.
  const applyInput = () => {
    const result = parseRegionInput(startText, endText, sequenceLength);
    if (result.error) {
      setError(result.error);
      return;
    }
    applyRegion(result.region);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') applyInput();
  };

  const handleWholeProtein = () => {
    setStartText('');
    setEndText('');
    applyRegion(null);
  };

  const handleSegmentClick = (e: React.MouseEvent, segment: ArchitectureSegment) => {
    const selection = e.shiftKey && region
      ? { start: Math.min(region.start, segment.start), end: Math.max(region.end, segment.end) }
      : { start: segment.start, end: segment.end };
    applyRegion(normalizeRegion(selection, sequenceLength));
  };

  const startDrag = (e: React.PointerEvent<HTMLElement>, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { mode, pointerX: e.clientX, range: appliedRange, latest: null };
  };

  const handleDragMove = (e: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    const track = trackRef.current;
    if (!drag || !track) return;
    const delta = Math.round(((e.clientX - drag.pointerX) / track.clientWidth) * sequenceLength);
    const next = drag.mode === 'move'
      ? moveRange(drag.range, delta, sequenceLength)
      : resizeRange(drag.range, drag.mode, delta, sequenceLength);
    drag.latest = next;
    setDraft(next);
    setStartText(String(next.start));
    setEndText(String(next.end));
  };

  const handleDragEnd = () => {
    if (!dragRef.current) return;
    // Read from the ref: a quick release can arrive before the last move has rendered.
    const { latest } = dragRef.current;
    dragRef.current = null;
    if (latest) {
      const next = normalizeRegion(latest, sequenceLength);
      applyRegion(next);
      if (!next) {
        setStartText('');
        setEndText('');
      }
    }
    setDraft(null);
  };

  const handleSliderKey = (e: React.KeyboardEvent<HTMLElement>, mode: DragMode) => {
    const step = e.shiftKey ? 10 : 1;
    const delta = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    if (delta === 0) return;
    e.preventDefault();
    const next = mode === 'move'
      ? moveRange(appliedRange, delta, sequenceLength)
      : resizeRange(appliedRange, mode, delta, sequenceLength);
    applyRegion(normalizeRegion(next, sequenceLength));
  };

  const leftPercent = (residue: number) => ((residue - 1) / sequenceLength) * 100;
  const widthPercent = (range: ResidueRange) => ((range.end - range.start + 1) / sequenceLength) * 100;

  const selectionSummary = region
    ? `Aligning residues ${region.start}-${region.end} of ${sequenceLength}`
    : `Aligning the whole protein (${sequenceLength} residues)`;

  return (
    <div className="region-selector">
      <h3 className="region-selector-title">Sequence {label}</h3>

      <ProteinArchitecture
        label={label}
        sequenceLength={sequenceLength}
        uniprotId={uniprotId}
        onSegmentClick={handleSegmentClick}
        selectedRange={region}
        noDomainsHint=" Use the window or residue numbers."
      />

      <div className="region-slider" ref={trackRef}>
        <div
          className="region-slider-window"
          role="slider"
          tabIndex={0}
          aria-label={`Move selected region of sequence ${label}`}
          aria-valuemin={1}
          aria-valuemax={sequenceLength}
          aria-valuenow={shownRange.start}
          aria-valuetext={`Residues ${shownRange.start} to ${shownRange.end}`}
          style={{ left: `${leftPercent(shownRange.start)}%`, width: `${widthPercent(shownRange)}%` }}
          onPointerDown={(e) => startDrag(e, 'move')}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          onKeyDown={(e) => handleSliderKey(e, 'move')}
        >
          {(['start', 'end'] as const).map(edge => (
            <div
              key={edge}
              className={`region-slider-handle region-slider-handle-${edge}`}
              role="slider"
              tabIndex={0}
              aria-label={`${edge === 'start' ? 'Start' : 'End'} residue of sequence ${label}`}
              aria-valuemin={1}
              aria-valuemax={sequenceLength}
              aria-valuenow={shownRange[edge]}
              onPointerDown={(e) => startDrag(e, edge)}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
              onKeyDown={(e) => {
                e.stopPropagation();
                handleSliderKey(e, edge);
              }}
            />
          ))}
        </div>
      </div>

      <div className="region-selector-row">
        <div
          className="region-selector-fields"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) applyInput();
          }}
        >
          <label htmlFor={`region-start-${label}`}>Start</label>
          <input
            id={`region-start-${label}`}
            type="text"
            inputMode="numeric"
            className="emerald-input region-selector-input"
            value={startText}
            placeholder="1"
            onChange={(e) => setStartText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <label htmlFor={`region-end-${label}`}>End</label>
          <input
            id={`region-end-${label}`}
            type="text"
            inputMode="numeric"
            className="emerald-input region-selector-input"
            value={endText}
            placeholder={String(sequenceLength)}
            onChange={(e) => setEndText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          type="button"
          className="region-selector-reset"
          onClick={handleWholeProtein}
          disabled={!region && !startText && !endText}
        >
          Whole protein
        </button>
      </div>
      <div className="region-selector-summary">{selectionSummary}</div>
      {error && <div className="error-text">{error} This entry has not been applied.</div>}
    </div>
  );
};

export default RegionSelector;
