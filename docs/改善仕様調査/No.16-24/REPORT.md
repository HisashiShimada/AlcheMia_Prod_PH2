# ダイアログボタンラベル調査レポート

**調査日時**: 2026-03-23  
**調査対象**: `frontend/src/components/` 配下のすべてのダイアログ・モーダルコンポーネント

---

## 調査概要

各ダイアログコンポーネントのボタンラベルについて、以下の2点を調査した。

1. **ダイアログの目的とそぐわないボタンラベル**
2. **処理は同一なのに表記ブレがある箇所**

---

## 1. 表記ブレの問題

### 1-1. 「キャンセル」と「閉じる」の混在（最大の問題）

同じ「ダイアログを閉じて前の状態に戻る/破棄する」という操作に対して、`キャンセル` と `閉じる` が混在している。

| コンポーネント | ボタンラベル | 備考 |
|---|---|---|
| `editorv2/components/SaveDialog.tsx` | **キャンセル** | 保存ダイアログを閉じる |
| `editorv2/components/DocumentEditDialog.tsx` | **キャンセル** | Document編集を閉じる |
| `editorv2/components/WorkflowSelectorDialog.tsx` | **キャンセル** | ワークフロー選択を閉じる |
| `editorv2/components/FormatEditorDialog.tsx` | **キャンセル** | フォーマット編集を閉じる |
| `editorv2/components/TemplateEditorDialog.tsx` | **キャンセル** | テンプレート編集を閉じる |
| `viewer/dialogs/DocumentEditDialog.tsx` | **キャンセル** | Document編集を閉じる |
| `project/BulkUploadDialog.tsx` | **キャンセル** | アップロードダイアログを閉じる |
| `project/FormatUploadDialog.tsx` | **キャンセル** | アップロードダイアログを閉じる（通常時） |
| `project/MaimlPublishDialog.tsx` | **キャンセル** | 公開確認を閉じる |
| `project/MaimlUnpublishDialog.tsx` | **キャンセル** | 非公開確認を閉じる |
| `ExperimentWorker/IssueReportModal.tsx` | **キャンセル** | 問題報告を閉じる |
| `ExperimentWorker/MethodSelectionModal.tsx` | **キャンセル** | メソッド選択を閉じる |
| `ExperimentWorker/TaskSelectionDialog.tsx` | **キャンセル** | タスク選択を閉じる |
| `ExperimentWorker/UnifiedSelectionDialog.tsx` | **キャンセル** | 統合選択を閉じる |
| `progress/WorkProgressDetailDialog.tsx` | **閉じる** | 進捗詳細を閉じる（参照のみ） |
| `ExperimentWorker/InstructionConfirmationModal.tsx` | **閉じる** | 作業指示確認を閉じる（参照のみ） |
| `project/InstructionEditDialog.tsx` (送信済指示) | **閉じる** | 送信済み指示の詳細表示を閉じる（参照のみ） |
| `project/FormatUploadDialog.tsx` (フォーマット未選択時) | **閉じる** | 警告表示を閉じる |
| `editorv2/components/TemplateEditorDialog.tsx` (PlaceRef追加) | **閉じる** | サブダイアログを閉じる |

**判定**:
- `キャンセル` ＝ 編集・操作を中断する（変更を破棄して戻る）
- `閉じる` ＝ 参照専用ダイアログや、操作完了後に閉じる

この使い分けは **意図的な設計** としては妥当。ただし `FormatUploadDialog` のフォーマット未選択時に「閉じる」を使うのは、通常時の「キャンセル」と異なり若干の不統一がある（後述）。

---

### 1-2. 「取り込み」と「取り込む」の混在

同じ「名前空間インポート」操作のOKボタンに対して、`取り込み` と `取り込む` が混在している。

| コンポーネント | ダイアログ用途 | okText |
|---|---|---|
| `editorv2/components/FormatEditorDialog.tsx` | 名前空間ファイル選択確認ダイアログ | `取り込み` |
| `editorv2/components/FormatEditorDialog.tsx` | 重複チェック後の確認ダイアログ | `取り込む` |
| `editorv2/components/TemplateEditorDialog.tsx` | 名前空間ファイル選択確認ダイアログ | `取り込み` |
| `editorv2/components/TemplateEditorDialog.tsx` | 重複チェック後の確認ダイアログ | `取り込む` |

**問題点**: 同じ「インポートを実行する」という操作に対して、段階によって「取り込み」と「取り込む」が混在している。統一すべき（`取り込む` に統一が望ましい）。

