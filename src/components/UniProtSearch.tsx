import React, { useState } from 'react';
import { useSequence } from '../context/SequenceContext';
import { SequenceList } from './SequenceList';

interface UniProtResult {
  accession: string;
  id: string;
  proteinName: string;
  organismName: string;
  sequence: string;
  pdbIds: string[];
}

const UniProtSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<UniProtResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const { dispatch } = useSequence();
  
  const searchUniProt = async () => {
    if (!searchTerm.trim()) {
      return;
    }
    
    setIsSearching(true);
    setError(null);
    
    try {
      // Update the fetch URL to include cross-references
      const response = await fetch(
        `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(searchTerm)}&fields=accession,id,protein_name,organism_name,sequence,xref_pdb&format=json&size=5`
      );
      
      if (!response.ok) {
        throw new Error(`UniProt API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update the mapping to include PDB IDs
      const mappedResults = data.results.map((item: any) => ({
        accession: item.primaryAccession,
        id: item.uniProtkbId,
        proteinName: item.proteinDescription?.recommendedName?.fullName?.value || 'Unknown protein',
        organismName: item.organism?.scientificName || 'Unknown organism',
        sequence: item.sequence?.value || '',
        pdbIds: item.uniProtKBCrossReferences
          ?.filter((xref: any) => xref.database === 'PDB')
          ?.map((xref: any) => xref.id) || []
      }));
      
      setResults(mappedResults);
      
    } catch (error) {
      console.error('Error searching UniProt:', error);
      setError('Failed to search UniProt. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };
  
  const loadToSequenceA = (result: UniProtResult) => {
    const descriptor = `${result.id} | ${result.proteinName} | ${result.organismName}`;
    
    console.log('Loading to Sequence A:', {
      accession: result.accession,
      id: result.id,
      descriptor,
      sequenceLength: result.sequence.length
    });
    
    dispatch({ type: 'UPDATE_SEQUENCE_A', payload: result.sequence });
    dispatch({ type: 'UPDATE_DESCRIPTOR_A', payload: descriptor });
    
    // Add this to set the structure information
    dispatch({ 
      type: 'SET_STRUCTURE_A', 
      payload: { 
        uniprotId: result.accession,
      } 
    });
    
    console.log('Dispatched structure A with UniProt ID:', result.accession);
  };
  
  const loadToSequenceB = (result: UniProtResult) => {
    const descriptor = `${result.id} | ${result.proteinName} | ${result.organismName}`;
    
    console.log('Loading to Sequence B:', {
      accession: result.accession,
      id: result.id,
      descriptor,
      sequenceLength: result.sequence.length
    });
    
    dispatch({ type: 'UPDATE_SEQUENCE_B', payload: result.sequence });
    dispatch({ type: 'UPDATE_DESCRIPTOR_B', payload: descriptor });
    
    // Add this to set the structure information
    dispatch({ 
      type: 'SET_STRUCTURE_B', 
      payload: { 
        uniprotId: result.accession,
      } 
    });
    
    console.log('Dispatched structure B with UniProt ID:', result.accession);
  };
  
  return (
    <div className="uniprot-search">
      <h2>Search UniProt Database</h2>
      
      <div className="search-box">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter protein name, gene, or accession..."
          onKeyPress={(e) => e.key === 'Enter' && searchUniProt()}
        />
        <button 
          onClick={searchUniProt} 
          disabled={isSearching || !searchTerm.trim()}
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {false && (
        <div className="uniprot-results">
          <h3>Results:</h3>
          
          <ul className="result-list">
            {results.map((result) => (
              <li key={result.accession} className="result-item">
                <div className="result-header">
                  <span className="result-id">{result.id}</span>
                  <span className="result-accession">({result.accession})</span>
                </div>
                <div className="result-protein">{result.proteinName}</div>
                <div className="result-organism">{result.organismName}</div>
                <div className="result-sequence">
                  {result.sequence.substring(0, 50)}...
                </div>
                <div className="result-actions">
                  <button onClick={() => loadToSequenceA(result)}>
                    Use as Sequence A
                  </button>
                  <button onClick={() => loadToSequenceB(result)}>
                    Use as Sequence B
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {results.length === 0 && !isSearching && searchTerm && (
        <div className="no-results">No results found. Try a different search term.</div>
      )}
      
      <SequenceList
        sequences={results.map(result => ({
          id: result.id,
          description: `${result.id} | ${result.proteinName} | ${result.organismName}`,
          sequence: result.sequence,
          accession: result.accession,
          proteinName: result.proteinName,
          organismName: result.organismName,
        }))}
        onSelectA={seq => loadToSequenceA({
          accession: seq.accession || '',
          id: seq.id,
          proteinName: seq.proteinName || '',
          organismName: seq.organismName || '',
          sequence: seq.sequence,
          pdbIds: []
        })}
        onSelectB={seq => loadToSequenceB({
          accession: seq.accession || '',
          id: seq.id,
          proteinName: seq.proteinName || '',
          organismName: seq.organismName || '',
          sequence: seq.sequence,
          pdbIds: []
        })}
        onLoadBoth={(a, b) => {
          loadToSequenceA({
            accession: a.accession || '', 
            id: a.id, 
            proteinName: a.proteinName || '', 
            organismName: a.organismName || '', 
            sequence: a.sequence,
            pdbIds: []
          });
          loadToSequenceB({
            accession: b.accession || '', 
            id: b.id, 
            proteinName: b.proteinName || '', 
            organismName: b.organismName || '', 
            sequence: b.sequence,
            pdbIds: []
          });
        }}
      />
    </div>
  );
};

export default UniProtSearch;