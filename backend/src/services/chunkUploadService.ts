/**
 * チャンクアップロードサービス
 *
 * 10MB を超えるファイルを複数のチャンクに分割して送信するための
 * サーバーサイドロジックを提供する。
 *
 * 処理フロー:
 *   1. initSession()    — uploadId（UUID）を生成し、一時ディレクトリを作成
 *   2. saveChunk()      — 受信したチャンクを一時ディレクトリに保存
 *   3. completeUpload() — 全チャンクを結合してストレージにアップロードし、一時ファイルを削除
 *
 * チャンク分割アップロード実装 (2026-03-25)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getStorageService } from './storageService';

// ---------------------------------------------------------------------------
// リトライ機能 (2026-03-30) → 共通化: backend/src/utils/storageRetry.ts
// ---------------------------------------------------------------------------
import { withStorageRetry } from '../utils/storageRetry';

/** チャンクセッション情報 */
export interface ChunkSession {
  /** セッション識別子 */
  uploadId: string;
  /** 元のファイル名 */
  fileName: string;
  /** ストレージ保存先パス（相対パス） */
  filePath: string;
  /** 総チャンク数 */
  totalChunks: number;
  /** 一時ディレクトリパス */
  tempDir: string;
  /** セッション作成日時 */
  createdAt: Date;
}

/** completeUpload() の戻り値 */
export interface ChunkCompleteResult {
  /** ストレージに保存されたファイルキー */
  fileKey: string;
  /** 結合後のファイルサイズ（バイト） */
  fileSize: number;
  /** Content-Type */
  contentType: string;
  /** SHA-256ハッシュ値（重複検出用） */
  fileHash: string;
}

/**
 * メモリ上のセッション管理マップ
 * （サーバー再起動でリセットされる点に注意。本番スケールでは Redis に移行する）
 */
const sessions = new Map<string, ChunkSession>();

/**
 * チャンクアップロードサービス
 */
export class ChunkUploadService {
  private storageService: any;

  constructor() {
    this.storageService = getStorageService();
  }

  /**
   * チャンクアップロードセッションを開始する
   *
   * @param fileName   元のファイル名
   * @param filePath   ストレージ保存先パス（相対パス）
   * @param totalChunks 総チャンク数
   * @returns uploadId
   */
  initSession(fileName: string, filePath: string, totalChunks: number): string {
    const uploadId = uuidv4();
    const tempDir = path.join(os.tmpdir(), 'chunks', uploadId);

    // 一時ディレクトリを作成
    fs.mkdirSync(tempDir, { recursive: true });

    const session: ChunkSession = {
      uploadId,
      fileName,
      filePath,
      totalChunks,
      tempDir,
      createdAt: new Date(),
    };

    sessions.set(uploadId, session);

    console.log(`🆕 [ChunkUpload] セッション開始: uploadId=${uploadId}, fileName=${fileName}, totalChunks=${totalChunks}`);

    return uploadId;
  }

  /**
   * チャンクを一時ディレクトリに保存する
   *
   * @param uploadId   セッション識別子
   * @param chunkIndex チャンクのインデックス（0 始まり）
   * @param buffer     チャンクのバイナリデータ
   * @returns 現在受信済みのチャンク数
   * @throws Error セッションが存在しない場合
   */
  saveChunk(uploadId: string, chunkIndex: number, buffer: Buffer): number {
    const session = this.getSession(uploadId);

    const chunkPath = path.join(session.tempDir, `chunk_${String(chunkIndex).padStart(6, '0')}`);
    fs.writeFileSync(chunkPath, buffer);

    const receivedCount = fs.readdirSync(session.tempDir).length;

    console.log(`📦 [ChunkUpload] チャンク保存: uploadId=${uploadId}, chunkIndex=${chunkIndex}, received=${receivedCount}/${session.totalChunks}`);

    return receivedCount;
  }

  /**
   * 全チャンクを結合してストレージに保存し、一時ファイルを削除する
   *
   * @param uploadId    セッション識別子
   * @param organizationId 組織ID
   * @param totalChunks 総チャンク数（検証用）
   * @param contentType Content-Type（省略時は application/octet-stream）
   * @returns 保存結果
   * @throws Error セッションが存在しない場合、チャンク数が不足している場合
   */
  async completeUpload(
    uploadId: string,
    organizationId: string,
    totalChunks: number,
    contentType = 'application/octet-stream'
  ): Promise<ChunkCompleteResult> {
    const session = this.getSession(uploadId);

    try {
      // チャンクファイル一覧をインデックス順にソート
      const chunkFiles = fs
        .readdirSync(session.tempDir)
        .filter((f) => f.startsWith('chunk_'))
        .sort();

      if (chunkFiles.length !== totalChunks) {
        throw new Error(
          `チャンク数が不一致です: 期待=${totalChunks}, 受信済み=${chunkFiles.length}`
        );
      }

      // 全チャンクを結合して 1 つの Buffer に
      const buffers = chunkFiles.map((chunkFile) =>
        fs.readFileSync(path.join(session.tempDir, chunkFile))
      );
      const combined = Buffer.concat(buffers);

      console.log(`🔗 [ChunkUpload] チャンク結合完了: uploadId=${uploadId}, size=${combined.length} bytes`);

      // ストレージにアップロード（最大3回リトライ）
      const fileKey = await withStorageRetry<string>(
        () => this.storageService.uploadFile(
          organizationId,
          session.filePath,
          combined,
          { contentType }
        ),
        3,
        1000,
        `ChunkUpload:complete:${session.fileName}`
      );

      console.log(`✅ [ChunkUpload] ストレージ保存成功: fileKey=${fileKey}`);

      // SHA-256ハッシュ値を計算（重複検出用）
      const fileHash = crypto.createHash('sha256').update(combined).digest('hex');

      return {
        fileKey,
        fileSize: combined.length,
        contentType,
        fileHash,
      };
    } finally {
      // エラー・成功に関わらず一時ファイルを削除
      this.cleanupSession(uploadId);
    }
  }

  /**
   * セッションを中断し、一時ファイルを削除する
   *
   * @param uploadId セッション識別子
   */
  abortSession(uploadId: string): void {
    this.cleanupSession(uploadId);
    console.log(`🚫 [ChunkUpload] セッション中断: uploadId=${uploadId}`);
  }

  // ---------------------------------------------------------------------------
  // private helpers
  // ---------------------------------------------------------------------------

  private getSession(uploadId: string): ChunkSession {
    const session = sessions.get(uploadId);
    if (!session) {
      throw new Error(`チャンクセッションが見つかりません: uploadId=${uploadId}`);
    }
    return session;
  }

  private cleanupSession(uploadId: string): void {
    const session = sessions.get(uploadId);
    if (session) {
      try {
        if (fs.existsSync(session.tempDir)) {
          fs.rmSync(session.tempDir, { recursive: true, force: true });
          console.log(`🗑️ [ChunkUpload] 一時ディレクトリ削除: ${session.tempDir}`);
        }
      } catch (err) {
        console.warn(`⚠️ [ChunkUpload] 一時ディレクトリ削除失敗: ${session.tempDir}`, err);
      }
      sessions.delete(uploadId);
    }
  }
}
