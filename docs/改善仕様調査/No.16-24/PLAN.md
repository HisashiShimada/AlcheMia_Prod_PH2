# タスク計画書: ダイアログボタンラベル修正

## メタデータ
- **作成日時**: 2026-03-24 11:13
- **タスクID**: dialog-button-label-fix
- **優先度**: 中
- **推定工数**: 2時間
- **参考資料**: `docs/20260323_1550_ダイアログボタンラベル調査/REPORT.md`

## タスク概要

調査レポートに基づき、ダイアログボタンラベルの表記ブレ・目的との不整合を修正する。

**方針**: 編集系ダイアログ→「キャンセル」、参照・確認専用ダイアログ→「閉じる」or「戻る」

---

## 目的と期待される成果

- [ ] ボタンラベルの表記が統一されていること
- [ ] ダイアログの目的と合ったボタンラベルになっていること
- [ ] 破壊的操作の確認ダイアログが視覚的に明確になっていること

---

## 実装ステップ

### Phase 1: 🔴 要修正（表記ブレ）

- [ ] `FormatEditorDialog.tsx` — `okText="取り込み"` → `okText="取り込む"` に変更
- [ ] `TemplateEditorDialog.tsx` — `okText="取り込み"` → `okText="取り込む"` に変更

### Phase 2: 🟡 改善推奨（目的との不整合）

- [ ] `BulkUploadDialog.tsx` — アップロード中断確認ダイアログのボタンラベル変更
  - `okText: 'はい'` → `'中断する'`
  - `cancelText: 'いいえ'` → `'続行'`
  - `okButtonProps: { danger: true }` を追加
- [ ] `FormatUploadDialog.tsx` — アップロード中断確認ダイアログのボタンラベル変更
  - `okText: 'はい'` → `'中断する'`
  - `cancelText: 'いいえ'` → `'続行'`
  - `okButtonProps: { danger: true }` を追加
  - フォーマット未選択時フッターの「閉じる」→「キャンセル」（通常時と統一）
- [ ] `InstructionEditDialog.tsx` — 送信済指示の「閉じる」ボタン `type="primary"` → `type="default"` に変更
- [ ] `SaveConfirmDialog.tsx` — キャンセルボタン `キャンセル` → `閉じる` に変更（低優先）

---

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `frontend/src/components/editorv2/components/FormatEditorDialog.tsx` | `okText="取り込み"` → `取り込む` |
| `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx` | `okText="取り込み"` → `取り込む` |
| `frontend/src/components/project/BulkUploadDialog.tsx` | 中断確認ダイアログのボタンラベル変更 + danger追加 |
| `frontend/src/components/project/FormatUploadDialog.tsx` | 中断確認ダイアログのボタンラベル変更 + danger追加 + 未選択時「閉じる」→「キャンセル」 |
| `frontend/src/components/project/InstructionEditDialog.tsx` | 送信済「閉じる」ボタン `type="primary"` → `type="default"` |
| `frontend/src/components/editorv2/components/SaveConfirmDialog.tsx` | `キャンセル` → `閉じる` （低優先） |

---

## リスク

| リスク | 対策 |
|---|---|
| ラベル変更による既存テストの失敗 | 変更後にテスト実行して確認 |
| 想定外の箇所でラベルが参照されている | search_filesで変更箇所を事前確認 |

---

## テスト計画

- [ ] 各ダイアログを実際に開き、変更後のボタンラベルを目視確認
- [ ] アップロード中断確認ダイアログの danger ボタン（赤色）が表示されることを確認
- [ ] 送信済指示ダイアログの「閉じる」ボタンが非プライマリ（グレー）で表示されることを確認

---

## 承認記録
- **計画書提示日時**: 2026-03-24 11:13
- **承認日時**: 
- **承認者コメント**: 
