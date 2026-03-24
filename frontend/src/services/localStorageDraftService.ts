/**
 * localStorageDraftService.ts
 *
 * MaiML編集中のデータをブラウザのLocalStorageに自動保存・復元するサービス。
 * セッションタイムアウト時の編集内容消失を防ぐことを目的とする。
 *
 * LocalStorageキー形式: petri-net-draft-{projectId}
 *
 * @remarks
 * バックエンドDraft（DB保存）とは別物。
 * 同一ブラウザのみで有効な一時保存機能。
 */

import type { Node, Edge } from 'reactflow';
import type { NodeData, EdgeData, DocumentData } from '../types/editor';

// ===== 型定義 =====

/**
 * LocalStorageに保存するDraftデータの型
 */
export interface LocalStorageDraftData {
  /** 保存日時（ISO 8601形式）例: "2026-03-23T16:00:00.000Z" */
  savedAt: string;
  /** ペトリネットのノード一覧 */
  nodes: Node<NodeData>[];
  /** ペトリネットのエッジ一覧 */
  edges: Edge<EdgeData>[];
  /** テンプレート一覧 */
  templates: unknown[];
  /** ドキュメント情報 */
  documentData: DocumentData | null;
  /** 表示用ファイル名 */
  fileName: string;
  /** スキーマバージョン（将来の互換性対応） */
  version: string;
}

// ===== 定数 =====

/** LocalStorageキーのプレフィックス */
const DRAFT_KEY_PREFIX = 'petri-net-draft-';

/** スキーマバージョン */
const SCHEMA_VERSION = '1.0';

// ===== ユーティリティ =====

/**
 * projectId から LocalStorageキーを生成する
 */
const buildDraftKey = (projectId: string): string => {
  return `${DRAFT_KEY_PREFIX}${projectId}`;
};

// ===== メイン関数 =====

/**
 * 編集状態をLocalStorageに保存する
 *
 * @param projectId - プロジェクトID（PetriNetEditorInner の initialDocumentId）
 * @param editState - 保存するエディタ状態
 */
export function saveDraftToLocalStorage(
  projectId: string,
  editState: {
    fileName: string;
    nodes: Node<NodeData>[];
    edges: Edge<EdgeData>[];
    templates?: unknown[];
    documentData?: DocumentData | null;
  }
): void {
  if (!projectId) {
    console.warn('⚠️ [localStorageDraftService] projectId が未設定のため保存をスキップ');
    return;
  }

  const draftData: LocalStorageDraftData = {
    savedAt: new Date().toISOString(),
    nodes: editState.nodes,
    edges: editState.edges,
    templates: editState.templates ?? [],
    documentData: editState.documentData ?? null,
    fileName: editState.fileName,
    version: SCHEMA_VERSION,
  };

  const key = buildDraftKey(projectId);

  try {
    localStorage.setItem(key, JSON.stringify(draftData));
    console.log('💾 [localStorageDraftService] LocalStorage保存成功:', {
      key,
      savedAt: draftData.savedAt,
      nodesCount: draftData.nodes.length,
      edgesCount: draftData.edges.length,
    });
  } catch (err) {
    // 容量オーバーなど
    console.error('❌ [localStorageDraftService] LocalStorage保存エラー:', err);

    // クリーンアップして再試行
    try {
      cleanupOldLocalStorageDrafts(1); // 1日以上前のデータを削除
      localStorage.setItem(key, JSON.stringify(draftData));
      console.log('✅ [localStorageDraftService] クリーンアップ後に再保存成功');
    } catch (retryErr) {
      console.error('❌ [localStorageDraftService] 再試行も失敗:', retryErr);
      // ユーザーへの通知は行わない（バックグラウンド処理のため）
    }
  }
}

/**
 * LocalStorageからDraftデータを読み込む
 *
 * @param projectId - プロジェクトID
 * @returns Draftデータ、存在しない or パースエラー の場合は null
 */
export function loadDraftFromLocalStorage(
  projectId: string
): LocalStorageDraftData | null {
  if (!projectId) {
    console.warn('⚠️ [localStorageDraftService] projectId が未設定のため読み込みをスキップ');
    return null;
  }

  const key = buildDraftKey(projectId);

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as LocalStorageDraftData;

    // バージョンチェック（将来の互換性）
    if (!parsed.version) {
      console.warn('⚠️ [localStorageDraftService] バージョン情報なし、旧形式データを破棄:', key);
      localStorage.removeItem(key);
      return null;
    }

    // 必須フィールドの存在チェック
    if (!parsed.savedAt || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      console.warn('⚠️ [localStorageDraftService] データ構造が不正、破棄:', key);
      localStorage.removeItem(key);
      return null;
    }

    console.log('📖 [localStorageDraftService] LocalStorage読み込み成功:', {
      key,
      savedAt: parsed.savedAt,
      nodesCount: parsed.nodes.length,
      edgesCount: parsed.edges.length,
    });

    return parsed;
  } catch (err) {
    // JSONパースエラー（データ破損）
    console.error('❌ [localStorageDraftService] LocalStorage読み込みエラー（データ破損）:', err);
    // 破損データを削除
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return null;
  }
}

/**
 * LocalStorageからDraftデータを削除する
 *
 * @param projectId - プロジェクトID
 */
export function removeDraftFromLocalStorage(projectId: string): void {
  if (!projectId) {
    return;
  }

  const key = buildDraftKey(projectId);

  try {
    localStorage.removeItem(key);
    console.log('🗑️ [localStorageDraftService] LocalStorage削除完了:', key);
  } catch (err) {
    console.error('❌ [localStorageDraftService] LocalStorage削除エラー:', err);
  }
}

/**
 * LocalStorageにDraftが存在するか確認する
 *
 * @param projectId - プロジェクトID
 * @returns Draftが存在する場合は true
 */
export function hasDraftInLocalStorage(projectId: string): boolean {
  if (!projectId) {
    return false;
  }

  const key = buildDraftKey(projectId);

  try {
    const raw = localStorage.getItem(key);
    return raw !== null;
  } catch {
    return false;
  }
}

/**
 * 古いLocalStorageDraftを一括削除する（クリーンアップ）
 *
 * @param daysToKeep - 保持する日数（この日数より古いデータを削除）
 */
export function cleanupOldLocalStorageDrafts(daysToKeep: number): void {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const keysToDelete: string[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(DRAFT_KEY_PREFIX)) {
        continue;
      }

      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        const parsed = JSON.parse(raw) as Partial<LocalStorageDraftData>;

        if (!parsed.savedAt) {
          // savedAt がない場合は古い形式として削除対象
          keysToDelete.push(key);
          continue;
        }

        const savedDate = new Date(parsed.savedAt);
        if (savedDate < cutoffDate) {
          keysToDelete.push(key);
        }
      } catch {
        // パースエラーは削除対象
        if (key) {
          keysToDelete.push(key);
        }
      }
    }
  } catch (err) {
    console.error('❌ [localStorageDraftService] クリーンアップ中にエラー:', err);
    return;
  }

  keysToDelete.forEach((key) => {
    try {
      localStorage.removeItem(key);
      console.log('🧹 [localStorageDraftService] 古いDraftを削除:', key);
    } catch (err) {
      console.error('❌ [localStorageDraftService] 削除エラー:', key, err);
    }
  });

  if (keysToDelete.length > 0) {
    console.log(`🧹 [localStorageDraftService] クリーンアップ完了: ${keysToDelete.length}件削除`);
  }
}
