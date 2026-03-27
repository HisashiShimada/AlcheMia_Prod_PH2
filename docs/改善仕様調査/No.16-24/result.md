# 実施結果: ダイアログボタンラベル修正

## メタデータ
- **実施日時**: 2026-03-24 13:18
- **タスクID**: dialog-button-label-fix
- **参照計画書**: `docs/改善仕様調査/No.16-24/PLAN.md`

---

## 修正サマリー

| ファイル | 変更箇所 | 変更前 | 変更後 |
|---|---|---|---|
| `FormatEditorDialog.tsx` | 名前空間取り込みモーダル `okText` | `取り込み` | `取り込む` |
| `TemplateEditorDialog.tsx` | 名前空間取り込みモーダル `okText`（2箇所） | `取り込み` | `取り込む` |
| `BulkUploadDialog.tsx` | アップロード中断確認 `okText` | `はい` | `中断する` |
| `BulkUploadDialog.tsx` | アップロード中断確認 `cancelText` | `いいえ` | `続行` |
| `BulkUploadDialog.tsx` | アップロード中断確認 `okButtonProps` | （なし） | `{ danger: true }` |
| `FormatUploadDialog.tsx` | アップロード中断確認 `okText` | `はい` | `中断する` |
| `FormatUploadDialog.tsx` | アップロード中断確認 `cancelText` | `いいえ` | `続行` |
| `FormatUploadDialog.tsx` | アップロード中断確認 `okButtonProps` | （なし） | `{ danger: true }` |
| `FormatUploadDialog.tsx` | フォーマット未選択時フッターボタン | `閉じる` | `キャンセル` |
| `InstructionEditDialog.tsx` | 送信済指示「閉じる」ボタン `type` | `primary` | `default` |
| `SaveConfirmDialog.tsx` | キャンセルボタンラベル | `キャンセル` | `閉じる` |

---

## 詳細

### Phase 1: 表記ブレ修正

#### FormatEditorDialog.tsx
```diff
- okText="取り込み"
+ okText="取り込む"
```

#### TemplateEditorDialog.tsx
名前空間取り込みモーダルと取り込み確認ダイアログの2箇所を修正:
```diff
- okText="取り込み"
+ okText="取り込む"
```

---

### Phase 2: 目的との不整合修正

#### BulkUploadDialog.tsx
アップロード中断確認ダイアログのボタンを操作の意味が明確なラベルに変更し、危険な操作であることを視覚的に示す `danger` スタイルを追加:
```diff
- okText: 'はい',
- cancelText: 'いいえ',
- onOk: onClose,
+ okText: '中断する',
+ cancelText: '続行',
+ okButtonProps: { danger: true },
+ onOk: onClose,
```

#### FormatUploadDialog.tsx
BulkUploadDialog と同様の変更に加え、フォーマット未選択時に表示されるフッターボタンを通常時（アップロード可能時）と統一:
```diff
# 中断確認ダイアログ
- okText: 'はい',
- cancelText: 'いいえ',
- onOk: onClose,
+ okText: '中断する',
+ cancelText: '続行',
+ okButtonProps: { danger: true },
+ onOk: onClose,

# フォーマット未選択時フッター
- <Button key="close" onClick={onClose}>
-   閉じる
- </Button>
+ <Button key="cancel" onClick={onClose}>
+   キャンセル
+ </Button>
```

#### InstructionEditDialog.tsx
送信済指示の閲覧ダイアログは編集操作がなく「閉じる」のみのフッターであるため、プライマリボタン（青）は不適切。デフォルト（グレー）に変更:
```diff
- <Button key="close" type="primary" onClick={handleCancel}>
+ <Button key="close" type="default" onClick={handleCancel}>
    閉じる
  </Button>
```

#### SaveConfirmDialog.tsx（低優先）
このダイアログは保存先選択UIを含む「操作ダイアログ」であり、単純なキャンセルではなくダイアログを閉じる行為に相当するため、ラベルを変更:
```diff
- キャンセル
+ 閉じる
```

---

## テスト確認事項

- [ ] `FormatEditorDialog` — 名前空間取り込みモーダルの OKボタンが「取り込む」と表示されること
- [ ] `TemplateEditorDialog` — 同上（名前空間取り込み・確認ダイアログの2箇所）
- [ ] `BulkUploadDialog` — アップロード中にダイアログを閉じようとすると、確認ダイアログに赤い「中断する」ボタンが表示されること
- [ ] `FormatUploadDialog` — 同上 + フォーマット未選択時フッターが「キャンセル」と表示されること
- [ ] `InstructionEditDialog` — 送信済指示の詳細ダイアログで「閉じる」ボタンがグレー（非プライマリ）で表示されること
- [ ] `SaveConfirmDialog` — ボタンが「閉じる」と表示されること
