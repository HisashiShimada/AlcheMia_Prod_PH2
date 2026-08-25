# MAIMLバリデーション結果モーダル UI設計書

## メタデータ
- **画面名**: MAIMLバリデーション結果モーダル
- **物理名**: MaimlValidationModal.tsx
- **ファイルパス**: `frontend/src/components/project/MaimlValidationModal.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-08-14
- **最終更新日**: 2026-08-20
- **バージョン**: 1.1.0

---

## 1. 画面概要

### 1.1. 目的

プロジェクト管理画面から呼び出される、**MAIMLファイルのバリデーション結果を表示するモーダル**です。
DB保存済みの最終バリデーション日時と結果（エラー・警告の詳細）を表示し、再バリデーションを実行できます。

### 1.2. アクセス権限

| ロール | アクセス |
|--------|---------|
| `experiment_admin` | ✅ 閲覧・操作可 |
| `system_admin` | ✅ 閲覧・操作可 |
| `experiment_worker` | ❌ アクセス不可 |

### 1.3. 主要機能

1. DB保存済みの最終バリデーション日時を表示
2. バリデーション結果のエラー・警告詳細（Collapse + List）
3. 再バリデーション実行ボタン（ボディ内配置）

---

## 2. 画面レイアウト

```
┌────────────────────────────────────────────────────────┐
│ Modal (width=700)                                      │
│ Title: 🔍 MAIMLバリデーション                          │
├────────────────────────────────────────────────────────┤
│ Body:                                                  │
│                                                        │
│ [最終バリデーション日時バナー]                         │
│  SafetyCertificateOutlined/WarningOutlined             │
│  最終バリデーション: YYYY/MM/DD HH:mm:ss [問題なし/問題あり] │
│  ※savedValidationRow が null の場合:                  │
│   「まだバリデーションが実行されていません。」          │
│                                                        │
│ [再バリデーション実行] ボタン（ボディ内）              │
│                                                        │
│ [結果サマリーカード]                                   │
│  ✅ バリデーション成功 / ❌ バリデーション失敗          │
│  スキーマバージョン: x.x                               │
│  [致命的エラー: N] [編集可能エラー: N] [警告: N]       │
│                                                        │
│ ▼ エラー詳細（N件）                                    │
│   [編集可能/エラー] メッセージ                         │
│   XPath: ...                                           │
│   💡 修正案: ...                                       │
│                                                        │
│ ▼ 警告詳細（N件）                                      │
│   [warning] メッセージ                                 │
│   XPath: ...                                           │
│                                                        │
│ [✅ MAIMLファイルは有効です]  ← 成功時のみ Alert        │
│                                                        │
├────────────────────────────────────────────────────────┤
│ Footer: なし（footer={null}）                          │
└────────────────────────────────────────────────────────┘
```

---

## 3. モーダル設定

| 項目 | 値 |
|------|---|
| タイトル | `🔍 MAIMLバリデーション` |
| `width` | `700` |
| `footer` | `null`（フッターなし）|
| `destroyOnHidden` | `true` |
| `onCancel` | `onClose` |

---

## 4. コンポーネント Props 定義

```typescript
interface MaimlValidationModalProps {
  /** モーダル開閉状態 */
  open: boolean;
  /** モーダルを閉じるコールバック */
  onClose: () => void;
  /** DB保存済みバリデーション結果行 */
  savedValidationRow: MaimlAnalysisResultRow | null;
  /** バリデーション実行中フラグ */
  isValidating: boolean;
  /** MAIMLコンテンツが存在するか（ボタン活性制御用） */
  hasMaimlContent: boolean;
  /** 再バリデーション実行コールバック */
  onValidate: () => void;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `open` | `boolean` | ✅ | モーダル表示/非表示 |
| `onClose` | `() => void` | ✅ | 閉じるコールバック |
| `savedValidationRow` | `MaimlAnalysisResultRow \| null` | ✅ | DB保存済みバリデーション結果 |
| `isValidating` | `boolean` | ✅ | バリデーション実行中フラグ |
| `hasMaimlContent` | `boolean` | ✅ | MAIMLコンテンツ有無（ボタン活性制御）|
| `onValidate` | `() => void` | ✅ | 再バリデーション実行コールバック |

---

## 5. 表示ロジック

### 5.1. savedValidationRow のパース

`savedValidationRow` の JSONB フィールドはDBからオブジェクトまたは文字列として届く。
`parseJsonField` ヘルパーで安全にパースして `AnalysisResult` 型に変換。

```typescript
function parseJsonField<T>(field: unknown, fallback: T): T {
  if (field === null || field === undefined) return fallback;
  if (typeof field === 'string') {
    try { return JSON.parse(field) as T; } catch { return fallback; }
  }
  return field as T;  // すでにオブジェクト/配列の場合はそのまま返す
}
```

パースするフィールド: `errors`, `warnings`, `suggestions`, `statistics`

### 5.2. 結果なし時

`savedValidationRow` が `null` の場合:
```
まだバリデーションが実行されていません。
```
（`token.colorTextSecondary` で表示）

### 5.3. 最終バリデーション日時バナー

`savedValidationRow` が存在する場合に表示:
- 背景色: `is_valid` が `true` → `colorSuccessBg`、`false` → `colorWarningBg`
- ボーダー: 同様に `colorSuccessBorder` / `colorWarningBorder`
- アイコン: `SafetyCertificateOutlined`（成功）/ `WarningOutlined`（問題あり）
- 日時: `new Date(analysis_timestamp).toLocaleString('ja-JP')`
- タグ: 「問題なし」(success) / 「問題あり」(warning)

### 5.4. エラーの分類（2種類）

| 分類 | 条件 | Tag色 |
|------|------|-------|
| **致命的エラー** | `canBeIgnoredOnUpload === false` | `error`（赤）|
| **編集可能エラー** | `canBeIgnoredOnUpload === true` | `orange` |

### 5.5. 成功時 Alert

`displayResult.isValid === true` の場合のみ表示:
```
✅ MAIMLファイルは有効です
スキーマバリデーションに合格しました。
```
（`type="success"`, `showIcon`）

---

## 6. 再バリデーションボタン

ボディ内（フッターではない）に配置。

| 条件 | ボタン状態 | ラベル |
|------|-----------|--------|
| `hasMaimlContent=false` | 非活性（`disabled`）| `再バリデーション実行` |
| `isValidating=true` | ローディング（`loading`）| `バリデーション実行中...` |
| それ以外 | 活性 | `再バリデーション実行` |

- タイプ: `primary`
- アイコン: `SafetyCertificateOutlined`

---

## 7. 使用コンポーネント・型

### 7.1. Ant Design コンポーネント
- `Modal` - ダイアログコンテナ（`width=700`, `footer=null`, `destroyOnHidden`）
- `Button` - 再バリデーションボタン
- `Card` - 結果サマリー表示
- `Collapse` / `List` - エラー・警告詳細
- `Tag` - 結果ステータス表示（致命的エラー/編集可能エラー/警告/問題なし）
- `Alert` - 成功時メッセージ
- `Space`, `Typography`
- `theme.useToken` - デザイントークン使用

### 7.2. アイコン（@ant-design/icons）
- `SafetyCertificateOutlined` - 成功状態・再バリデーションボタン
- `WarningOutlined` - エラー・警告状態

### 7.3. 型定義
- `@/types/maimlEditor` - `MaimlAnalysisResultRow`
- `@/types/maimlValidation` - `AnalysisResult`

---

## 8. 備考・注意事項

1. `ProjectManagement.tsx` から外出しされた独立コンポーネント。`ValidationPanel` と同様の表示ロジックを持つ。
2. データ取得はせず、親コンポーネントから `savedValidationRow` を受け取る。
3. `footer={null}` のため閉じるボタンはない。`×` ボタン（`onCancel`）または `onClose` で閉じる。

---

## 9. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.1.0 | 2026-08-20 | 実装ベースで全面改訂（タイトル修正・フッターなし・width追加・destroyOnHidden追加・エラー2分類追加・エラー詳細XPath/修正案追加・再バリデーションボタン位置修正・結果なし文言修正）|
| 1.0.0 | 2026-08-14 | 初版作成 |
