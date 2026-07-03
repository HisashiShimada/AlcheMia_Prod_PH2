/**
 * フォーム入力バリデーションユーティリティ
 * 
 * フロントエンド側で入力値を検証し、ユーザーに即座のフィードバックを提供します。
 * バックエンドでも最小限のセキュリティチェックは実施されます。
 *
 * ワークフロー検証ユーティリティ（旧 validationUtils.ts）も統合済み。
 */


import type { FormValidationResult } from '@/types/common';

/**
 * ユーザー名バリデーション
 * 
 * ルール:
 * - 必須
 * - 最大100文字
 * 
 * @param username - 検証するユーザー名
 * @returns バリデーション結果
 */
export function validateUsername(username: string): FormValidationResult {
  // 空文字チェック
  if (!username || username.trim().length === 0) {
    return {
      isValid: false,
      error: 'ユーザー名を入力してください',
    };
  }

  // 最大文字数チェック
  if (username.length > 100) {
    return {
      isValid: false,
      error: 'ユーザー名は100文字以内で入力してください',
    };
  }

  return { isValid: true };
}

/**
 * パスワードバリデーション
 * 
 * ルール:
 * - 必須
 * - 最小8文字
 * 
 * @param password - 検証するパスワード
 * @returns バリデーション結果
 */
export function validatePassword(password: string): FormValidationResult {
  // 空文字チェック
  if (!password || password.length === 0) {
    return {
      isValid: false,
      error: 'パスワードを入力してください',
    };
  }

  // 最小文字数チェック
  if (password.length < 8) {
    return {
      isValid: false,
      error: 'パスワードは8文字以上で入力してください',
    };
  }

  return { isValid: true };
}

/**
 * PINコードバリデーション
 * 
 * ルール:
 * - 必須
 * - 6桁の数字
 * 
 * @param pinCode - 検証するPINコード
 * @returns バリデーション結果
 */
export function validatePinCode(pinCode: string): FormValidationResult {
  // 空文字チェック
  if (!pinCode || pinCode.trim().length === 0) {
    return {
      isValid: false,
      error: 'PINコードを入力してください',
    };
  }

  // 6桁の数字チェック
  const pinPattern = /^\d{6}$/;
  if (!pinPattern.test(pinCode)) {
    return {
      isValid: false,
      error: 'PINコードは6桁の数字で入力してください',
    };
  }

  return { isValid: true };
}

/**
 * 新パスワードバリデーション（パスワードリセット用）
 * 
 * ルール:
 * - 必須
 * - 最小8文字
 * - 推奨: 大文字、小文字、数字、特殊文字を含む（警告のみ）
 * 
 * @param password - 検証する新パスワード
 * @returns バリデーション結果
 */
export function validateNewPassword(password: string): FormValidationResult {
  // 空文字チェック
  if (!password || password.length === 0) {
    return {
      isValid: false,
      error: '新しいパスワードを入力してください',
    };
  }

  // 最小文字数チェック
  if (password.length < 8) {
    return {
      isValid: false,
      error: '新しいパスワードは8文字以上で入力してください',
    };
  }

  return { isValid: true };
}

/**
 * パスワード確認バリデーション
 * 
 * ルール:
 * - 必須
 * - パスワードと一致
 * 
 * @param password - 元のパスワード
 * @param confirmPassword - 確認用パスワード
 * @returns バリデーション結果
 */
export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string
): FormValidationResult {
  // 空文字チェック
  if (!confirmPassword || confirmPassword.length === 0) {
    return {
      isValid: false,
      error: '確認用パスワードを入力してください',
    };
  }

  // パスワード一致チェック
  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: 'パスワードが一致しません',
    };
  }

  return { isValid: true };
}

/**
 * メールアドレス/ユーザーIDバリデーション（基本的な形式チェック）
 * 
 * ルール:
 * - 必須
 * - 基本的なメール形式（@を含む）
 * 
 * @param email - 検証するメールアドレスまたはユーザーID
 * @returns バリデーション結果
 */
