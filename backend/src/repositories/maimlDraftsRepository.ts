/**
 * MaimlDraftsRepository
 * 
 * maiml_draftsテーブルへのデータアクセス層
 * DB操作のみを担当し、検索結果をそのまま返却
 * 型変換はService層で実行
 */

import { getPool } from '../database/db';
import type { Draft } from '../types/editor';

/**
 * DB検索結果の型定義
 * maiml_draftsテーブルのカラムに対応
 */
export interface MaimlDraftsRow {
  id: number;
  draft_key: string;
  user_id: string;
  organization_id: string;
  draft_name: string;
  original_file_key: string | null;
  nodes: string; // JSONB（文字列として返却）
  arcs: string; // JSONB（文字列として返却）
  templates: string; // JSONB（文字列として返却）
  document_data: string; // JSONB（文字列として返却）
  node_count: number;
  arc_count: number;
  template_count: number;
  created_at: Date;
  last_saved_at: Date;
}

/**
 * MaimlDraftsRepositoryクラス
 */
export class MaimlDraftsRepository {
  /**
   * Draftを保存（INSERT or UPDATE）
   * 
   * @param draft - 保存するDraftデータ
   * @param organizationId - 組織ID（マルチテナント分離必須）
   * @param userId - ユーザーID（アクセス制御必須）
   * @returns 保存されたDB行（MaimlDraftsRow）
   */
  async save(
    draft: Draft,
    organizationId: string,
    userId: string
  ): Promise<MaimlDraftsRow> {
    const pool = getPool();

    // edges → arcs変換（unknownから配列として処理）
    const nodes = draft.nodes || [];
    const edges = draft.edges || [];
    const templates = draft.templates || [];
    
    // カウント計算
    const nodeCount = Array.isArray(nodes) ? nodes.length : 0;
    const arcCount = Array.isArray(edges) ? edges.length : 0;
    const templateCount = Array.isArray(templates) ? templates.length : 0;

    // UPSERT (INSERT ... ON CONFLICT DO UPDATE)
    // Parameterized Query使用（SQLインジェクション対策）
    const query = `
      INSERT INTO maiml_drafts (
        draft_key,
        user_id,
        organization_id,
        draft_name,
        original_file_key,
        nodes,
        arcs,
        templates,
        document_data,
        node_count,
        arc_count,
        template_count,
        created_at,
        last_saved_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (draft_key)
      DO UPDATE SET
        draft_name = EXCLUDED.draft_name,
        original_file_key = EXCLUDED.original_file_key,
        nodes = EXCLUDED.nodes,
        arcs = EXCLUDED.arcs,
        templates = EXCLUDED.templates,
        document_data = EXCLUDED.document_data,
        node_count = EXCLUDED.node_count,
        arc_count = EXCLUDED.arc_count,
        template_count = EXCLUDED.template_count,
        last_saved_at = CURRENT_TIMESTAMP
      WHERE maiml_drafts.organization_id = $3
        AND maiml_drafts.user_id = $2
      RETURNING *
    `;

    const values = [
      draft.draftKey,
      userId,
      organizationId,
      draft.draftName,
      draft.originalFileKey || null,
      JSON.stringify(nodes),
      JSON.stringify(edges),
      JSON.stringify(templates),
      JSON.stringify(draft.documentData || {}),
      nodeCount,
      arcCount,
      templateCount,
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Failed to save draft');
    }

    // DB検索結果をそのまま返却（型変換はService層で実行）
    return result.rows[0] as MaimlDraftsRow;
  }

  /**
   * draftKeyでDraftを取得
   * 
   * @param draftKey - DraftのキーID
   * @param organizationId - 組織ID（マルチテナント分離必須）
   * @param userId - ユーザーID（アクセス制御必須）
   * @returns DB行、存在しない場合はnull
   */
  async findByKey(
    draftKey: string,
    organizationId: string,
    userId: string
  ): Promise<MaimlDraftsRow | null> {
    const pool = getPool();

    // Parameterized Query使用（SQLインジェクション対策）
    // organization_id + user_idフィルタ必須（マルチテナント分離）
    const query = `
      SELECT *
      FROM maiml_drafts
      WHERE draft_key = $1
        AND organization_id = $2
        AND user_id = $3
    `;

    const result = await pool.query(query, [draftKey, organizationId, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    // DB検索結果をそのまま返却（型変換はService層で実行）
    return result.rows[0] as MaimlDraftsRow;
  }

  /**
   * Draftを削除
   * 
   * @param draftKey - 削除するDraftのキーID
   * @param organizationId - 組織ID（マルチテナント分離必須）
   * @param userId - ユーザーID（アクセス制御必須）
   * @returns 削除された行数
   */
  async delete(
    draftKey: string,
    organizationId: string,
    userId: string
  ): Promise<number> {
    const pool = getPool();

    // Parameterized Query使用（SQLインジェクション対策）
    // organization_id + user_idフィルタ必須（マルチテナント分離）
    const query = `
      DELETE FROM maiml_drafts
      WHERE draft_key = $1
        AND organization_id = $2
        AND user_id = $3
    `;

    const result = await pool.query(query, [draftKey, organizationId, userId]);

    return result.rowCount || 0;
  }

  /**
   * 組織・ユーザーのDraft一覧を取得
   * 
   * @param organizationId - 組織ID（マルチテナント分離必須）
   * @param userId - ユーザーID（アクセス制御必須）
   * @returns DB行の配列（最終保存日時の降順）
   */
  async findAll(
    organizationId: string,
    userId: string
  ): Promise<MaimlDraftsRow[]> {
    const pool = getPool();

    // Parameterized Query使用（SQLインジェクション対策）
    // organization_id + user_idフィルタ必須（マルチテナント分離）
    const query = `
      SELECT *
      FROM maiml_drafts
      WHERE organization_id = $1
        AND user_id = $2
      ORDER BY last_saved_at DESC
    `;

    const result = await pool.query(query, [organizationId, userId]);

    // DB検索結果をそのまま返却（型変換はService層で実行）
    return result.rows as MaimlDraftsRow[];
  }
}
