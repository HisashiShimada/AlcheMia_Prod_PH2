/**
 * experimentPlanHelpers.ts
 * ExperimentPlanDialog で使用するヘルパー関数
 *
 * ExperimentPlanDialog.tsx から分離したユーティリティ関数を集約するファイル。
 */

import type { ExperimentPlanTabData, TemplateDef } from '@/types/experimentPlan';
import type { TransitionOrderItem } from '@/types/experimentPlanDialog';

/**
 * タブデータの初期値を生成する
 */
export function createInitialTabData(): ExperimentPlanTabData {
  return {
    selectedTransitions: [],
    creatorRefs: [],
    instrumentRefs: [],
    ownerRefs: [],
    notes: [],
    templateValues: {},
    assignedUncertainty: {},
  };
}

/**
 * テンプレート定義一覧から defaultValue を収集し、templateValues の初期値を生成する
 *
 * @param templates - APIから取得した TemplateDef[] (TemplateDef.fields[].defaultValue を使用)
 * @returns `{templateId}_{fieldKey}` をキーとした初期 templateValues
 */
export function buildDefaultTemplateValues(
  templates: TemplateDef[]
): Record<string, string | number | boolean> {
  const values: Record<string, string | number | boolean> = {};
  for (const tmpl of templates) {
    for (const field of tmpl.fields) {
      if (field.defaultValue !== undefined && field.defaultValue !== null) {
        values[`${tmpl.id}_${field.key}`] = field.defaultValue;
      }
    }
  }
  return values;
}

/**
 * トランジションの依存関係からステップ番号を計算する。
 *
 * ステップの定義:
 *   - 依存なし（前提トランジションがない）→ ステップ1
 *   - 全依存先の最大ステップ番号 + 1 → 自身のステップ番号
 *
 * 例）画像の推移図:
 *   A（依存なし）→ ステップ1
 *   C（依存なし）→ ステップ1
 *   B（A に依存）→ ステップ2
 *   D（C に依存）→ ステップ2
 *   E（B, D に依存）→ ステップ3
 *   F（E に依存）→ ステップ4
 *   G（E に依存）→ ステップ4
 *   H（F, G に依存）→ ステップ5
 */
export function calculateSteps(transitions: TransitionOrderItem[]): TransitionOrderItem[] {
  const stepMap = new Map<string, number>();

  const getStep = (id: string, visited = new Set<string>()): number => {
    if (stepMap.has(id)) return stepMap.get(id)!;
    if (visited.has(id)) return 1; // 循環参照の場合はステップ1として扱う

    visited.add(id);
    const trans = transitions.find((t) => t.id === id);

    // 依存なし → ステップ1
    if (!trans || trans.prerequisiteTransitionIds.length === 0) {
      stepMap.set(id, 1);
      return 1;
    }

    // 全依存先の最大ステップ番号 + 1
    const maxPrereqStep = Math.max(
      ...trans.prerequisiteTransitionIds.map((prereqId) =>
        getStep(prereqId, new Set(visited))
      )
    );
    const step = maxPrereqStep + 1;
    stepMap.set(id, step);
    return step;
  };

  transitions.forEach((t) => getStep(t.id));

  return transitions.map((t) => ({
    ...t,
    step: stepMap.get(t.id) ?? 1,
  }));
}

/**
 * 指定トランジションを targetOrder へ移動できるか判定する。
 *
 * チェック項目:
 *   A) 自分の依存先（prerequisiteTransitionIds）が全て targetOrder より小さい order にあるか
 *   B) 自分に直接依存しているトランジションが全て targetOrder より大きい order にあるか
 *      ※ 準備A が混合より後ろに移動するのを防ぐ
 */
