# タスク計画書: 課題調査-310 用語追加時 scopeKey 変換不具合修正

## メタデータ

- **作成日時**: 2026-08-31
- **タスクID**: 課題調査-310（追加調査）
- **優先度**: 高
- **推定工数**: 0.5時間

---

## タスク概要

名前空間管理タブの用語管理画面で、Personalノード選択中に用語を追加しようとすると
「システムエラーが発生しました」が表示される不具合を修正する。

### 再現手順

1. prefix「Uncertainty」を作成
2. 用語管理タブで用語を追加ボタン押下
3. prefix「Uncertainty」、ローカル名「Sample」、表示名「サンプル」、説明「サンプル」、
   データ型・単位は空白で保存ボタン押下
4. システムエラーが発生しました、メッセージが表示される

---

## 原因分析

### 根本原因: `handleAddSave` 内の `scopeKey` 変換漏れ

`handleAddSave`（NamespaceMain.tsx）内で用語登録APIを呼ぶ際、
`scopeKey` として `effectiveNsKey`（ツリーノードキー）をそのまま渡している。

Personal ノードのキーは `'personal-user-xxx'` 形式だが、
DB の `namespace.scope_key` には `'user-xxx'`（`personal-` なし）が格納されており、
SQLでの検索がヒットせず 500 エラーとなる。

```typescript
// 現状（バグ）
scopeKey: effectiveNsKey ?? undefined,
// effectiveNsKey = 'personal-user-abc123' → DBには 'user-abc123' が格納されているためヒットしない
```

同コンポーネントの `fetchTermsForCurrentNsKey` では正しく変換済み:
```typescript
const scopeKey = nsKey.replace(/^personal-/, ''); // ← この変換が handleAddSave に欠けている
```

---

## 目的と期待される成果

- [ ] Personal ノード選択中に用語を追加してもシステムエラーが発生しない
- [ ] `personal-` プレフィックスを除去した userId が scopeKey として渡される

---

## 実装ステップ

- [ ] `handleAddSave` 内の scopeKey 生成ロジックを修正
- [ ] TypeScript コンパイルエラーなし確認

---

## 変更ファイル

1. `frontend/src/components/namespace/NamespaceMain.tsx` - `handleAddSave` 内 scopeKey 生成を修正

---

## 修正内容詳細

### 修正箇所（L1055付近）

```typescript
// 修正前（バグ）
scopeKey: effectiveNsKey ?? undefined,

// 修正後
// Personal ノードの場合は 'personal-' プレフィックスを除去して userId のみ渡す
const PERSONAL_ROOT_KEY = 'personal';
const personalKeySetForSave = new Set(personalChildren.map((n) => n.key));
let scopeKeyForCreate: string | undefined;
if (!effectiveNsKey || effectiveNsKey === PERSONAL_ROOT_KEY) {
  scopeKeyForCreate = currentUserPersonalKey || undefined;
} else if (personalKeySetForSave.has(effectiveNsKey)) {
  scopeKeyForCreate = effectiveNsKey.replace(/^personal-/, '') || undefined;
} else {
  scopeKeyForCreate = effectiveNsKey;
}
// ...
scopeKey: scopeKeyForCreate,
```

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 組織グループノード選択時の動作への影響 | 低 | 低 | else 節でそのまま渡すため影響なし |

---

## テスト計画

### 手動テスト

- [ ] Personal ノード選択中に用語を追加 → システムエラーなく登録成功
- [ ] 組織グループノード選択中に用語を追加 → 従来通り動作
- [ ] Global ノード選択中に用語を追加 → 従来通り動作

---

## 承認記録

- **計画書提示日時**: 2026-08-31
- **承認日時**: 2026-08-31（会話内での承認）

---

## 実施記録

### 実施日時

開始: 2026-08-31
完了: 2026-08-31

### 計画からの変更点

なし

### 発生した問題と解決方法

なし

### 最終的な成果物

- [x] `handleAddSave` 内 scopeKey 生成ロジック修正（`effectiveNsKey` → `scopeKeyForCreate` に変換）
- [x] 旧 `scopeKey: effectiveNsKey ?? undefined` の記述が残存しないこと確認済み
- [x] TypeScript コンパイルエラーなし確認済み（NamespaceMain.tsx 起因エラーなし）
