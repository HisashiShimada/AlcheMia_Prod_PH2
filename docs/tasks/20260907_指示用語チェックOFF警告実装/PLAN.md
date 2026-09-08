# タスク計画書: 指示用語チェックOFF時の警告実装

## メタデータ
- **作成日時**: 2026-09-07
- **タスクID**: 20260907_指示用語チェックOFF警告実装
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`NamespaceMain.tsx` の用語追加保存処理（`handleAddSave`）において、
「指示用語同時登録」チェックボックスをOFFにして保存した際に警告が出ない不具合を修正する。

### 現状の問題

1. **モック固定値による警告条件**（1175〜1183行目）
   ```typescript
   // 木村涼子（user-010）選択時は同用語名・別Prefix重複の警告を表示（保存は続行）
   if (effectiveNsKey === 'user-010') {
     Modal.confirm({ ... });
   }
   ```
   - 警告発火条件が `effectiveNsKey === 'user-010'` というモック固定値のため、実際の操作では絶対に発火しない
   - 警告内容も「指示用語チェックOFF」ではなく「重複用語」向けの内容になっている
   - `await` されていないため、仮に発火しても保存処理がそのまま続行してしまう

2. **本来あるべき挙動**
   - `createDirectiveTerm: false`（チェックOFF）の行がある場合、保存前に確認警告を表示
   - ユーザーが「キャンセル」を押した場合は保存処理を中断
   - ユーザーが「登録する」を押した場合は保存処理を続行

## 目的と期待される成果

- [x] チェックOFF行がある場合に `Modal.confirm` の警告が表示される
- [x] 警告で「キャンセル」を選択すると保存が中断される
- [x] 警告で「登録する」を選択すると保存が続行される
- [x] モック固定値 `effectiveNsKey === 'user-010'` の警告処理を削除する
- [x] 翻訳キーを `namespaceMain` セクションに追加する（ja/en）

## 実装ステップ

### Phase 1: 翻訳キー追加
- [x] `frontend/src/locales/ja.json`: `namespaceMain` セクションに以下を追加
  - `noDirectiveTermWarningTitle`: 「指示用語が登録されません」
  - `noDirectiveTermWarningContent`: 「指示用語チェックがOFFの用語があります。指示用語（SupervisorDirective{用語名}）は登録されません。このまま登録しますか？」
- [x] `frontend/src/locales/en.json`: 対応する英語キーを追加

### Phase 2: NamespaceMain.tsx の修正
- [x] モック固定値の警告ブロック（1175〜1183行目）を削除
- [x] `createDirectiveTerm: false` の行がある場合の警告処理を追加
  ```typescript
  // createDirectiveTerm が false の行がある場合、確認警告を表示
  const hasUnchecked = newTerms.some((r) => !r.createDirectiveTerm);
  if (hasUnchecked) {
    const confirmed = await new Promise<boolean>((resolve) => {
      const modalConfig = {
        title: t('namespaceMain.noDirectiveTermWarningTitle'),
        content: t('namespaceMain.noDirectiveTermWarningContent'),
        okText: t('namespaceMain.warnRegister'),
        cancelText: t('namespaceMain.warnCancel'),
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      };
      Modal.confirm(modalConfig);
    });
    if (!confirmed) return;
  }
  ```

## 変更ファイル

1. `frontend/src/locales/ja.json` - 翻訳キー2件追加
2. `frontend/src/locales/en.json` - 翻訳キー2件追加
3. `frontend/src/components/namespace/NamespaceMain.tsx` - モック警告削除・新警告ロジック追加

## リスク

| リスク | 対策 |
|--------|------|
| 既存の `warnDuplicateTitle` / `warnDuplicateContent` キーが他所で使われている可能性 | grep で使用箇所を確認し、未使用なら残置（削除しない） |
| `Modal.confirm` の `onOk`/`onCancel` が複数回呼ばれる可能性 | `resolve` を一度だけ呼ぶ実装（既存パターンに準拠） |

## テスト計画

- [ ] チェックOFF行がある状態で「保存」→ 警告モーダルが表示されること
- [ ] 警告で「キャンセル」→ 保存されず新規行が残ること
- [ ] 警告で「登録する」→ 保存が実行されること
- [ ] 全行チェックON の場合は警告モーダルが表示されないこと

## 承認記録
- **計画書提示日時**: 2026-09-07
- **承認日時**: 2026-09-07（act モードにて承認済み）
