import React, { useState } from 'react';
import { useSequence } from '../../context/SequenceContext';
import { useFeedbackNotifications } from '../../hooks/useFeedbackNotifications';
import { SequenceList } from './SequenceList';
import './UniProtSearch.css';

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
  const [currentPage, setCurrentPage] = useState(0);
  const [resultsPerPage] = useState(5);
  
  const { dispatch } = useSequence();
  const { notifySuccess, notifyError, notifyInfo } = useFeedbackNotifications();
  
  const searchUniProt = async () => {
    if (!searchTerm.trim()) {
      notifyError('Invalid Search', 'Please enter a search term');
      return;
    }
    
    setIsSearching(true);
    setError(null);
    notifyInfo('Searching UniProt', `Searching for "${searchTerm}"...`);
    
    try {
      // Update the fetch URL to include cross-references
      const response = await fetch(
        `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(searchTerm)}&fields=accession,id,protein_name,organism_name,sequence,xref_pdb&format=json&size=25`
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
      setCurrentPage(0); // Reset to first page when new search is performed
      
      if (mappedResults.length === 0) {
        notifyInfo('No Results', `No proteins found for "${searchTerm}"`);
      } else {
        notifySuccess('Search Complete', `Found ${mappedResults.length} protein${mappedResults.length > 1 ? 's' : ''} for "${searchTerm}"`);
      }
      
    } catch (error) {
      console.error('Error searching UniProt:', error);
      const errorMsg = 'Failed to search UniProt. Please try again.';
      setError(errorMsg);
      notifyError('Search Failed', errorMsg);
    } finally {
      setIsSearching(false);
    }
  };
  
  const loadToSequenceA = (result: UniProtResult) => {
    const descriptor = `${result.id} | ${result.proteinName} | ${result.organismName}`;
    
    console.log('Load A button clicked! Loading to Sequence A:', {
      accession: result.accession,
      id: result.id,
      descriptor,
      sequenceLength: result.sequence.length
    });
    
    try {
      dispatch({ type: 'UPDATE_SEQUENCE_A', payload: result.sequence });
      dispatch({ type: 'UPDATE_DESCRIPTOR_A', payload: descriptor });
      dispatch({ type: 'UPDATE_ACCESSION_A', payload: result.accession });
      
      // Add this to set the structure information
      dispatch({ 
        type: 'SET_STRUCTURE_A', 
        payload: { 
          uniprotId: result.accession,
        } 
      });
      
      console.log('Successfully dispatched all actions for Sequence A');
      console.log('Dispatched structure A with UniProt ID:', result.accession);
      
      notifySuccess('Sequence A Loaded', `Loaded ${result.proteinName} (${result.sequence.length} amino acids)`);
    } catch (error) {
      console.error('Error loading sequence A:', error);
      notifyError('Load Failed', 'Failed to load sequence A');
    }
  };
  
  const loadToSequenceB = (result: UniProtResult) => {
    const descriptor = `${result.id} | ${result.proteinName} | ${result.organismName}`;
    
    console.log('Loading to Sequence B:', {
      accession: result.accession,
      id: result.id,
      descriptor,
      sequenceLength: result.sequence.length
    });
    
    try {
      dispatch({ type: 'UPDATE_SEQUENCE_B', payload: result.sequence });
      dispatch({ type: 'UPDATE_DESCRIPTOR_B', payload: descriptor });
      dispatch({ type: 'UPDATE_ACCESSION_B', payload: result.accession });
      
      // Add this to set the structure information
      dispatch({ 
        type: 'SET_STRUCTURE_B', 
        payload: { 
          uniprotId: result.accession,
        } 
      });
      
      console.log('Dispatched structure B with UniProt ID:', result.accession);
      
      notifySuccess('Sequence B Loaded', `Loaded ${result.proteinName} (${result.sequence.length} amino acids)`);
    } catch (error) {
      console.error('Error loading sequence B:', error);
      notifyError('Load Failed', 'Failed to load sequence B');
    }
  };

  // Calculate pagination values
  const totalPages = Math.ceil(results.length / resultsPerPage);
  const startIndex = currentPage * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const currentResults = results.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
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
      
      {results.length === 0 && !isSearching && searchTerm && (
        <div className="no-results">No results found. Try a different search term.</div>
      )}

      {results.length > 0 && (
        <div className="search-results-container">
          <SequenceList
            sequences={currentResults.map(result => ({
              id: `${result.id} | ${result.proteinName}`,
              description: `${result.id} | ${result.proteinName} | ${result.organismName}`,
              sequence: result.sequence,
              accession: result.accession,
              proteinName: result.proteinName,
              organismName: result.organismName,
            }))}
            useIdAsProteinName={true}
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
          />
          
          <div className="pagination-info">
            <p>
              Showing {startIndex + 1}-{Math.min(endIndex, results.length)} of {results.length} results
            </p>
            {totalPages > 1 && (
              <div className="pagination-controls">
                <button 
                  onClick={handlePreviousPage} 
                  disabled={currentPage === 0}
                  className="pagination-button"
                >
                  Previous
                </button>
                <span className="pagination-status">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button 
                  onClick={handleNextPage} 
                  disabled={currentPage === totalPages - 1}
                  className="pagination-button"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UniProtSearch;