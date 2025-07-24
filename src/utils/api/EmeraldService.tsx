// EmeraldService.ts

// Import the type declarations (assumes emerald.d.ts is in the same directory as emerald.js)
import EmeraldModule from '../../emerald-wasm/emerald';

export interface AlignmentResult {
  ref_desc: string;
  mem_desc: string;
  ref_seq: string;
  mem_seq: string;
  alignment: Array<{
    ref_pos: number;
    mem_pos: number;
    ref_symbol: string;
    mem_symbol: string;
    ratio: number;
    is_safe: boolean;
  }>;
  safety_windows: Array<{
    start_ref: number;
    end_ref: number;
    start_mem: number;
    end_mem: number;
    ratio: number;
  }>;
}

/**
 * Service to handle Emerald sequence alignment functionality
 */
export class EmeraldService {
  private modulePromise: Promise<typeof EmeraldModule.prototype> | null = null;

  /**
   * Initialize the Emerald WASM module
   * @returns Promise that resolves when the module is ready
   */
  public async initialize(): Promise<void> {
    if (!this.modulePromise) {
      this.modulePromise = EmeraldModule();
      await this.modulePromise; // Wait for initialization to complete
      console.log('Emerald WASM module initialized successfully');
    }
  }

  /**
   * Generate alignment between two sequences
   * 
   * @param refSeq Reference sequence
   * @param refDesc Reference description
   * @param memSeq Member sequence
   * @param memDesc Member description
   * @param alpha Alpha parameter (0.5 to 1.0, default 0.75)
   * @param delta Delta parameter (default 8)
   * @param gapCost Gap cost (default -1)
   * @param startGap Start gap cost (default -11)
   * @returns Parsed alignment result
   */
  public async generateAlignment(
    refSeq: string,
    refDesc: string,
    memSeq: string,
    memDesc: string,
    alpha = 0.75,
    delta = 8,
    gapCost = -1,
    startGap = -11
  ): Promise<AlignmentResult> {
    await this.initialize();
    
    const module = await this.modulePromise!;
    
    try {
      console.log(`Generating alignment with alpha=${alpha}, delta=${delta}, gapCost=${gapCost}, startGap=${startGap}`);
      
      let jsonResult: string;
      
      // For very large sequences, use the file-based approach
      if  (false) {//(refSeq.length > 5000 || memSeq.length > 5000) {
        // Use the file-based approach for large sequences
        const filePath = module.generateAlignmentToFile(
          refSeq, refDesc, memSeq, memDesc, alpha, delta, gapCost, startGap
        );
        
        // Read the result from the virtual filesystem
        jsonResult = module.FS.readFile(filePath, { encoding: 'utf8' });
      } else {
        // For smaller sequences, use the direct approach
        jsonResult = module.generateAlignmentJson(
          refSeq, refDesc, memSeq, memDesc, alpha, delta, gapCost, startGap
        );
      }
      
      // Parse the result and return
      return JSON.parse(jsonResult) as AlignmentResult;
    } catch (error) {
      console.error('Error generating alignment:', error);
      
      // Check for memory-related errors
      if (error instanceof Error && 
          (error.message.includes('Cannot enlarge memory') || 
           error.message.includes('Aborted'))) {
        throw new Error(
          `Memory limit exceeded: The sequences (${refSeq.length}×${memSeq.length} characters) ` +
          `are too large for your browser to process. Please try using shorter sequences.`
        );
      }
      
      throw new Error(`Failed to generate alignment: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Helper method to run the alignment with the command-line interface
   * Useful for debugging or using additional features not exposed through Embind
   */
  public async runWithCommandLine(args: string[]): Promise<number> {
    await this.initialize();
    const module = await this.modulePromise!;
    
    try {
      // Create virtual file system inputs if needed
      // e.g. module.FS.writeFile('/input.fasta', '>Seq1\nACGT');
      
      // Run the main program with arguments
      return module.callMain(args);
    } catch (error) {
      console.error('Error running Emerald with command line:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const emeraldService = new EmeraldService();