export function canMoveToOrder(
  transitionId: string,
  targetOrder: number,
  currentOrderList: TransitionOrderItem[]
): { canMove: boolean; reason?: string } {
  const target = currentOrderList.find((t) => t.id === transitionId);
  if (!target) return { canMove: false, reason: 'トランジションが見つかりません' };

  // A) 依存先チェック（自分の prereqs が全て targetOrder より前にあるか）
  for (const prereqId of target.prerequisiteTransitionIds) {
    const prereq = currentOrderList.find((t) => t.id === prereqId);
    if (prereq && prereq.order >= targetOrder) {
      return {
        canMove: false,
        reason: `依存先「${prereq.name}」（順序: ${prereq.order}）より前には移動できません`,
      };
    }
  }

  // B) 子孫チェック（自分に直接依存しているトランジションが全て targetOrder より後ろにあるか）
  const dependents = currentOrderList.filter((t) =>
    t.prerequisiteTransitionIds.includes(transitionId)
  );
  for (const dep of dependents) {
    if (dep.order <= targetOrder) {
      return {
        canMove: false,
        reason: `依存されている「${dep.name}」（順序: ${dep.order}）より後ろには移動できません`,
      };
    }
  }

  return { canMove: true };
}

/**
 * 指定トランジションとその「強制連動が必要な」子孫を収集する。
 *
 * 連動ルール:
 *   子 C が連動対象になるのは「C の全 prereqs がすでに subtree に含まれている場合のみ」。
 *   例: 混合（prereqs=[A, B]）は、A と B の両方が subtree に含まれている場合だけ連動。
 *       B だけ移動するとき、A は subtree 外なので混合は連動しない。
 *
 * 返却値は currentOrder 順にソートされた TransitionOrderItem[]。
 */
export function collectTransitionSubtree(
  transitionId: string,
  allTransitions: TransitionOrderItem[]
): TransitionOrderItem[] {
  const subtreeIds = new Set<string>();

  // BFS で「全 prereqs が subtree 内に収まっている子」だけを追加していく
  const queue: string[] = [transitionId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (subtreeIds.has(id)) continue;
    subtreeIds.add(id);

    // このノードを subtree に追加したことで連動対象になる子を探す
    for (const child of allTransitions) {
      if (subtreeIds.has(child.id)) continue;
      // 子の全 prereqs が subtree に含まれている場合のみ連動
      const allPrereqsInSubtree = child.prerequisiteTransitionIds.every((prereqId) =>
        subtreeIds.has(prereqId)
      );
      if (allPrereqsInSubtree && child.prerequisiteTransitionIds.length > 0) {
        queue.push(child.id);
      }
    }
  }

  return allTransitions
    .filter((t) => subtreeIds.has(t.id))
    .sort((a, b) => a.order - b.order);
}

/**
 * 指定トランジションとその全子孫を targetOrder に移動する。
 * targetOrder は「移動対象グループの先頭が置かれるべき order 値」。
 *
 * アルゴリズム:
 *   1. 移動対象グループ（transitionId + 全子孫）を収集
 *   2. 残り（グループ以外）を元の order 順で並べる
 *   3. 残りの列の targetOrder-1 の位置にグループを挿入
 *   4. order を 1 から振り直す
 */
export function moveTransitionWithSubtree(
  transitionId: string,
  targetOrder: number,
  currentOrderList: TransitionOrderItem[]
): TransitionOrderItem[] {
  const subtree = collectTransitionSubtree(transitionId, currentOrderList);
  const subtreeIds = new Set(subtree.map((t) => t.id));

  // グループ以外を元の order 順で取得
  const others = currentOrderList
    .filter((t) => !subtreeIds.has(t.id))
    .sort((a, b) => a.order - b.order);

  // targetOrder-1 の位置にグループを挿入
  const insertAt = Math.max(0, Math.min(targetOrder - 1, others.length));
  const result = [
    ...others.slice(0, insertAt),
    ...subtree,
    ...others.slice(insertAt),
  ];

  // order を 1 から振り直す
  return result.map((item, i) => ({ ...item, order: i + 1 }));
}
