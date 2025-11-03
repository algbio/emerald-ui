import React, { useState } from 'react';
import './ClusterUniProtSearch.css';
import { fetchUniProtSequence } from '../../utils/api/uniprotFetcher';

interface ClusterUniProtSearchProps {
  onClusterLoaded: (data: {
    representative: { name: string; sequence: string };
    members: Array<{ name: string; sequence: string }>;
  }) => void;
}

const ClusterUniProtSearch: React.FC<ClusterUniProtSearchProps> = ({ onClusterLoaded }) => {
  const [accessions, setAccessions] = useState<string>('');
  const [representativeAccession, setRepresentativeAccession] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const loadExampleData = () => {
    setRepresentativeAccession('P01308');
    setAccessions('P01308\nP01317\nP67974');
    setError('');
  };

  const handleLoadCluster = async () => {
    setError('');
    setIsLoading(true);

    try {
      // Parse accession IDs
      const accessionList = accessions
        .split(/[\n,;]/)
        .map(acc => acc.trim())
        .filter(acc => acc.length > 0);

      if (accessionList.length < 2) {
        setError('Please provide at least 2 accession IDs (1 representative + at least 1 cluster member)');
        setIsLoading(false);
        return;
      }

      if (!representativeAccession.trim()) {
        setError('Please specify the representative protein accession ID');
        setIsLoading(false);
        return;
      }

      const repAcc = representativeAccession.trim();
      if (!accessionList.includes(repAcc)) {
        setError('Representative accession must be included in the list of accessions');
        setIsLoading(false);
        return;
      }

      // Fetch all sequences
      const sequences: Array<{ name: string; sequence: string; accession: string }> = [];
      
      for (const accession of accessionList) {
        try {
          const result = await fetchUniProtSequence(accession);
          sequences.push({
            name: result.descriptor,
            sequence: result.sequence,
            accession: accession
          });
        } catch (err) {
          console.error(`Failed to fetch ${accession}:`, err);
          setError(`Failed to fetch sequence for ${accession}. Please check the accession ID.`);
          setIsLoading(false);
          return;
        }
      }

      // Separate representative and members
      const representative = sequences.find(seq => seq.accession === repAcc);
      const members = sequences.filter(seq => seq.accession !== repAcc);

      if (!representative) {
        setError('Could not find representative sequence');
        setIsLoading(false);
        return;
      }

      onClusterLoaded({
        representative: { name: representative.name, sequence: representative.sequence },
        members: members.map(m => ({ name: m.name, sequence: m.sequence }))
      });

    } catch (err) {
      setError('Error fetching sequences from UniProt');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="cluster-uniprot-search">
      <div className="instructions">
        <h4>Search UniProt for Protein Cluster</h4>
        <p>Enter UniProt accession IDs for your protein cluster (one per line or separated by commas)</p>
      </div>

      <div className="form-group">
        <label htmlFor="representative-accession">
          <strong>Representative Protein Accession:</strong>
        </label>
        <input
          id="representative-accession"
          type="text"
          value={representativeAccession}
          onChange={(e) => setRepresentativeAccession(e.target.value)}
          placeholder="e.g., P12345"
          className="accession-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="cluster-accessions">
          <strong>All Cluster Accessions (including representative):</strong>
        </label>
        <textarea
          id="cluster-accessions"
          value={accessions}
          onChange={(e) => setAccessions(e.target.value)}
          placeholder="e.g.,&#10;P12345&#10;Q67890&#10;A11111"
          rows={8}
          className="accessions-textarea"
        />
        <div className="help-text">
          Separate multiple accessions with commas or new lines
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <button
        onClick={handleLoadCluster}
        disabled={isLoading || !accessions.trim() || !representativeAccession.trim()}
        className="fetch-button"
      >
        {isLoading ? 'Fetching from UniProt...' : 'Fetch Cluster from UniProt'}
      </button>

      <div className="example-section">
        <h4>Example:</h4>
        <p>Try these insulin protein homologs (small sequences ~110 amino acids):</p>
        <div className="example-accessions">
          <strong>Representative:</strong> P01308 (Human Insulin)<br />
          <strong>Cluster:</strong> P01308, P01317 (Bovine Insulin), P67974 (Mouse Insulin)
        </div>
        <button
          onClick={loadExampleData}
          className="load-example-button"
          disabled={isLoading}
        >
          Load Example
        </button>
      </div>
    </div>
  );
};

export default ClusterUniProtSearch;
