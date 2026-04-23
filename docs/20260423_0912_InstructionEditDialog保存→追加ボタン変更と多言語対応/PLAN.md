# タスク計画書: InstructionEditDialog 保存→追加ボタン変更と多言語対応

## メタデータ
- **作成日時**: 2026-04-23 09:12
- **タスクID**: InstructionEditDialog_i18n
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`frontend/src/components/project/InstructionEditDialog.tsx` に対して以下の2点を実施する。

1. フッターの「保存」ボタンを「追加」ボタンに変更する（ラベル・アイコン変更）
2. コンポーネント内のすべてのハードコード日本語文字列を多言語対応（`useLanguage` / `t()`）に切り替える

## 目的と期待される成果

- [ ] フッターの primary ボタンが「保存」から「追加」に変わり、アイコンも `SaveOutlined` → `PlusOutlined` に変更される
- [ ] コンポーネント内のすべての日本語ハードコード文字列が `t()` 経由になる
- [ ] `ja.json` / `en.json` に `instructionEditDialog` セクションが追加される

## 実装ステップ

### Phase 1: ロケールファイル更新
- [ ] `frontend/src/locales/ja.json` に `instructionEditDialog` セクションを追加
- [ ] `frontend/src/locales/en.json` に `instructionEditDialog` セクションを追加

### Phase 2: InstructionEditDialog.tsx 修正
- [ ] `useLanguage` の import を追加
- [ ] コンポーネント内で `const { t } = useLanguage()` を宣言
- [ ] 「保存」ボタンのラベルを `t('instructionEditDialog.saveButton')` に変更、アイコンを `PlusOutlined` に変更
- [ ] フッターのその他ボタン（閉じる・キャンセル・連続指示）を `t()` に変更
- [ ] Modal title を `t()` に変更
- [ ] Form ラベル・placeholder・バリデーションメッセージを `t()` に変更
- [ ] Alert 内テキストを `t()` に変更
- [ ] `SaveOutlined` の不要 import を削除

## 変更ファイル

1. `frontend/src/locales/ja.json` — `instructionEditDialog` セクション追加
2. `frontend/src/locales/en.json` — `instructionEditDialog` セクション追加
3. `frontend/src/components/project/InstructionEditDialog.tsx` — ボタン変更 + 多言語対応

## 対象文字列一覧

### モーダル・ボタン

| 箇所 | 現在の値 | キー |
|------|---------|------|
| Modal title（送信済） | `指示詳細` | `instructionEditDialog.titleDetail` |
| Modal title（新規） | `新規指示の追加` | `instructionEditDialog.titleCreate` |
| Modal title（編集） | `指示の編集` | `instructionEditDialog.titleEdit` |
| 閉じるボタン | `閉じる` | `common.close` （既存） |
| キャンセルボタン | `キャンセル` | `common.cancel` （既存） |
| 連続指示ボタン | `連続指示` | `instructionEditDialog.saveAndContinueButton` |
| **保存ボタン** | `保存` → **`追加`** | `instructionEditDialog.saveButton` |

### フォーム

| 箇所 | 現在の値 | キー |
|------|---------|------|
| 指示対象セクションラベル | `🎯 指示対象` | `instructionEditDialog.targetLabel` |
| プロジェクト全体 | `プロジェクト全体` | `instructionEditDialog.wholeProject` |
| 優先度 ラベル | `優先度` | `instructionEditDialog.priorityLabel` |
| 優先度 必須メッセージ | `優先度を選択してください` | `instructionEditDialog.priorityRequired` |
| タイプ ラベル | `タイプ` | `instructionEditDialog.typeLabel` |
| タイプ 必須メッセージ | `タイプを選択してください` | `instructionEditDialog.typeRequired` |
| 対象タスク ラベル | `🎯 対象タスク` | `instructionEditDialog.taskLabel` |
| タスク番号 placeholder | `タスク番号を選択...` | `instructionEditDialog.taskPlaceholder` |
| タスク {taskNum} | `タスク {taskNum}` | `instructionEditDialog.taskOption` |
| トランジションID ラベル | `🔗 トランジションID` | `instructionEditDialog.transitionLabel` |
| トランジション placeholder | `トランジションを選択...` | `instructionEditDialog.transitionPlaceholder` |
| Alert: 選択中 | `選択中:` | `instructionEditDialog.alertSelected` |
| Alert: カテゴリ | `カテゴリ:` | `instructionEditDialog.alertCategory` |
| Alert: 説明 | `説明:` | `instructionEditDialog.alertDescription` |
| 指示内容 ラベル | `指示内容` | `instructionEditDialog.contentLabel` |
| 指示内容 必須メッセージ | `指示内容を入力してください` | `instructionEditDialog.contentRequired` |
| 指示内容 最大文字数エラー | `1000文字以内で入力してください` | `instructionEditDialog.contentMaxLength` |
| 指示内容 placeholder | `作業者への具体的な指示を入力してください...` | `instructionEditDialog.contentPlaceholder` |

## 技術的詳細

### 多言語対応パターン（プロジェクト標準）
```tsx
// import
import { useLanguage } from '@/contexts/LanguageContext';

// コンポーネント内
const { t } = useLanguage();

// 使用例
t('instructionEditDialog.saveButton')
```

### ボタン変更内容
```tsx
// 変更前
<Button
  key="save"
  type="primary"
  icon={<SaveOutlined />}
  onClick={handleSave}
>
  保存
</Button>

// 変更後
<Button
  key="save"
  type="primary"
  icon={<PlusOutlined />}
  onClick={handleSave}
>
  {t('instructionEditDialog.saveButton')}
</Button>
```

### `PlusOutlined` について
すでに `import { PlusOutlined } from '@ant-design/icons'` が存在するため追加不要。
`SaveOutlined` は他の箇所で使用されていなければ import から削除する。

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存テストの文字列マッチング失敗 | 低 | 低 | テストでは `data-testid` を使用しているため影響なし |
| en.json の翻訳漏れ | 低 | 低 | ja.json と同じキー構造で英語訳を追加する |

## 承認記録
- **計画書提示日時**: 2026-04-23 09:12
- **承認日時**: （承認後記入）
- **承認者コメント**: （ユーザーからのフィードバック）
