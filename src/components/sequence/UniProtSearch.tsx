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
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [resultsPerPage] = useState(5);
  
  const { dispatch } = useSequence();
  const { notifySuccess, notifyError, notifyInfo } = useFeedbackNotifications();
  
  const searchUniProt = async () => {
    console.log('searchUniProt called with term:', searchTerm);
    
    if (!searchTerm.trim()) {
      console.log('Empty search term, showing error');
      notifyError('Invalid Search', 'Please enter a search term');
      return;
    }
    
    console.log('Starting search...');
    setIsSearching(true);
    setError(null);
    setHasSearched(true);
    notifyInfo('Searching UniProt', `Searching for "${searchTerm}"...`);
    
    try {
      // Update the fetch URL to include cross-references
      const url = `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(searchTerm)}&fields=accession,id,protein_name,organism_name,sequence,xref_pdb&format=json&size=25`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log('Response not ok:', response.status, response.statusText);
        throw new Error(`UniProt API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received data from UniProt:', data);
      
      // Update the mapping to include PDB IDs
      const mappedResults = data.results.map((item: any) => ({
        accession: item.primaryAccession || 'Unknown',
        id: item.uniProtkbId || item.primaryAccession || 'Unknown',
        proteinName: item.proteinDescription?.recommendedName?.fullName?.value || 'Unknown protein',
        organismName: item.organism?.scientificName || 'Unknown organism',
        sequence: item.sequence?.value || '',
        pdbIds: item.uniProtKBCrossReferences
          ?.filter((xref: any) => xref.database === 'PDB')
          ?.map((xref: any) => xref.id) || []
      })).filter((result: UniProtResult) => result.sequence.length > 0); // Filter out results without sequences
      
      console.log('Mapped results:', mappedResults);
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
    // Use the UniProt ID and repeat protein name to match sequence list format:
    // EDC4_HUMAN | Enhancer of mRNA-decapping protein 4 | Enhancer of mRNA-decapping protein 4 | Homo sapiens
    const descriptor = `${result.id} | ${result.proteinName} | ${result.proteinName} | ${result.organismName}`;
    
    console.log('Load A button clicked! Loading to Sequence A:', {
      accession: result.accession,
      id: result.id,
      descriptor,
      sequenceLength: result.sequence.length
    });
    
    console.log('UniProt search result fields:', {
      'result.accession': result.accession,
      'result.id': result.id,
      'result.proteinName': result.proteinName,
      'result.organismName': result.organismName
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
    // Use the UniProt ID and repeat protein name to match sequence list format:
    // EDC4_HUMAN | Enhancer of mRNA-decapping protein 4 | Enhancer of mRNA-decapping protein 4 | Homo sapiens  
    const descriptor = `${result.id} | ${result.proteinName} | ${result.proteinName} | ${result.organismName}`;
    
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
  
  console.log('Pagination state:', { 
    totalResults: results.length, 
    currentPage, 
    totalPages, 
    startIndex, 
    endIndex, 
    currentResults: currentResults.length 
  });

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };
  
  return (
    <div className="uniprot-search">
      <div className="search-info">
        <p className="search-description">
          Search the UniProt database for high-quality, annotated protein sequences. 
          You can search by protein names, gene names, UniProt accession numbers, or organism names.
        </p>
        <div className="search-examples">
          <strong>Example searches:</strong>
          <ul>
            <li><code>P53_HUMAN</code> - UniProt ID</li>
            <li><code>insulin</code> - Protein name</li>
            <li><code>BRCA1</code> - Gene name</li>
            <li><code>hemoglobin homo sapiens</code> - Protein + organism</li>
          </ul>
        </div>
      </div>
      
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
        {error && <div className="error-message">{error}</div>}
      </div>
      
      {results.length === 0 && !isSearching && hasSearched && (
        <div className="no-results">No results found. Try a different search term.</div>
      )}
      
      {results.length > 0 && currentResults.length === 0 && (
        <div className="no-results">No results to display on this page.</div>
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
            onSelectA={seq => {
              // Extract the original UniProt ID from the accession field, 
              // since seq.id might be the compound display string
              const originalId = seq.accession || seq.id;
              loadToSequenceA({
                accession: seq.accession || '',
                id: originalId,  // Use the actual UniProt ID, not the display string
                proteinName: seq.proteinName || '',
                organismName: seq.organismName || '',
                sequence: seq.sequence,
                pdbIds: []
              });
            }}
            onSelectB={seq => {
              // Extract the original UniProt ID from the accession field, 
              // since seq.id might be the compound display string
              const originalId = seq.accession || seq.id;
              loadToSequenceB({
                accession: seq.accession || '',
                id: originalId,  // Use the actual UniProt ID, not the display string
                proteinName: seq.proteinName || '',
                organismName: seq.organismName || '',
                sequence: seq.sequence,
                pdbIds: []
              });
            }}
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