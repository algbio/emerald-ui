declare namespace EmeraldModuleType {
  /**
   * Available predefined cost matrices
   */
  enum CostMatrixType {
    BLOSUM62 = 0,
    PAM250 = 1,
    IDENTITY = 2
  }

  interface EmeraldModuleInstance {
    /**
     * Generate alignment JSON from two sequences
     * @param refSeq Reference sequence string
     * @param refDesc Reference description
     * @param memSeq Member sequence string
     * @param memDesc Member description
     * @param alpha Alpha parameter (default: 0.75)
     * @param delta Delta parameter (default: 0)
     * @param gapCost Gap cost parameter (default: -1)
     * @param startGap Start gap parameter (default: -11)
     * @returns JSON string with alignment results
     */
    generateAlignmentJson(
      refSeq: string, 
      refDesc: string,
      memSeq: string, 
      memDesc: string,
      alpha?: number,
      delta?: number,
      gapCost?: number,
      startGap?: number
    ): string;
    
    /**
     * Generate alignment using a predefined cost matrix
     */
    generateAlignmentJsonWithMatrix(
      refSeq: string, 
      refDesc: string,
      memSeq: string, 
      memDesc: string,
      matrixType: CostMatrixType,
      alpha?: number,
      delta?: number,
      gapCost?: number,
      startGap?: number
    ): string;
    
    /**
     * Generate alignment using a custom cost matrix
     */
    generateAlignmentJsonWithCustomMatrix(
      refSeq: string, 
      refDesc: string,
      memSeq: string, 
      memDesc: string,
      customMatrix: number[][],  // 21x21 matrix
      alpha?: number,
      delta?: number,
      gapCost?: number,
      startGap?: number
    ): string;
    
    /**
     * Cost matrix types
     */
    CostMatrixType: {
      BLOSUM62: number,
      PAM250: number, 
      IDENTITY: number
    };
    
    /**
     * Generate alignment to a virtual file and return the filename
     * @param refSeq Reference sequence string
     * @param refDesc Reference description
     * @param memSeq Member sequence string
     * @param memDesc Member description
     * @param alpha Alpha parameter (default: 0.75)
     * @param delta Delta parameter (default: 0)
     * @param gapCost Gap cost parameter (default: -1)
     * @param startGap Start gap parameter (default: -11)
     * @returns Path to the generated JSON file in the virtual filesystem
     */
    generateAlignmentToFile(
      refSeq: string, 
      refDesc: string,
      memSeq: string, 
      memDesc: string,
      alpha?: number,
      delta?: number,
      gapCost?: number,
      startGap?: number
    ): string;
    
    /**
     * File System API
     */
    FS: {
      readFile(path: string, opts?: { encoding?: string; flags?: string }): string | Uint8Array;
      writeFile(path: string, data: string | ArrayBufferView, opts?: { flags?: string }): void;
      mkdir(path: string, mode?: number): void;
      rmdir(path: string): void;
      unlink(path: string): void;
      stat(path: string): {
        dev: number;
        ino: number;
        mode: number;
        nlink: number;
        uid: number;
        gid: number;
        rdev: number;
        size: number;
        atime: Date;
        mtime: Date;
        ctime: Date;
        blksize: number;
        blocks: number;
      };
      isDir(mode: number): boolean;
      isFile(mode: number): boolean;
    };
    
    /**
     * Call the main function with command-line arguments
     */
    callMain(args: string[]): number;
  }

  function factory(): Promise<EmeraldModuleInstance>;
}

declare const EmeraldModule: typeof EmeraldModuleType.factory;
export default EmeraldModule;