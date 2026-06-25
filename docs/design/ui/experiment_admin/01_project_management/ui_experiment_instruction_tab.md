# 実験指示タブ UI設計書

## メタデータ
- **画面名**: 実験指示タブ
- **物理名**: ExperimentInstructionTab.tsx
- **ファイルパス**: `frontend/src/components/project/ExperimentInstructionTab.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-06-22
- **最終更新日**: 2026-06-22
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

実験管理者（Manager）が、実験作業者による実験実施後の実績値を確認し、**タスクの承認またはNG記録**を行うためのタブコンポーネントです。
プロジェクト管理画面（ProjectManagement）のタブ3「指示管理」内のサブタブとして表示されます。

### 1.2. アクセス権限

| ロール | アクセス |
|--------|---------|
| `experiment_admin` | ✅ 閲覧・承認/NG操作可 |
| `system_admin` | ✅ 閲覧・承認/NG操作可 |
| `experiment_worker` | ❌ アクセス不可 |

### 1.3. 主要機能

1. メソッド選択ドロップダウンで対象メソッドを絞り込み
2. 実験指示テーブル（`ExperimentInstructionTable`）の表示
3. 実験計画ダイアログ（`ExperimentPlanDialog`）の起動ボタン
4. メソッドごとのデータ取得・再取得

---

## 2. 画面レイアウト

### 2.1. 全体構成

```
┌──────────────────────────────────────────────────────────────────┐
│ 実験指示タブ（ProjectManagement > Tab3「指示管理」 > SubTab「実験指示」）│
├──────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ ツールバー                                                   │  │
│ │  メソッド: [メソッド選択 ▼]    [実験計画指示]ボタン         │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │                                                            │  │
│ │ ExperimentInstructionTable                                 │  │
│ │（実験指示テーブル）                                          │  │
│ │                                                            │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ※ ExperimentPlanDialog（モーダル：クリック時に表示）              │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2. ツールバー構成

| UI要素 | 種別 | 説明 |
|--------|------|------|
| メソッドラベル | `Typography.Text` | 「メソッド:」固定テキスト |
| メソッド選択 | `Select` | プロジェクトに紐づくメソッドリスト |
| 実験計画指示ボタン | `Button` | ExperimentPlanDialogを開く（type: primary） |

---

## 3. コンポーネント Props 定義

```typescript
interface ExperimentInstructionTabProps {
  /** プロジェクトID（project_name） */
  projectId: string;
  /** プロジェクトのチェックアウト状態 */
  isCheckedOut: boolean;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `projectId` | `string` | ✅ | プロジェクトID（project_name） |
| `isCheckedOut` | `boolean` | ✅ | チェックアウト中かどうか（実験計画指示ボタンの有効/無効制御に使用） |

---

## 4. State 定義

| State名 | 型 | 初期値 | 説明 |
|---------|-----|--------|------|
| `selectedMethodId` | `string \| null` | `null` | 選択中のメソッドID |
| `methods` | `MethodOption[]` | `[]` | メソッド選択肢リスト |
| `isPlanDialogOpen` | `boolean` | `false` | ExperimentPlanDialogの表示状態 |
| `isLoading` | `boolean` | `false` | メソッド一覧ロード中フラグ |

```typescript
interface MethodOption {
  methodId: string;
  methodName: string;
}
```

---

## 5. メソッド選択コンポーネント

| 項目 | 値 |
|------|-----|
| コンポーネント | `Select`（Ant Design）|
| 幅 | 280px |
| プレースホルダー | 「メソッドを選択してください」 |
| データ取得元 | `GET /api/v1/projects/:projectId/methods` |
| 変更時 | `selectedMethodId` を更新、テーブルデータを再取得 |

**オプション形式**:
```typescript
options={methods.map(m => ({
  value: m.methodId,
  label: m.methodName,
}))}
```

---

## 6. 実験計画指示ボタン

| 項目 | 値 |
|------|-----|
| ラベル | 「実験計画指示」 |
| type | `primary` |
| アイコン | `EditOutlined` |
| disabled 条件 | `selectedMethodId === null \|\| isCheckedOut` |
| 押下時 | `isPlanDialogOpen = true` |

> **注意**: チェックアウト中（`isCheckedOut === true`）は実験計画を変更できないため、ボタンを無効化する。

---

## 7. API連携

### 7.1. 使用APIエンドポイント

| API | メソッド | パス | 用途 |
|-----|---------|------|------|
| メソッド一覧取得 | GET | `/api/v1/projects/:projectId/methods` | メソッド選択肢の取得 |
| 実験指示一覧取得 | GET | `/api/v1/projects/:projectId/experiment-instructions?methodId=xxx` | テーブルデータの取得（ExperimentInstructionTable へ渡す） |

### 7.2. データフロー

```
コンポーネントマウント時
  ↓
GET /api/v1/projects/:projectId/methods
  → methods リストを取得
  → 先頭メソッドを自動選択
  ↓
メソッド選択変更時
  → ExperimentInstructionTable に selectedMethodId を渡す
  → テーブル側で /experiment-instructions を呼び出し
```

---

## 8. 子コンポーネント連携

| コンポーネント | Props | 説明 |
|------------|-------|------|
| `ExperimentInstructionTable` | `projectId`, `methodId`, `onRefresh` | 実験指示テーブル本体 |
| `ExperimentPlanDialog` | `open`, `onClose`, `projectId`, `methodId`, `methodName` | 実験計画指示ダイアログ |

---

## 9. エラーハンドリング

| エラー | 表示方法 | メッセージ |
|--------|---------|----------|
| メソッド一覧取得失敗 | `message.error()` | 「メソッド一覧の取得に失敗しました」 |
| メソッドが0件 | テーブルエリアに `Empty` コンポーネント | 「メソッドがありません」 |

---

## 10. 使用コンポーネント

### Ant Design コンポーネント
- `Select` - メソッド選択
- `Button` - 実験計画指示ボタン
- `Space` - ツールバーの間隔制御
- `Typography.Text` - ラベルテキスト
- `Spin` - ロード中スピナー
- `message` - エラートースト

### カスタムコンポーネント
- `ExperimentInstructionTable` - 実験指示テーブル
- `ExperimentPlanDialog` - 実験計画指示ダイアログ

### アイコン
- `EditOutlined` - 実験計画指示ボタン