---

## 2. ダイアログの目的とそぐわないボタンラベル

### 2-1. `SaveConfirmDialog.tsx` — キャンセルボタンの位置づけが不明確

**ダイアログ**: MaiML保存確認（バリデーションエラー検出時）

| ボタン | ラベル | 挙動 |
|---|---|---|
| 主アクション | `🔧 自動補正して保存` | 補正して保存 |
| 副アクション | `⚠️ エラーを無視して強制保存` or `💾 保存` | 強制保存 or 通常保存 |
| 閉じるボタン | **キャンセル** | ダイアログを閉じる |

**問題点**:
- エラーなし時のボタンラベルが `💾 保存` のみで、`キャンセル` と並ぶ構成。一般的な「保存ダイアログ」の構成として問題ない。
- ただしエラーあり時は「自動補正して保存」「強制保存」「キャンセル」の3択となり、`キャンセル` が「保存しない（編集画面に戻る）」の意味になる。この場合 `キャンセル` より `保存せずに戻る` や `閉じる` の方が意図が明確。

---

### 2-2. `BulkUploadDialog.tsx` / `FormatUploadDialog.tsx` — アップロード中断確認の「はい」/「いいえ」

**ダイアログ**: アップロード中にxボタンを押したときの確認ダイアログ

```
content: 'アップロード処理が進行中です。キャンセルしますか？'
okText: 'はい'
cancelText: 'いいえ'
```

**問題点**:
- `はい`/`いいえ` はYes/No形式だが、Ant Design の confirm ダイアログとしては一般的な使い方。
- ただし「はい」でアップロードを中断するという **破壊的操作** に `はい` という中立ラベルは、危険性が伝わりにくい。
- **推奨**: `okText: 'キャンセルする'`（または `中断する`）、`cancelText: '続ける'`（または `続行`）の方がダイアログの目的に合致する。
- 加えて、`okButtonProps: { danger: true }` が設定されていないため、破壊的操作ボタンが視覚的に区別されていない。

---

### 2-3. `DraftRestoreDialog.tsx` — キャンセルボタンが存在しない

**ダイアログ**: 一時保存データの復元確認

| ボタン | ラベル | 挙動 |
|---|---|---|
| セカンダリ | `新規作成/既存ファイルを開く` | 復元せず新規作成へ |
| プライマリ | `一時保存を復元する` | 復元する |

**問題点**:
- `onCancel={onClose}` が設定されているにもかかわらず、フッターに明示的な「キャンセル」ボタンがない。
- ×ボタンでは閉じられるが、「どちらも選ばずに戻る」操作が視覚的に隠れている。
- `新規作成/既存ファイルを開く` は長すぎてボタンラベルとして不自然。「新規/既存を開く」程度にする、または選択肢を2つに分ける設計が望ましい。

---

### 2-4. `project/InstructionEditDialog.tsx` — 送信済み指示の「閉じる」が `type="primary"` 

**ダイアログ**: 指示の新規追加・編集（送信済の場合は詳細表示専用）

```tsx
// 送信済：閉じるボタンのみ
<Button key="close" type="primary" onClick={handleCancel}>
  閉じる
</Button>
```

**問題点**:
- 参照専用（読み取り専用）モードの「閉じる」ボタンに `type="primary"` が付与されている。
- プライマリボタンは通常「最も重要なアクション（保存・確定）」に使うため、参照専用ダイアログの「閉じる」には `type="default"` が適切。

---

### 2-5. `editorv2/components/DraftManager.tsx` — 保存ダイアログのラベル

**ダイアログ**: 下書き（Draft）の新規保存

| ボタン | ラベル |
|---|---|
| キャンセル | `キャンセル` |
| 保存 | `保存` |

`okText="保存"` / `cancelText="キャンセル"` — これ自体は問題ないが、Popconfirm（削除確認）との間で`okText="削除"` が混在する。削除確認には `okButtonProps: { danger: true }` も付いているため視覚的には問題ないが、一覧として見ると若干の不統一感がある。

---

### 2-6. `viewer/dialogs/DocumentEditDialog.tsx` と `editorv2/components/DocumentEditDialog.tsx` — 「破棄」ボタン

両ファイルとも、未保存変更がある状態でキャンセルしようとすると以下の確認ダイアログが出る。

```
okText: '破棄'
cancelText: 'キャンセル'
```

