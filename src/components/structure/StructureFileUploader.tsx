import React, { useRef, useState } from 'react';
import { parseStructureFile } from '../../utils/structure/pdbParser';
import type { StructureData } from '../../utils/structure/pdbParser';
import './StructureFileUploader.css';

interface StructureFileUploaderProps {
  onStructureSelect: (structureData: StructureData) => void;
  label: string;
  disabled?: boolean;
}

const StructureFileUploader: React.FC<StructureFileUploaderProps> = ({ 
  onStructureSelect, 
  label, 
  disabled = false 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [structures, setStructures] = useState<StructureData[]>([]);
  const [showChainSelector, setShowChainSelector] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setStructures([]);
    setShowChainSelector(false);

    try {
      const parsedStructures = await parseStructureFile(file);
      setStructures(parsedStructures);

      if (parsedStructures.length === 1) {
        // Only one chain, select it automatically
        onStructureSelect(parsedStructures[0]);
      } else {
        // Multiple chains, show selector
        setShowChainSelector(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse structure file');
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleChainSelect = (structure: StructureData) => {
    onStructureSelect(structure);
    setShowChainSelector(false);
    setStructures([]);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="structure-file-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdb,.cif"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled}
      />
      
      <button
        type="button"
        onClick={handleUploadClick}
        disabled={disabled || isLoading}
        className="upload-button"
      >
        {isLoading ? 'Parsing...' : `Upload ${label}`}
      </button>

      {error && (
        <div className="error-text structure-error">
          {error}
        </div>
      )}

      {showChainSelector && structures.length > 0 && (
        <div className="chain-selector">
          <h4>Select Chain:</h4>
          <div className="chain-list">
            {structures.map((structure, index) => (
              <button
                key={index}
                onClick={() => handleChainSelect(structure)}
                className="chain-option"
              >
                <div className="chain-info">
                  <strong>Chain {structure.chainId}</strong>
                  <span className="sequence-length">
                    {structure.sequence.length} residues
                  </span>
                  {structure.pdbId && (
                    <span className="pdb-id">PDB: {structure.pdbId.toUpperCase()}</span>
                  )}
                </div>
                <div className="sequence-preview">
                  {structure.sequence.length > 50 
                    ? `${structure.sequence.substring(0, 50)}...` 
                    : structure.sequence}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StructureFileUploader;
