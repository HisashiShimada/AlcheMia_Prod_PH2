/**
 * MAIML拡張型定義 (Extended Type Definitions)
 * 
 * XSD準拠型（maiml-unified.ts）に追加情報が必要な場合のみ、
 * 別の型として定義します。
 * 
 * Phase 6設計原則:
 * 1. 基本はXSD準拠型をそのまま使う
 * 2. 追加情報が必要な場合のみ新しい型を作る
 * 3. 型継承（extends）は使わず、全容を明示的に記述する
 * 
 * @see frontend/src/types/maiml-unified.ts (XSD準拠型)
 * @version 1.0.0
 * @date 2026-02-03
 */

import type {
  MaterialTemplate,
  ConditionTemplate,
  ResultTemplate,
} from './maiml-unified';

// ============================================================================
// Transition + Metadata
// ============================================================================

/**
 * Transition型 + メタデータ
 * 
 * XSD準拠のTransition型に、Phase 3-4で追加されたメタデータを含む。
 * 
 * === XSD準拠型のフィールド ===
 * - id: Transition ID（必須）
 * - uuid: UUID（オプション）
 * - name: Transition名（オプション）
 * - description: 説明（オプション）
 * - annotation: 注釈（オプション）
 * 
 * === 追加メタデータ（Phase 3-4） ===
 * - methodId: 所属するMethod ID
 * - displayName: 表示用の整形された名前（method prefixを含む）
 * - isExperimentRelevant: 実験関連のTransitionか（フィルタリング用）
 * - hasInstruction: Instructionが存在するか
 * - category: トランジションのカテゴリ
 * - arcCount: 接続されたアークの数
 * - arcs: 接続されたアーク情報
 * 
 * @example getTransitions()の使用例
 * ```typescript
 * const result = parser.getTransitions();
 * result.transitions.forEach((t: TransitionWithMetadata) => {
 *   console.log(t.displayName);  // "[method_1] transition_1 - 測定"
 *   if (t.isExperimentRelevant && t.hasInstruction) {
 *     console.log('実験関連で指示あり');
 *   }
 * });
 * ```
 */
export interface TransitionWithMetadata {
  // === XSD準拠型のフィールド（maiml-unified.ts Transition型から）===
  /** Transition ID（必須） */
  id: string;
  /** UUID（RFC 4122準拠、オプション） */
  uuid?: string;
  /** Transition名（オプション） */
  name?: string;
  /** 説明（オプション） */
  description?: string;
  /** 注釈（オプション） */
  annotation?: string;

  // === Phase 3-4で追加されたメタデータ ===
  /** 所属するMethod ID */
  methodId: string;
  /** Method名（オプション） */
  methodName?: string;
  /** 表示用の整形された名前（例: "[method_1] transition_1 - 測定"） */
  displayName?: string;
  /** 実験関連のTransitionか（実験・準備カテゴリの場合true） */
  isExperimentRelevant?: boolean;
  /** Instructionが存在するか（program/instruction内に該当transitionRefがある場合true） */
  hasInstruction?: boolean;
  /** トランジションのカテゴリ */
  category?: 'experiment' | 'preparation' | 'finalization' | 'other';
  /** 接続されたアークの数 */
  arcCount?: number;
  /** 接続されたアーク情報 */
  arcs?: Array<{
    id: string;
    source: string;
    target: string;
    type: 'input' | 'output';
  }>;
}

// ============================================================================
// Template Type Aliases（型エイリアス）
// ============================================================================

/**
 * MaterialTemplate情報（型エイリアス）
 * 
 * XSD準拠型のMaterialTemplateをそのまま使用。
 * 追加情報が不要なため、型エイリアスで対応。
 * 
 * パターン1: XSD準拠型をそのまま使用
 * - 型変換なし
 * - パフォーマンス最高
 * - 保守性が高い
 */
export type MaterialTemplateInfo = MaterialTemplate;

/**
 * ConditionTemplate情報（型エイリアス）
 * 
 * XSD準拠型のConditionTemplateをそのまま使用。
 */
export type ConditionTemplateInfo = ConditionTemplate;

/**
 * ResultTemplate情報（型エイリアス）
 * 
 * XSD準拠型のResultTemplateをそのまま使用。
 */
export type ResultTemplateInfo = ResultTemplate;

/**
 * Template情報（統合型エイリアス）
 * 
 * Material/Condition/Result のいずれかのTemplateを表す。
 * 
 * @deprecated 可能な限り具体的な型（MaterialTemplateInfo等）を使用してください
 */
export type TemplateInfo = MaterialTemplate | ConditionTemplate | ResultTemplate;

// ============================================================================
// Export Summary
// ============================================================================

/**
 * このファイルでエクスポートされる型:
 * 
 * 1. TransitionWithMetadata - Transition + メタデータ（別型として定義）
 * 2. MaterialTemplateInfo - MaterialTemplate型エイリアス
 * 3. ConditionTemplateInfo - ConditionTemplate型エイリアス
 * 4. ResultTemplateInfo - ResultTemplate型エイリアス
 * 5. TemplateInfo - 統合型エイリアス（非推奨）
 * 
 * Phase 6での型使用方針:
 * - 基本: XSD準拠型（maiml-unified.ts）を直接使用
 * - 追加情報必要: このファイルの型を使用
 * - 型変換: 最小限に抑える
 */