**判定**: これは適切。「破棄（変更を捨てる）」vs「キャンセル（確認ダイアログ自体を閉じて戻る）」の使い分けは意図的で正しい。

---

## 3. 全体サマリー

### 🔴 要修正（表記ブレ）

| 問題 | 該当箇所 | 推奨修正 |
|---|---|---|
| 「取り込み」/「取り込む」混在 | `FormatEditorDialog.tsx`, `TemplateEditorDialog.tsx` | `取り込む` に統一 |

### 🟡 改善推奨（目的との不整合）

| 問題 | 該当箇所 | 推奨修正 |
|---|---|---|
| アップロード中断確認が「はい」/「いいえ」で破壊的操作が不明確 | `BulkUploadDialog.tsx`, `FormatUploadDialog.tsx` | `中断する`/`続行` に変更 + `danger: true` 追加 |
| `SaveConfirmDialog` のキャンセルが「編集に戻る」のに `キャンセル` | `SaveConfirmDialog.tsx` | `閉じる` または `保存せずに戻る` に変更 |
| 参照専用「閉じる」ボタンが `type="primary"` | `project/InstructionEditDialog.tsx` | `type="default"` に変更 |
| `FormatUploadDialog` の未選択時「閉じる」と通常時「キャンセル」の不統一 | `project/FormatUploadDialog.tsx` | 両方 `閉じる` に統一（未選択時も操作不能なため） |

### ✅ 問題なし（意図的な使い分け）

| 項目 | 判定理由 |
|---|---|
| 「キャンセル」と「閉じる」の使い分け（編集系 vs 参照系） | 参照専用ダイアログには「閉じる」が適切 |
| 「破棄」を使う確認ダイアログ | 変更の廃棄操作として適切 |
| 削除確認に `danger: true` | 視覚的に破壊的操作を明示しており適切 |
| 「確認完了」（InstructionConfirmationTab） | 操作内容（指示を既読にする）を明確に表現 |
| `DraftRestoreDialog` の「一時保存を復元する」 | 操作内容を明示しており適切 |

---

## 4. ボタン表記統一方針

2026-03-24 に方針を以下の通り合意・確定した。

| ダイアログ種別 | ボタン表記 |
|---|---|
| **入力・編集ができるダイアログ**（データを変更する操作を伴うもの） | **キャンセル** |
| **参照・確認専用のダイアログ**（内容を見るだけ、または操作完了後のもの） | **閉じる** または **戻る** |

---

## 5. reference版（frontend/src/reference/）のキャンセル表記調査

**調査日時**: 2026-03-24  
**調査対象**: `frontend/src/reference/components/` 配下のすべての `.js` / `.jsx` ファイル

### 5-1. reference版のキャンセル表記一覧

以下は UIに表示されるダイアログ・モーダルのキャンセルボタンを網羅したもの。

