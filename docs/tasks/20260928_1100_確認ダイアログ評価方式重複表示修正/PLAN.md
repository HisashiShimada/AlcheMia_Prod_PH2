# タスク計画書: 確認ダイアログ「評価方式」重複表示修正

## メタデータ
- **作成日時**: 2026-09-28 11:20
- **タスクID**: 20260928_1100
- **優先度**: 低
- **推定工数**: 0.5時間

---

## 1. タスク概要

実験管理者メニュー > プロジェクト管理 > テンプレート編集 > Property への不確かさ付与時に表示される確認ダイアログ（Popconfirm）において、「評価方式」行が2行重複して表示されているバグを修正する。

---

## 2. 目的と期待される成果

- [x] 確認ダイアログに「評価方式」が1行だけ表示されること
- [x] ビルドエラー・TSエラーが発生しないこと

---

## 3. 原因調査

### 対象ファイル

`frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx`

### 原因

`confirmContent` JSXブロック（498〜522行目）内で、「評価方式」ラベルを持つ `<div>` ブロックが **2つ連続して定義**されている。

```tsx
// ── 重複している箇所 ──────────────────────────────────────────
// 509〜512行目: 通常スタイル（不要・削除対象）
<div style={confirmRowStyle}>
  <span style={confirmLabelStyle}>{t('uncertaintyCriteriaSelector.confirmLabelEvalType')}</span>
  <span>{isQuantitative ? t('...quantitativeEval') : t('...qualitativeEval')}</span>
</div>

// 513〜520行目: fontWeight:600 の太字スタイル（正しい方・残す）
<div style={confirmRowStyle}>
  <span style={confirmLabelStyle}>{t('uncertaintyCriteriaSelector.confirmLabelEvalType')}</span>
  <span style={{ fontWeight: 600 }}>
    {isQuantitative
      ? t('uncertaintyCriteriaSelector.quantitativeEval')
      : t('uncertaintyCriteriaSelector.qualitativeEval')}
  </span>
</div>
```

同一ラベル・同一値を持つ行が2行生成されるため、ダイアログに「評価方式」が2回表示される。

### 図解（confirmContent 構造）

```
confirmContent
├── [対象要素]    行  ← 正常
├── [評価基準]    行  ← 正常
├── [評価方式]    行  ← ❌ 通常スタイル（重複・不要）
└── [評価方式]    行  ← ✅ fontWeight:600（こちらが正しい）
```

---

## 4. 修正内容

### 修正方針

通常スタイルの重複行（509〜512行目）を削除し、`fontWeight: 600` の太字スタイル行（513〜520行目）のみ残す。

### 修正前後の機能フロー図

**修正前:**
```
[付与するボタン押下] → Popconfirm表示
  ├─ 対象要素: exam:Sample
  ├─ 評価基準: A（Uncertainty:projectA）
  ├─ 評価方式: 定量評価   ← 通常スタイル（重複・不要）
  └─ 評価方式: 定量評価   ← fontWeight:600
```

**修正後:**
```
[付与するボタン押下] → Popconfirm表示
  ├─ 対象要素: exam:Sample
  ├─ 評価基準: A（Uncertainty:projectA）
  └─ 評価方式: 定量評価   ← fontWeight:600（1行のみ）
```

---

## 5. 変更ファイル一覧

| # | ファイルパス | 変更内容 |
|---|------------|---------|
| 1 | `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx` | `confirmContent` 内の重複「評価方式」行（通常スタイル）を削除 |

**バックエンド変更: なし**  
**API変更: なし**  
**多言語ファイル変更: なし**

---

## 6. 影響範囲

- 変更箇所: `UncertaintyCriteriaSelectorModal.tsx` の表示JSX部分のみ（ロジック変更なし）
- 他コンポーネントへの影響: なし
- セキュリティへの影響: なし
- マルチテナント分離への影響: なし

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 削除する行を間違える | 低 | 低 | 残す方（fontWeight:600）は視覚的に明確なため、通常スタイル側を削除する方針で特定済み |

---

## 8. テスト計画

### 手動テスト
- [ ] テンプレート編集 > Property > 不確かさ付与ボタン押下 → 確認ダイアログに「評価方式」が1行だけ表示されること
- [ ] 定量評価・定性評価それぞれで確認

### ビルド確認
- [ ] フロントエンド `npm run build` エラーなし

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-28 11:20
- **承認日時**: 2026-09-28 11:20
- **承認者コメント**: Act モードにて承認済み

---

## 10. 実施記録

### 実施日時
開始: 2026-09-28 11:20
完了: 2026-09-28 11:25

### 最終的な成果物
- [x] `UncertaintyCriteriaSelectorModal.tsx` 重複行削除（509〜512行目の通常スタイルrowを削除）
- [x] フロントエンドビルド成功確認