export function validateEmail(email: string): FormValidationResult {
  // 空文字チェック
  if (!email || email.trim().length === 0) {
    return {
      isValid: false,
      error: 'ユーザーIDを入力してください',
    };
  }

  // 基本的なメール形式チェック
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return {
      isValid: false,
      error: '有効なユーザーIDを入力してください',
    };
  }

  return { isValid: true };
}

/**
 * フォーム全体のバリデーション結果を統合
 * 
 * @param results - 個別のバリデーション結果の配列
 * @returns 統合されたバリデーション結果
 */
export function combineValidationResults(
  results: FormValidationResult[]
): FormValidationResult {
  const firstError = results.find((result) => !result.isValid);

  if (firstError) {
    return {
      isValid: false,
      error: firstError.error,
    };
  }

  return { isValid: true };
}

// ---------------------------------------------------------------------------
// 名前空間ダイアログ用バリデーション
// ---------------------------------------------------------------------------

/**
 * MaiMLのXML文字列から実際に使用されているprefixの一覧を抽出する
 *
 * XML内で `prefix:localName` の形式で参照されているprefixを検出します。
 * 例: `maiml:method`, `rd:material` → ['maiml', 'rd']
 *
 * @param maimlXml - MaiMLファイルのXML文字列
 * @returns 使用中のprefixの配列（重複なし）
 */
export function extractUsedPrefixes(maimlXml: string): string[] {
  if (!maimlXml) return [];

  // XML属性・要素名・属性値中の "prefix:localName" パターンを検出
  // ただし xmlns: 宣言自体は除外する
  const usedSet = new Set<string>();

  // 要素名・属性名の prefix: パターン（例: <maiml:method, rd:material=）
  const tagPattern = /(?<![a-zA-Z0-9_\-])([a-zA-Z_][a-zA-Z0-9_\-]*):[a-zA-Z_][a-zA-Z0-9_\-.]*/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(maimlXml)) !== null) {
    const prefix = match[1];
    // xmlns 宣言は除外
    if (prefix !== 'xmlns' && prefix !== 'xml') {
      usedSet.add(prefix);
    }
  }

  return Array.from(usedSet);
}

// ---------------------------------------------------------------------------
// 以下は validationUtils.ts より統合（ワークフロー検証）
// ---------------------------------------------------------------------------

import type { Node, Edge } from 'reactflow';
import { validateNode } from './nodeUtils';
import { validateEdge, detectCycle } from './edgeUtils';
import type { NodeData, EdgeData } from '../types/editor';
import { getTranslation } from '../contexts/LanguageContext';
import type { WorkflowValidationResult } from '@/types/maimlValidation';

/**
 * ワークフロー全体の検証
 */
export const validateWorkflow = (
  nodes: Node<NodeData>[],
  edges: Edge<EdgeData>[]
): WorkflowValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ノード数チェック
  if (nodes.length === 0) {
    errors.push(getTranslation('editor.validation.noNodes'));
    return { valid: false, errors, warnings };
  }

  // 各ノードの検証
  for (const node of nodes) {
    const result = validateNode(node);
    if (!result.valid) {
      errors.push(`${getTranslation('editor.validation.nodePrefix')} ${node.id}: ${result.errors.join(', ')}`);
    }
  }

  // 各エッジの検証
  for (const edge of edges) {
    const result = validateEdge(edge, nodes);
    if (!result.valid) {
      errors.push(`${getTranslation('editor.validation.edgePrefix')} ${edge.id}: ${result.errors.join(', ')}`);
    }
  }

  // 孤立ノードの検出
  const connectedNodeIds = new Set<string>();
  for (const edge of edges) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }

  const isolatedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));
  if (isolatedNodes.length > 0) {
    warnings.push(
      `${getTranslation('editor.validation.isolatedNodesPrefix')}${isolatedNodes.length}${getTranslation('editor.validation.isolatedNodesSuffix')}: ${isolatedNodes.map(n => n.data.name).join(', ')}`
    );
  }

  // 循環参照の検出
  for (const node of nodes) {
    if (detectCycle(node.id, edges)) {
      warnings.push(`${getTranslation('editor.validation.cycleDetectedPrefix')} ${node.id} ${getTranslation('editor.validation.cycleDetectedSuffix')}`);
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};