| ファイル | ダイアログ/モーダル | ボタンラベル | 種別判定 | 適否 |
|---|---|---|---|---|
| `PetriNetEditorV2/components/DocumentEditDialog.jsx` | Document編集ダイアログ | **キャンセル** | 編集系 | ✅ 適切 |
| `PetriNetEditorV2/components/DraftManager.jsx` | 新規Draft保存ダイアログ | **キャンセル** | 編集系 | ✅ 適切 |
| `PetriNetEditorV2/components/DraftManager.jsx` | Draft削除確認ダイアログ | **キャンセル** | 参照/確認系 | ❌ → `閉じる` に変更すべき |
| `PetriNetEditorV2/components/MethodTabPanel.jsx` | Method ID編集ダイアログ | **キャンセル** | 編集系 | ✅ 適切 |
| `PetriNetEditorV2/components/TemplateEditorDialog.jsx` | テンプレートエディタ（メイン） | **キャンセル** | 編集系 | ✅ 適切 |
| `PetriNetEditorV2/components/TemplateEditorDialog.jsx` | プロパティ追加モーダル | **キャンセル** | 編集系 | ✅ 適切 |
| `PetriNetEditorV2/components/TemplateEditorDialog.jsx` | Content追加モーダル | **キャンセル** | 編集系 | ✅ 適切 |
| `PetriNetEditorV2/components/TemplateEditorDialog.jsx` | 名前空間テンプレート取り込みダイアログ | **キャンセル** | 編集系 | ✅ 適切 |
| `PetriNetEditorV2/components/TemplateEditorDialog.jsx` (NestedPropertyEditor内) | 属性追加モーダル | **キャンセル** | 編集系 | ✅ 適切 |
| `PetriNetEditorV2/components/TemplateEditorDialog.jsx` (NestedPropertyEditor内) | 要素追加ダイアログ | **キャンセル** | 編集系 | ✅ 適切 |
| `PetriNetEditorV2/components/TemplateEditorDialog.jsx` (NestedPropertyEditor内) | 子要素追加ダイアログ | **キャンセル** | 編集系 | ✅ 適切 |
| `PetriNetEditorV2/components/TemplateEditorDialog.jsx` (NestedPropertyEditor内) | 同階層コピーダイアログ | **キャンセル** | 編集系 | ✅ 適切 |
| `PetriNetEditorV2/components/SaveConfirmDialog.jsx` | 保存確認ダイアログ | **戻る** | 確認系 | ✅ 既に正しい（別対応済み） |
| `PetriNetEditorV2/components/PropertyPanel.jsx` | ノード削除確認ダイアログ | **キャンセル** | 確認/参照系 | ❌ → `閉じる` に変更すべき |
| `PetriNetEditorV2/components/PropertyPanel.jsx` | 編集中断確認ダイアログ | **キャンセル** | 編集系（編集を続ける） | ✅ 適切 |
| `WorkerDashboard/WorkFinalization.js` | 作業終了確認ダイアログ | **キャンセル** | 確認系（確認後戻る） | ❌ → `戻る` に変更すべき |
| `admin/NamespaceEditor/index.js` | 各種編集ダイアログ（複数箇所） | **キャンセル** | 編集系 | ✅ 適切 |
| `admin/NamespaceEditor/NestedPropertyEditor.jsx` | 各種編集ダイアログ（複数箇所） | **キャンセル** | 編集系 | ✅ 適切 |
| `PasswordChangeDialog.jsx` | パスワード変更ダイアログ | **キャンセル** | 編集系 | ✅ 適切 |
| `ExperimentManager/components/BulkUploadManager.js` | アップロード中止ボタン | **キャンセル** | 操作中止系 | ✅ 適切 |
| `ExperimentManager/components/FileDisplayComponents.js` | ファイル操作ダイアログ | **キャンセル** | 編集系 | ✅ 適切 |
| `ExperimentManager/components/UploadProgressTracker.js` | アップロード進捗 | **キャンセル** | 操作中止系 | ✅ 適切 |

### 5-2. reference版で修正が必要な箇所

| ファイル | ダイアログ | 現状 | 修正後 |
|---|---|---|---|
| `PetriNetEditorV2/components/DraftManager.jsx` | Draft削除確認ダイアログ | **キャンセル** | **閉じる** |
| `PetriNetEditorV2/components/PropertyPanel.jsx` | ノード削除確認ダイアログ | **キャンセル** | **閉じる** |
| `WorkerDashboard/WorkFinalization.js` | 作業終了確認ダイアログ | **キャンセル** | **戻る** |

---

## 6. 修正が必要なファイル一覧

1. **`frontend/src/components/editorv2/components/FormatEditorDialog.tsx`**
   - `okText="取り込み"` → `okText="取り込む"` に変更（名前空間ファイル選択確認ダイアログ）

2. **`frontend/src/components/editorv2/components/TemplateEditorDialog.tsx`**
   - `okText="取り込み"` → `okText="取り込む"` に変更（名前空間ファイル選択確認ダイアログ）

3. **`frontend/src/components/project/BulkUploadDialog.tsx`**
   - `okText: 'はい'` → `okText: '中断する'`
   - `cancelText: 'いいえ'` → `cancelText: '続行'`
   - `okButtonProps: { danger: true }` を追加

4. **`frontend/src/components/project/FormatUploadDialog.tsx`**
   - `okText: 'はい'` → `okText: '中断する'`
   - `cancelText: 'いいえ'` → `cancelText: '続行'`
   - `okButtonProps: { danger: true }` を追加
   - フォーマット未選択時のフッター `閉じる` → 通常時と統一して `キャンセル` に変更（または逆に統一）

5. **`frontend/src/components/project/InstructionEditDialog.tsx`**
   - 送信済指示の `閉じる` ボタン: `type="primary"` → `type="default"` に変更

6. **`frontend/src/components/editorv2/components/SaveConfirmDialog.tsx`** (低優先)
   - キャンセルボタン: `キャンセル` → `閉じる` または `保存せずに戻る` に変更
