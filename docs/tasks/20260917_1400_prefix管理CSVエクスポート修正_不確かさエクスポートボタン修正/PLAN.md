# タスク計画書: prefix管理CSVエクスポート修正・不確かさ基準エクスポートボタン仕様変更

## メタデータ
- **作成日時**: 2026-09-17 14:00
- **優先度**: 中
- **推定工数**: 0.5時間

---

## タスク概要

### 修正①: Prefix管理 CSVエクスポート
`PrefixManagement.tsx` の CSVエクスポートを用語管理（`NamespaceMain.tsx`）と同仕様に統一する。
- 現状: 全行エクスポート（チェックボックス選択を無視）、データ0件でエラー
- 修正後: チェックボックス選択行のみエクスポート、0件選択でエラーメッセージ

### 修正②: 不確かさ基準管理 エクスポートボタン
`UncertaintyManagement.tsx` のエクスポートボタンを用語管理の仕様に合わせる。
- 現状: `selectedIds.length === 0` のとき `disabled`（ボタン非活性）
- 修正後: ボタン常時活性 → 押下時に0件チェック → エラーメッセージ表示

---

## 調査結果

### 根本原因の図解

#### ① Prefix管理 CSVエクスポート

```
【修正前】
CSVエクスポートボタン押下
  ↓
rows.length === 0 → message.error（データなし）
  ↓
全rowsをCSVエクスポート ← チェックボックス選択を無視

【修正後（用語管理と同仕様）】
CSVエクスポートボタン押下
  ↓
selectedRowKeys.length === 0 → message.error（少なくとも1件選択してください）
  ↓
selectedRowKeysに一致するrowsのみCSVエクスポート
```

#### ② 不確かさ基準管理 エクスポートボタン

```
【修正前】
selectedIds.length === 0 → ボタン disabled（非活性・グレーアウト）
selectedIds.length > 0  → ボタン活性 → クリックでモーダル表示

【修正後（用語管理と同仕様）】
ボタン常時活性
  ↓ クリック
selectedIds.length === 0 → message.error（エラーメッセージ表示）
selectedIds.length > 0  → UncertaintyExportModal 表示
```

---

## 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/locales/ja.json` | `prefixManagement` セクションに `exportSelectAtLeastOne` キー追加 |
| 2 | `frontend/src/locales/en.json` | 同上（英語版） |
| 3 | `frontend/src/components/namespace/PrefixManagement.tsx` | `handleCsvDownload` を `selectedRowKeys` ベースに修正 |
| 4 | `frontend/src/components/uncertainty/UncertaintyManagement.tsx` | エクスポートボタンの `disabled` 削除・`onClick` に0件チェック追加 |

---

## 実装ステップ
- [ ] `ja.json` に `prefixManagement.exportSelectAtLeastOne` キー追加
- [ ] `en.json` に `prefixManagement.exportSelectAtLeastOne` キー追加
- [ ] `PrefixManagement.tsx` の `handleCsvDownload` 修正
- [ ] `UncertaintyManagement.tsx` のエクスポートボタン修正
- [ ] フロントエンドビルドエラー確認

---

## リスク
| リスク | 対策 |
|--------|------|
| selectedRowKeys は複合キー（`prefix__scopeKey`）なので、rows.filter で絞り込む | `rows.filter(r => selectedRowKeys.includes(r.id))` で対応可能 |

---

## テスト計画
- [ ] Prefix管理でチェックボックス0件 → CSVエクスポートボタン押下 → エラーメッセージ表示
- [ ] Prefix管理でチェックボックス1件以上 → CSVエクスポートボタン押下 → 選択行のみCSV出力
- [ ] 不確かさ基準管理でチェックボックス0件 → エクスポートボタンが活性状態 → 押下でエラーメッセージ
- [ ] 不確かさ基準管理でチェックボックス1件以上 → エクスポートボタン押下 → モーダル表示

---

## 承認記録
- **計画書提示日時**: 2026-09-17 14:00
- **承認日時**: 2026-09-17 15:33
- **承認者コメント**: 承認（Act モード移行）

---

## 実施記録

### 実施日時
開始: 2026-09-17 15:33
完了: 2026-09-17 15:45

### 変更点
計画通りに実施。追加変更なし。

### 最終的な成果物
- [x] ja.json 修正完了（prefixManagement.exportSelectAtLeastOne / uncertainty.management.exportSelectAtLeastOne 追加）
- [x] en.json 修正完了（同上、英語版）
- [x] PrefixManagement.tsx 修正完了（handleCsvDownload を selectedRowKeys ベースに変更）
- [x] UncertaintyManagement.tsx 修正完了（エクスポートボタン disabled 削除・onClick に0件チェック追加）
- [x] TypeScriptエラーなし（r.id を React.Key へキャストして型整合性確保）
