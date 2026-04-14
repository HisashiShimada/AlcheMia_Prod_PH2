/**
 * ドラフト管理に使用する定数
 *
 * 自動保存ドラフトの識別には draft_name のプレフィックスを使用する。
 * DBに draft_type カラムが追加されるまでの短期対応として定数化。
 */
export const AUTO_SAVE_PREFIX = '自動保存';

/**
 * draft_name に AUTO_SAVE_PREFIX が含まれているかを判定する
 */
export function isAutoSaveDraft(draftName: string | undefined | null): boolean {
  return !!draftName && draftName.includes(AUTO_SAVE_PREFIX);
}
