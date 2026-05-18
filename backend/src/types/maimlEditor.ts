import { AnalysisResult } from "./maimlValidation";

export interface maimlSaveResult {
      fileKey : string;
      size: number;
      lastModified: string;
      contentHash: string;
      validationResult?: AnalysisResult;
      /** 保存後の Document UUID（<document>/<uuid> の値） */
      documentUuid?: string;
      /** Document UUID が自動更新された場合 true（内容変更を検知してバックエンドが採番した場合のみ） */
      uuidChanged?: boolean;
}
