# MAIMLバリデーション結果モーダル UI設計書

## メタデータ
- **画面名**: MAIMLバリデーション結果モーダル
- **物理名**: MaimlValidationModal.tsx
- **ファイルパス**: `frontend/src/components/project/MaimlValidationModal.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-08-14
- **最終更新日**: 2026-08-14
- **担当者**: Development Team
- **バージョン**: 1.0.0

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
3. 再バリデーション実行ボタン

---

## 2. 画面レイアウト

```
┌────────────────────────────────────────────────────────┐
│ Modal                                                  │
│ Title: MAIMLバリデーション結果                          │
├────────────────────────────────────────────────────────┤
│ Body:                                                  │
│                                                        │
│ 最終バリデーション: YYYY/MM/DD HH:mm:ss                │
│ 結果: [✅ 正常] または [⚠ N件の警告] [❌ N件のエラー] │
│                                                        │
│ ▼ エラー（N件）                                        │
│   ・ [エラーメッセージ]                                │
│   ・ ...                                               │
│ ▼ 警告（N件）                                          │
│   ・ [警告メッセージ]                                  │
│   ・ ...                                               │
│                                                        │
├────────────────────────────────────────────────────────┤
│ Footer: [閉じる]  [再バリデーション]                    │
└────────────────────────────────────────────────────────┘
```

---

## 3. コンポーネント Props 定義

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

## 4. 表示ロジック

### 4.1. savedValidationRow のパース

`savedValidationRow` の JSONB フィールドはDBからオブジェクトまたは文字列として届く。
`parseJsonField` ヘルパーで安全にパースして `AnalysisResult` 型に変換。

```typescript
function parseJsonField<T>(field: unknown, fallback: T): T {
  if (field === null || field === undefined) return fallback;
  if (typeof field === 'string') {
    try { return JSON.parse(field) as T; } catch { return fallback; }
  }
  return field as T;
}
```

### 4.2. 結果なし時

`savedValidationRow` が `null` の場合、「バリデーション結果がありません」を表示。

---

## 5. 再バリデーションボタン活性条件

| 条件 | ボタン状態 |
|------|-----------|
| `hasMaimlContent=false` | 非活性 |
| `isValidating=true` | ローディング |
| それ以外 | 活性 |

---

## 6. 使用コンポーネント

- `Modal` - ダイアログコンテナ
- `Card` - 結果サマリー表示
- `Collapse` / `List` - エラー・警告詳細
- `Tag` - 結果ステータス表示（`SafetyCertificateOutlined` / `WarningOutlined`）
- `Alert` - エラー/警告サマリー
- `Button` - 閉じる・再バリデーション
- `theme.useToken` - デザイントークン使用

---

## 7. 備考・注意事項

1. `ProjectManagement.tsx` から外出しされた独立コンポーネント。`ValidationPanel` と同様の表示ロジックを持つ。
2. データ取得はせず、親コンポーネントから `savedValidationRow` を受け取る。
