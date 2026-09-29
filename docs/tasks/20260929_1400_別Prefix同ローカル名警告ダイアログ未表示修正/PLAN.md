# タスク計画書: 別Prefix同ローカル名警告ダイアログ未表示修正

## メタデータ
- **作成日時**: 2026-09-29 17:10
- **タスクID**: 20260929_1400
- **優先度**: 高
- **推定工数**: 0.5時間

---

## 1. タスク概要

実験管理者メニュー > 名前空間管理タブ > prefix管理 > 用語管理において、
**別Prefixで同ローカル名の用語を新規追加して「保存」ボタンを押下しても、
警告ダイアログが表示されない**バグの修正。

`ja.json` (L5247-5250) に定義済みの以下のメッセージが、呼び出しコードなしに
放置されていることが原因。

| キー | 値 |
|------|-----|
| `namespaceMain.warnDuplicateTitle` | 同用語名・別Prefix重複の警告 |
| `namespaceMain.warnDuplicateContent` | 別Prefixに同名の用語が既に存在します。それでも登録しますか？ |
| `namespaceMain.warnRegister` | 登録する |
| `namespaceMain.warnCancel` | キャンセル |

---

## 2. 目的と期待される成果

- [x] 別Prefix・同ローカル名の用語を追加して保存ボタンを押下したとき、`modal.confirm` 警告ダイアログが表示される
- [x] 「キャンセル」を選択したとき、保存処理が中断される
- [x] 「登録する」を選択したとき、保存処理が続行される

---

## 3. 調査結果・原因説明

### 原因図解

```
handleAddSave() 関数（NamespaceMain.tsx L1225〜）
  │
  ├── バリデーション（L1229〜1233）
  │     prefix必須 / localName必須 / NCName形式チェック
  │
  ├── setIsSaving(true)  ← ここから try ブロック
  │
  ├── 指示用語OFFチェック（L1240〜1255）
  │     createDirectiveTerm=false の行があれば modal.confirm
  │
  ├── createTerm API × N行（L1258〜1293）
  │     409/E6005 → modal.error（完全一致重複エラー）
  │
  └── 成功件数メッセージ → setNewTerms([])

★ 「別Prefix・同ローカル名チェック」が完全に欠落している！
```

### 既存の重複関連コード

| コード | 場所 | 動作 |
|--------|------|------|
| `_isDuplicate` フラグ更新 | `updateNewTerm` L1212 | 入力中リアルタイム：**完全一致**（prefix+localName 両方一致）のみ |
| `modal.error` | `handleAddSave` L1280 | API が 409/E6005 を返したとき（完全一致重複） |
| `warnDuplicateTitle` 等のキー | `ja.json` L5247〜5250 | 定義済みだが**呼び出し箇所がない** |

---

## 4. 実装内容

### 修正箇所

**ファイル**: `frontend/src/components/namespace/NamespaceMain.tsx`

**位置**: `handleAddSave` 内の `setIsSaving(true)` 直後、`createDirectiveTerm` チェックの**前**（L1238 直後）

**追加コード**:

```typescript
// 別Prefix・同ローカル名の重複チェック
// 既存用語（terms）と localName が一致し、かつ prefix が異なる行を検出する
const crossPrefixRows = newTerms.filter(
  (row) =>
    row.prefix &&
    row.localName &&
    terms.some((t) => t.localName === row.localName && t.prefix !== row.prefix)
);
if (crossPrefixRows.length > 0) {
  const confirmed = await new Promise<boolean>((resolve) => {
    const warnConfig = {
      title: t('namespaceMain.warnDuplicateTitle'),
      content: t('namespaceMain.warnDuplicateContent'),
      okText: t('namespaceMain.warnRegister'),
      cancelText: t('namespaceMain.warnCancel'),
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    };
    modal.confirm(warnConfig);
  });
  if (!confirmed) return; // finally ブロックで setIsSaving(false) が自動実行される
}
```

---

## 5. 機能フロー図

### 修正前

```
保存ボタン押下
  → handleAddSave()
    → バリデーション（prefix必須・localName必須・NCName）
    → setIsSaving(true)
    → 指示用語OFFチェック → modal.confirm
    → createTerm API × N行
      → 409/E6005 → modal.error（完全一致エラー）
    → 成功件数メッセージ → setNewTerms([])
    ↓
  ※ 別Prefix・同ローカル名は警告なしに登録される ← BUG
```

### 修正後

```
保存ボタン押下
  → handleAddSave()
    → バリデーション（prefix必須・localName必須・NCName）
    → setIsSaving(true)
  ★ → 別Prefix・同ローカル名チェック
  ★   → 該当あり → modal.confirm（warnDuplicateTitle / warnDuplicateContent）
  ★     → キャンセル → return（保存中断）
  ★     → 登録する  → 続行 ↓
    → 指示用語OFFチェック → modal.confirm
    → createTerm API × N行
      → 409/E6005 → modal.error（完全一致エラー）
    → 成功件数メッセージ → setNewTerms([])
```

---

## 6. 変更ファイル一覧

| # | ファイル | 変更種別 | 変更内容 |
|---|---------|---------|---------|
| 1 | `frontend/src/components/namespace/NamespaceMain.tsx` | 修正 | `handleAddSave` に別Prefix・同ローカル名警告チェックを追加（約15行） |

バックエンドへの変更なし。

---

## 7. 影響範囲

- **変更ファイル数**: 1
- **バックエンドへの影響**: なし
- **他コンポーネントへの影響**: なし

---

## 8. リスク

| リスク | 対策 |
|--------|------|
| デグレード | 既存の `noDirectiveTermWarning` と全く同パターンのため極低リスク |
| `terms` stateが古い | `withAncestors=true` で取得済みのため問題なし |

---

## 9. テスト計画

### 手動テスト
- [ ] 既存用語と同ローカル名・別Prefixの用語を追加 → 保存 → 警告ダイアログが表示されることを確認
- [ ] 「キャンセル」を選択 → 保存が中断されることを確認
- [ ] 「登録する」を選択 → 保存が続行されることを確認
- [ ] 同Prefix・同ローカル名（完全一致重複）の場合 → 警告なし（API側でエラー）を確認
- [ ] 既存ロジック（指示用語OFFチェック）が引き続き動作することを確認

---

## 10. 承認記録

- **計画書提示日時**: 2026-09-29 17:10
- **承認日時**: 2026-09-29（ユーザー承認済み）
- **承認者コメント**: act モードへの切り替えにより承認

---

## 11. 実施記録

### 実施日時
開始: 2026-09-29 17:10
完了: 2026-09-29 17:15

### 最終的な成果物
- [x] `frontend/src/components/namespace/NamespaceMain.tsx` 修正（`handleAddSave` に別Prefix・同ローカル名警告チェックを追加）
- [x] TypeScript コンパイルエラーなし（tsc --noEmit: 0 errors）
