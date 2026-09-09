# タスク計画書: 不確かさ基準新規作成保存メッセージバグ修正

## メタデータ
- **作成日時**: 2026-09-09 14:00
- **タスクID**: 不確かさ基準新規作成保存メッセージバグ修正
- **優先度**: 中
- **推定工数**: 0.25時間

## タスク概要

「不確かさ基準一覧」画面にて「＋ 新規不確かさ基準」から新規作成・保存した際、
成功トーストメッセージが `V{1} として保存しました` と表示されるバグを修正する。

### 症状

```
期待: V1 として保存しました
実際: V{1} として保存しました
```

### 根本原因

`frontend/src/locales/ja.json` の `uncertaintyCreate.savedAs` に、
プロジェクトの翻訳エンジン（`LanguageContext.tsx`）が対応していない
**二重括弧 `{{version}}`** が誤って使われていた。

翻訳エンジンのパラメータ置換ロジック（正規表現 `\{key\}`）は
**単一括弧 `{key}`** のみを置換対象とする。

```
入力文字列 : "V{{version}} として保存しました"
パラメータ : { version: "1" }

\{version\} が {{version}} 内の {version} にのみマッチ
↓
"V{" + "1" + "} として保存しました"
↓
結果: "V{1} として保存しました"  ← バグ
```

### 関連コンポーネント・ファイル

| ファイル | 役割 |
|---|---|
| `frontend/src/locales/ja.json` | 翻訳定義（バグ箇所） |
| `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx` | 新規作成モーダル（`t('uncertaintyCreate.savedAs', { version: ... })` を呼び出す） |
| `frontend/src/contexts/LanguageContext.tsx` | 翻訳エンジン（単一括弧 `{key}` 形式のみサポート） |

## 目的と期待される成果

- [x] `V{version} として保存しました` と正しく表示されること
- [x] `uncertaintyDetail.savedAs`（編集保存）と同じ形式に統一されること

## 実装ステップ

- [x] STEP 1: タスクフォルダ・PLAN.md 作成
- [ ] STEP 2: `frontend/src/locales/ja.json` の `uncertaintyCreate.savedAs` を修正
- [ ] STEP 3: 修正後ファイルの検証（JSON 構文チェック・値確認）

## 変更ファイル

| # | ファイル | 操作 | 変更内容 |
|---|---|---|---|
| 1 | `frontend/src/locales/ja.json` | **修正（1行）** | L3876: `"V{{version}} として保存しました"` → `"V{version} として保存しました"` |

## 影響範囲

### 変更対象
- 名前空間管理 > 不確かさ基準一覧 > 「＋ 新規不確かさ基準」モーダル（`UncertaintyCreateModal`）の保存成功トースト

### 影響なし
- `UncertaintyDetailModal`（編集・保存）: 元々 `{version}` で正常
- バックエンド・DB・API・型定義: 変更なし
- `en.json`: 元々 `{version}` で正常

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| JSON フォーマット破損 | 高 | 低 | 変更は文字列内の `{{` → `{` のみ。修正後に `ConvertFrom-Json` で JSON 構文確認 |
| 他翻訳キーへの副作用 | 低 | 低 | 変更は1行のみ。周辺キーは変更なし |

## テスト計画

- [ ] `ja.json` が有効な JSON として解析できること
- [ ] `uncertaintyCreate.savedAs` の値が `"V{version} として保存しました"` になっていること
- [ ] `uncertaintyDetail.savedAs` と形式が統一されていること（`"V{version} として保存しました"`）

## 承認記録

- **計画書提示日時**: 2026-09-09 14:00
- **承認日時**: 2026-09-09 14:00
- **承認者コメント**: Act モードへの切り替えによる承認

## 実施記録

### 実施日時
開始: 2026-09-09 14:00
完了: 2026-09-09 14:10

### 計画からの変更点
なし

### 発生した問題と解決方法
- PowerShell の `ConvertFrom-Json` コマンドで `ja.json` を読み込む際に文字化けエラーが発生したが、これはシェルのエンコーディング問題であり JSON 自体の問題ではない
- Node.js `require()` で JSON 構文を再確認し、正常であることを確認済み

### 最終的な成果物
- [x] `frontend/src/locales/ja.json` 修正完了
  - `uncertaintyCreate.savedAs`: `"V{{version}} として保存しました"` → `"V{version} として保存しました"`
  - `uncertaintyDetail.savedAs`（変更なし）: `"V{version} として保存しました"` — 両キーが同一形式に統一
