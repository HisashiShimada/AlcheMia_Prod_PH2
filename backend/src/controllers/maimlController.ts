/**
 * MAIML編集コントローラー
 * 
 * @description MAIML編集、解析、バリデーション等のリクエストハンドラ
 * @reference Reference版: reference/backend/routes/editRoutes.js（コントローラー機能を含む）
 * @task Phase 6 Step 2: ルート・コントローラー実装
 */

import { Request, Response } from 'express';
import * as maimlService from '../services/maimlService';
import { JwtPayload } from '../types/auth';
import { ingestSingleFileAsync } from '../services/singleFileIngestService';
import * as maimlAnalysisResultRepository from '../repositories/maimlAnalysisResultRepository';

/**
 * 共通エラーハンドラ
 */
function handleError(res: Response, error: unknown, defaultMessage: string): void {
  console.error(`[maimlController] ${defaultMessage}:`, error);
  
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  const statusCode = error instanceof Error && 'statusCode' in error 
    ? (error as any).statusCode 
    : 500;

  res.status(statusCode).json({
    success: false,
    error: {
      code: error instanceof Error && 'code' in error ? (error as any).code : 'INTERNAL_ERROR',
      message: errorMessage,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Base64デコードヘルパー
 * 
 * @param content - Base64エンコードされた文字列
 * @returns デコードされたUTF-8文字列
 */
function decodeBase64Content(content: string): string {
  try {
    let decodedContent = Buffer.from(content, 'base64').toString('utf-8');
    
    // UTF-8 BOM除去
    if (decodedContent.charCodeAt(0) === 0xFEFF) {
      decodedContent = decodedContent.substring(1);
      console.log('🔧 [maimlController] BOM removed from decoded content');
    }
    
    return decodedContent;
  } catch (error) {
    console.error('❌ [maimlController] Base64デコードエラー:', error);
    throw new Error(`Failed to decode Base64 content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * MAIMLファイル解析（基本）
 * POST /api/v1/maiml/parse
 */
export async function parse(req: Request, res: Response): Promise<void> {
  try {
    const { content } = req.body;
    const result = await maimlService.parseMaiML(content);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, 'MAIML解析エラー');
  }
}

/**
 * ペトリネット構造解析（複数method対応）
 * POST /api/v1/maiml/parse-petri-net-structure
 * 
 * @description Phase 4で実装した新しい解析API
 * - 複数methodの完全サポート
 * - method別のplace/transition/arc抽出
 * - ステレオタイプ自動抽出
 * - InstructionID紐付け
 * - 重複ID検証統合
 */
export async function parsePetriNetStructure(req: Request, res: Response): Promise<void> {
  try {
    const { content } = req.body;

    console.log('🔍 [maimlController] ペトリネット構造解析リクエスト受信');

    // Phase 4で実装した新しい解析関数を使用
    const result = await maimlService.parsePetriNetStructure(content);

    console.log('✅ [maimlController] ペトリネット構造解析完了:', {
      isMultiMethod: result.isMultiMethod,
      methodCount: result.methods?.length || 0,
      totalPlaces: result.statistics?.placeCount || 0,
      totalTransitions: result.statistics?.transitionCount || 0,
    });

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        apiVersion: '2.0', // 新API
      },
    });
  } catch (error) {
    handleError(res, error, 'ペトリネット構造解析エラー');
  }
}

/**
 * MAIMLファイル保存
 * POST /api/v1/maiml/save
 */
export async function save(req: Request, res: Response): Promise<void> {
  try {
    const { fileKey, content, archive = true } = req.body;
    const organizationId = req.user!.organizationId;

    console.log('🔍 [maimlController] MAIML保存リクエスト受信:', { fileKey, archive });
    
    // Base64デコード
    const decodedContent = decodeBase64Content(content);
    console.log('✅ [maimlController] Base64デコード完了:', {
      fileKey,
      decodedLength: decodedContent.length,
      archive,
    });

    const result = await maimlService.saveMaiML(fileKey, decodedContent, organizationId, archive);

    // セマンティック検索インデックス更新（fire-and-forget）
    // MAIMLファイル保存成功後、バックグラウンドでembeddingを生成してDBに投入する
    ingestSingleFileAsync(organizationId, fileKey);
    console.log(`🔍 [maimlController] セマンティック検索インデックス更新をキューに追加: ${fileKey}`);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, 'MAIML保存エラー');
  }
}

/**
 * MAIMLファイル読込
 * POST /api/v1/maiml/load
 */
export async function load(req: Request, res: Response): Promise<void> {
  try {
    const { filePath } = req.body;
    const organizationId = req.user!.organizationId;

    const result = await maimlService.loadMaiML(filePath, organizationId);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, 'MAIMLファイル読込エラー');
  }
}

/**
 * MAIMLファイル一覧取得
 * GET /api/v1/maiml/list
 */
export async function list(req: Request, res: Response): Promise<void> {
  try {
    const { projectId } = req.query;
    const organizationId = req.user!.organizationId;

    const result = await maimlService.listMaiMLFiles(projectId as string, organizationId);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, 'MAIMLファイル一覧取得エラー');
  }
}

/**
 * MAIMLバリデーション
 * POST /api/v1/maiml/validate
 */
export async function validate(req: Request, res: Response): Promise<void> {
  try {
    const { content, fileKey, skipAnalysisSave = true } = req.body;
    const authUser = req.user as JwtPayload;
    
    // Base64デコード
    const decodedContent = decodeBase64Content(content);
    console.log('✅ [maimlController] バリデーション用Base64デコード完了:', {
      decodedLength: decodedContent.length,
    });
    
    const result = await maimlService.validateMaiML(authUser.organizationId, decodedContent, fileKey, skipAnalysisSave);

    res.json({
      success: true,
      data : {...result},
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, 'MAIMLバリデーションエラー');
  }
}

/**
 * MAIML自動補正
 * POST /api/v1/maiml/correct
 * 
 * @note 優先度低（Phase 7で実装予定）
 */
export async function correct(req: Request, res: Response): Promise<void> {
  try {
    const { content } = req.body;
    const result = await maimlService.correctMaiML(content);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, 'MAIML自動補正エラー');
  }
}

/**
 * 編集セッション開始
 * POST /api/v1/maiml/session/start
 */
export async function startSession(req: Request, res: Response): Promise<void> {
  try {
    const sessionData = req.body;
    const result = await maimlService.startEditSession(sessionData);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, '編集セッション開始エラー');
  }
}

/**
 * 編集セッション終了
 * POST /api/v1/maiml/session/end
 */
export async function endSession(req: Request, res: Response): Promise<void> {
  try {
    const sessionData = req.body;
    const result = await maimlService.endEditSession(sessionData);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, '編集セッション終了エラー');
  }
}

/**
 * ヘルスチェック
 * GET /api/v1/maiml/health
 */
export function health(_req: Request, res: Response): void {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: [
      'maiml-parse',
      'maiml-save',
      'maiml-load',
      'maiml-list',
      'maiml-validate',
      'maiml-correct',
      'session-management',
      'draft-management', // Draft機能を追加
    ],
  });
}

// ========== Draft機能コントローラー ==========

/**
 * Draft保存
 * POST /api/v1/maiml/draft
 */
export async function saveDraft(req: Request, res: Response): Promise<void> {
  try {
    const draft = req.body;
    const authUser = req.user as JwtPayload;

    console.log('💾 [maimlController] Draft保存リクエスト受信:', draft.draftKey);

    const result = await maimlService.saveDraft(
      draft,
      authUser.organizationId,
      authUser.userId
    );

    console.log('✅ [maimlController] Draft保存完了:', result.draftKey);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, 'Draft保存エラー');
  }
}

/**
 * Draft読み込み
 * GET /api/v1/maiml/draft/:draftKey
 */
export async function loadDraft(req: Request, res: Response): Promise<void> {
  try {
    const { draftKey } = req.params;
    const authUser = req.user as JwtPayload;

    console.log('📂 [maimlController] Draft読み込みリクエスト受信:', draftKey);

    const result = await maimlService.loadDraft(
      draftKey,
      authUser.organizationId,
      authUser.userId
    );

    if (!result) {
      res.status(404).json({
        success: false,
        error: {
          code: 'DRAFT_NOT_FOUND',
          message: `Draft not found: ${draftKey}`,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    console.log('✅ [maimlController] Draft読み込み完了:', result.draftKey);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, 'Draft読み込みエラー');
  }
}

/**
 * Draft一覧取得
 * GET /api/v1/maiml/drafts
 */
export async function listDrafts(req: Request, res: Response): Promise<void> {
  try {
    const authUser = req.user as JwtPayload;

    console.log('📋 [maimlController] Draft一覧取得リクエスト受信');

    const result = await maimlService.listDrafts(
      authUser.organizationId,
      authUser.userId
    );

    console.log('✅ [maimlController] Draft一覧取得完了:', result.length);

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        count: result.length,
      },
    });
  } catch (error) {
    handleError(res, error, 'Draft一覧取得エラー');
  }
}

/**
 * Draft削除
 * DELETE /api/v1/maiml/draft/:draftKey
 */
export async function deleteDraft(req: Request, res: Response): Promise<void> {
  try {
    const { draftKey } = req.params;
    const authUser = req.user as JwtPayload;

    console.log('🗑️ [maimlController] Draft削除リクエスト受信:', draftKey);

    const deletedCount = await maimlService.deleteDraft(
      draftKey,
      authUser.organizationId,
      authUser.userId
    );

    if (deletedCount === 0) {
      res.status(404).json({
        success: false,
        error: {
          code: 'DRAFT_NOT_FOUND',
          message: `Draft not found: ${draftKey}`,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    console.log('✅ [maimlController] Draft削除完了:', draftKey);

    res.json({
      success: true,
      data: {
        draftKey,
        deletedCount,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, 'Draft削除エラー');
  }
}

// ========== S3/Swiftファイル操作コントローラー ==========

/**
 * ファイル一覧取得
 * GET /api/v1/maiml/files
 * 
 * @description S3/Swiftから組織別のファイル一覧を取得
 * @reference Reference版: GET /api/s3/files (listingRoutes.js)
 * @features マルチテナント対応、チェックアウト状態、キャッシュ機能
 */
export async function listFiles(req: Request, res: Response): Promise<void> {
  try {
    const { organizationId } = req.query;
    const authUser = req.user as JwtPayload;

    // マルチテナント検証：リクエストされた組織IDがユーザーの組織と一致するか
    if (organizationId !== authUser.organizationId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to requested organization',
        },
      });
      return;
    }

    console.log('📁 [maimlController] ファイル一覧取得リクエスト受信:', {
      organizationId,
      userId: authUser.userId,
    });

    const result = await maimlService.listMaimlFilesFromStorage(organizationId as string);

    console.log('✅ [maimlController] ファイル一覧取得完了:', {
      fileCount: result.files?.length || 0,
      cached: result.cached,
    });

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, 'ファイル一覧取得エラー');
  }
}

/**
 * ファイル内容取得
 * GET /api/v1/maiml/file-content
 * 
 * @description S3/Swiftから指定されたキーのファイル内容を取得
 * @reference Reference版: GET /api/s3/file-content (retrievalRoutes.js)
 */
export async function getFileContent(req: Request, res: Response): Promise<void> {
  try {
    const { key } = req.query;
    const authUser = req.user as JwtPayload;

    console.log('📄 [maimlController] ファイル内容取得リクエスト受信:', {
      key,
      organizationId: authUser.organizationId,
    });

    const result = await maimlService.getMaimlFileContent(key as string);

    console.log('✅ [maimlController] ファイル内容取得完了:', {
      fileKey: result.data.fileKey,
      contentLength: result.data.contentLength,
    });

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, 'ファイル内容取得エラー');
  }
}

/**
 * フォーマットテンプレートファイル一覧取得
 * GET /api/v1/maiml/formats
 *
 * @description formats/ 配下を全部門横断で走査し、material/ condition/ result/ 配下の .xml ファイルのみ返す
 */
export async function listFormats(req: Request, res: Response): Promise<void> {
  try {
    const authUser = req.user as JwtPayload;
    const organizationId = authUser.organizationId;

    console.log('📁 [maimlController] フォーマット一覧取得リクエスト受信:', { organizationId });

    // formats/ 配下の全ファイルを取得
    const allFiles = await maimlService.listFormatsFiles(organizationId);

    console.log('✅ [maimlController] フォーマット一覧取得完了:', {
      organizationGroupCount: allFiles.organizationGroups.length,
    });

    res.json({
      success: true,
      data: allFiles,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, 'フォーマット一覧取得エラー');
  }
}

/**
 * バリデーション解析結果取得（保存済み）
 * GET /api/v1/maiml/analysis-result?fileKey=xxx
 *
 * @description 指定ファイルキーに対して直近に保存されたバリデーション解析結果を返す。
 * 存在しない場合は 404 を返す。
 */
export async function getAnalysisResult(req: Request, res: Response): Promise<void> {
  try {
    const { fileKey } = req.query;

    if (!fileKey || typeof fileKey !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'E1004', message: 'fileKey は必須です' },
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    const record = await maimlAnalysisResultRepository.getByFileKey(fileKey);

    if (!record) {
      res.status(404).json({
        success: false,
        error: { code: 'E6001', message: '解析結果が見つかりません' },
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    res.json({
      success: true,
      data: record,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    handleError(res, error, '解析結果取得エラー');
  }
}

/**
 * MAIML自動補正（リアルタイム）
 * POST /api/v1/maiml/auto-correct
 * 
 * @description MAIMLコンテンツのエラーを自動補正
 * @reference Reference版: POST /api/s3/maiml-auto-correct-realtime (validationRoutes.js)
 * @features Base64デコード、選択エラー補正、補正履歴
 */
export async function autoCorrect(req: Request, res: Response): Promise<void> {
  try {
    const { maimlContent, selectedErrors = [], organizationId } = req.body;
    const authUser = req.user as JwtPayload;

    // マルチテナント検証
    if (organizationId !== authUser.organizationId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to requested organization',
        },
      });
      return;
    }

    console.log('🔧 [maimlController] 自動補正リクエスト受信:', {
      contentLength: maimlContent.length,
      selectedErrorCount: selectedErrors.length,
      organizationId,
    });

    // Base64デコード
    const decodedContent = decodeBase64Content(maimlContent);
    console.log('✅ [maimlController] 自動補正用Base64デコード完了:', {
      decodedLength: decodedContent.length,
    });

    const result = await maimlService.autoCorrectMaiml(
      decodedContent,
      selectedErrors,
      organizationId
    );

    console.log('✅ [maimlController] 自動補正完了:', {
      correctionCount: result.correctionCount,
      totalAttempted: result.totalAttempted,
    });

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    handleError(res, error, '自動補正エラー');
  }
}
