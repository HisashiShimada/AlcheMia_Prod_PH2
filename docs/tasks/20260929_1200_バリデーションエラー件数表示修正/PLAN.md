# タスク計画書: バリデーションエラー件数表示修正

## メタデータ
- **作成日時**: 2026-09-29 12:00
- **タスクID**: 20260929_1200
- **優先度**: 中
- **推定工数**: 0.5時間

---

## タスク概要

実験管理者メニュー > プロジェクト管理タブ > バリデーションエラー検出ダイアログ（`SaveConfirmDialog.tsx`）において、
「エラー詳細 (上位3件)」というラベルがエラー件数に関わらず常に「上位3件」と固定表示されている。
実際のエラー件数が3件未満の場合（例: 2件）でも「上位3件」と表示されてしまい、ユーザーに誤解を与える。

---

## 目的と期待される成果

- [ ] エラー件数が3件以下の場合: 「エラー詳細 (N件)」と実際の件数を表示する
- [ ] エラー件数が3件超の場合: 「エラー詳細 (上位3件)」と表示する（現状維持）

---

## 原因調査

### 問題の場所

`frontend/src/components/editorv2/SaveConfirmDialog.tsx` 74〜111行目

```typescript
const errorCollapseItems = [
  {
    key: 'errors',
    label: t('saveConfirmDialog.errorDetailLabel'),  // ← 常に固定キーを使用
    ...
  }
];
```

`ja.json`:
```json
"errorDetailLabel": "エラー詳細 (上位3件)"  // ← 件数に関わらず常に「上位3件」
```

### 2つの赤枠の評価

| 赤枠 | 表示内容 | 問題 |
|------|---------|------|
| 赤枠① 「エラー: 2件」 | errorCount=2 を正しく表示 | ✅ 正常 |
| 赤枠② 「エラー詳細 (上位3件)」 | 実際2件なのに「上位3件」 | ❌ バグ |

### 修正前フロー

```
Collapse label生成
  ↓
t('saveConfirmDialog.errorDetailLabel')
  ↓
常に固定: "エラー詳細 (上位3件)"  ← 件数に関わらず固定
  ↓
エラー2件でも「上位3件」表示 ❌
```

### 修正後フロー

```
Collapse label生成
  ↓
if (errorCount > 3)
  → t('saveConfirmDialog.errorDetailLabel')        = "エラー詳細 (上位3件)" ✅
else
  → t('saveConfirmDialog.errorDetailLabelWithCount')
      .replace('{count}', String(errorCount))      = "エラー詳細 (2件)" ✅
```

---

## 変更ファイル

| # | ファイル | 変更概要 |
|---|---------|---------|
| 1 | `frontend/src/locales/ja.json` | `errorDetailLabelWithCount` キー追加 |
| 2 | `frontend/src/locales/en.json` | `errorDetailLabelWithCount` キー追加 |
| 3 | `frontend/src/components/editorv2/SaveConfirmDialog.tsx` | label を動的生成に変更 |

---

## 実装ステップ

- [x] タスク計画書作成
- [x] `ja.json` に `errorDetailLabelWithCount` キーを追加
- [x] `en.json` に `errorDetailLabelWithCount` キーを追加
- [x] `SaveConfirmDialog.tsx` の label を動的生成に変更
- [x] フロントエンド TSエラー確認（今回変更ファイルに起因するエラーなし）

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 翻訳キー追加漏れ | 低 | ja.json / en.json 両方に追加 |
| TSエラー | 低 | ビルド確認で検出 |

---

## 影響範囲

- `SaveConfirmDialog.tsx` の表示ロジックのみ
- DB・バックエンド・他コンポーネントへの影響なし

---

## 承認記録

- **計画書提示日時**: 2026-09-29 12:00
- **承認日時**: 2026-09-29 12:00
- **承認者コメント**: ユーザー承認済み
