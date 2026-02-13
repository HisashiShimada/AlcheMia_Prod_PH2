import { AnalysisResult } from "./maimlValidation";

export interface maimlSaveResult {
      fileKey : string;
      size: number;
      lastModified: string;
      contentHash: string;
      validationResult: AnalysisResult
}