/**
 * 電子署名APIサービス（スタブ実装）
 *
 * @description
 * MAIMLファイルのDocument要素に対するXML電子署名操作を提供する。
 * 現在はスタブ実装のため、実際のAPIコールは行わない。
 * バックエンドAPIが実装された後、スタブ部分を実API呼び出しに置き換える。
 *
 * @todo バックエンド実装後に以下のAPIエンドポイントに接続する
 *   GET  /api/v1/projects/:name/signature/status
 *   POST /api/v1/projects/:name/signature/apply
 *   POST /api/v1/projects/:name/signature/remove
 */

import type { SignatureStatus } from '@/types/signature';

/**
 * 署名ステータスを取得する
 *
 * @param projectName - 対象プロジェクト名
 * @returns 署名ステータス情報
 */
export async function getSignatureStatus(projectName: string): Promise<SignatureStatus> {
  // TODO: バックエンド実装後に実APIに置き換える
  // const response = await fetch(`/api/v1/projects/${encodeURIComponent(projectName)}/signature/status`);
  // if (!response.ok) throw new Error('署名状態の取得に失敗しました');
  // return response.json();

  console.log('[STUB] getSignatureStatus:', projectName);
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { status: 'none' };
}

/**
 * Document全体に対して電子署名を実行する
 *
 * @param projectName - 対象プロジェクト名
 * @remarks
 * 署名実行時はMAIMLファイルが保存され、アーカイブが作成される（仕様）
 */
export async function applySignature(projectName: string): Promise<void> {
  // TODO: バックエンド実装後に実APIに置き換える
  // const response = await fetch(`/api/v1/projects/${encodeURIComponent(projectName)}/signature/apply`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  // });
  // if (!response.ok) throw new Error('署名の実行に失敗しました');

  console.log('[STUB] applySignature:', projectName);
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

/**
 * Document全体の電子署名を削除する
 *
 * @param projectName - 対象プロジェクト名
 * @remarks
 * 署名削除時もMAIMLファイルが保存され、アーカイブが作成される（仕様）
 */
export async function removeSignature(projectName: string): Promise<void> {
  // TODO: バックエンド実装後に実APIに置き換える
  // const response = await fetch(`/api/v1/projects/${encodeURIComponent(projectName)}/signature/remove`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  // });
  // if (!response.ok) throw new Error('署名の削除に失敗しました');

  console.log('[STUB] removeSignature:', projectName);
  await new Promise((resolve) => setTimeout(resolve, 500));
}
