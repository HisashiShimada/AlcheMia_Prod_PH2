# 作業者画面オーバーレイ UI仕様書

## 概要

### 目的
プロジェクト管理画面から作業者画面（ExperimentWorkerMenu）をモーダルオーバーレイとして表示するコンポーネント。実験管理者が作業者の視点で画面を確認できる。

### 使用場面
- プロジェクト管理画面のツールバーから「作業者画面」ボタンをクリック
- 実験管理者が作業者の作業内容を確認する際に使用
- プロジェクトに固定した状態で作業者画面を表示（プロジェクト変更不可）

### アクセス権限
- **Experiment Admin（実験管理者）**: 作業者画面の閲覧（読み取り専用）
- **その他のロール**: アクセス不可

---

## 画面構成

### レイアウト構造

```
┌────────────────────────────────────────────────────────┐
│ 👤 作業者画面 - Project001                       [×] │
├────────────────────────────────────────────────────────┤
│                                                        │
│  【ExperimentWorkerMenuコンポーネント】                │
│                                                        │
│  - プロジェクト固定（変更不可）                        │
│  - メソッド・タスクのドロップダウンは操作可能          │
│  - 「選択」「承認依頼」などのボタンはすべてdisabled    │
│  - Header / SubHeaderは非表示                         │
│                                                        │
│                                                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### UI要素

#### 1. モーダルヘッダー
- **アイコン**: 👤 `UserOutlined`（青色: `token.colorPrimary`）
- **タイトル**: 「作業者画面 - {プロジェクト名}」
  - `fixedProjectName`が指定されている場合: 「作業者画面 - {プロジェクト名}」
  - 未指定の場合: 「作業者画面」

#### 2. モーダル設定
- **幅**: `80vw`（画面幅の80%）
- **高さ**: `calc(80vh - 55px)`（画面高さの80% - タイトルバー分）
- **位置**: `top: 40px`、非中央配置（`centered={false}`）
- **フッター**: なし（`footer={null}`）
- **パディング**: `0`（body部分）
- **オーバーフロー**: `hidden`
- **閉じた後の破棄**: `destroyOnHidden`

#### 3. 内部コンポーネント
- **ExperimentWorkerMenu**: 作業者画面本体
  - `overlayMode`: オーバーレイモードで表示
  - `fixedProjectId`: プロジェクトを固定
  - `readOnly`: 読み取り専用モード（ボタン非活性）

---

## 機能仕様

### Props定義

```typescript
interface WorkerScreenOverlayProps {
  open: boolean;                       // モーダルの表示状態
  onClose: () => void;                 // モーダルを閉じるコールバック
  user: User;                          // ログインユーザー情報
  fixedProjectId?: string;             // 固定するプロジェクトID
  fixedProjectName?: string;           // 固定するプロジェクト名（タイトル表示用）
}
```

### Context連携

```typescript
const { token } = theme.useToken();    // Ant Design テーマトークン
```

### 主要機能

#### 1. タイトルの生成

```typescript
const titleLabel = fixedProjectName
  ? `作業者画面 - ${fixedProjectName}`
  : '作業者画面';
```

**表示例**:
- `fixedProjectName="Project001"` → 「作業者画面 - Project001」
- `fixedProjectName`未指定 → 「作業者画面」

#### 2. ExperimentWorkerMenuへのProps渡し

```typescript
<ExperimentWorkerMenu
  user={user}
  onLogout={() => {/* オーバーレイ内ではログアウト不要 */}}
  onNavigate={() => {/* オーバーレイ内では画面遷移不要 */}}
  overlayMode
  fixedProjectId={fixedProjectId}
  readOnly
/>
```

**Props説明**:
- `user`: ログインユーザー情報
- `onLogout`: 空関数（オーバーレイ内ではログアウト不要）
- `onNavigate`: 空関数（オーバーレイ内では画面遷移不要）
- **`overlayMode`**: オーバーレイモードフラグ（Header/SubHeader非表示）
- **`fixedProjectId`**: プロジェクトID固定（プロジェクト変更不可）
- **`readOnly`**: 読み取り専用モード（ボタン非活性）

---

## データ型定義

### User

```typescript
interface User {
  user_id: string;                     // ユーザーID
  username: string;                    // ユーザー名
  organization_id: string;             // 組織ID
  role_id: number;                     // ロールID
  // その他のユーザー情報...
}
```

---

## 特記事項

### オーバーレイモードの仕様

**制約事項**:
1. **プロジェクト固定**: `fixedProjectId`により選択中のプロジェクトに固定、変更不可
2. **読み取り専用**: `readOnly`により「選択」「承認依頼」などのボタンがすべて非活性
3. **Header/SubHeader非表示**: `overlayMode`によりヘッダー・サブヘッダーを非表示
4. **ログアウト・画面遷移無効**: オーバーレイ内ではログアウトと画面遷移を無効化

**操作可能な要素**:
- メソッドのドロップダウン選択
- タスクのドロップダウン選択
- 画面のスクロール
- モーダルの閉じるボタン

### モーダルサイズ

**サイズ計算**:
```typescript
width="80vw"                           // 画面幅の80%
styles={{
  body: {
    height: 'calc(80vh - 55px)',      // 画面高さの80% - タイトルバー分
    padding: 0,
    overflow: 'hidden',
  },
}}
```

**レスポンシブ対応**:
- `vw`（Viewport Width）単位を使用
- `vh`（Viewport Height）単位を使用
- 画面サイズに応じて自動的にリサイズ

### モーダルの破棄

**destroyOnHidden**:
- モーダルを閉じた後、DOMから完全に削除
- メモリリークを防ぐ
- 再度開いた時は新しいインスタンスを生成

### Appコンポーネントのラップ

```typescript
<App>
  <ExperimentWorkerMenu ... />
</App>
```

**理由**: Ant DesignのApp コンポーネントでラップすることで、message・notification・modalのコンテキストを提供

---

## 子コンポーネント

### ExperimentWorkerMenu

**用途**: 作業者画面本体

**Props**:
```typescript
{
  user: User;                          // ユーザー情報
  onLogout: () => void;                // ログアウトハンドラ（空関数）
  onNavigate: () => void;              // 画面遷移ハンドラ（空関数）
  overlayMode: boolean;                // オーバーレイモード（true）
  fixedProjectId?: string;             // 固定プロジェクトID
  readOnly: boolean;                   // 読み取り専用（true）
}
```

**overlayMode時の動作**:
- Header非表示
- SubHeader非表示
- プロジェクト選択ドロップダウン非活性
- メソッド・タスク選択ドロップダウンは活性（表示切り替え可能）

**readOnly時の動作**:
- 「選択」ボタン非活性
- 「承認依頼」ボタン非活性
- その他の操作ボタン非活性
- 閲覧のみ可能

---

## 実装ファイル情報

### パス
```
frontend/src/components/project/WorkerScreenOverlay.tsx
```

### 主要な依存パッケージ
- `antd`: UI コンポーネント（Modal, theme, App）
- `@ant-design/icons`: アイコン（UserOutlined）
- `react`: React本体

### 子コンポーネント
- `ExperimentWorkerMenu`: 作業者画面本体（`@/components/menus/ExperimentWorkerMenu`）

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|---------|--------|
| 1.0 | 2026-03-11 | 実装ベースで仕様書を新規作成（実装ファイル: WorkerScreenOverlay.tsx） | Cline |

---

## 関連ドキュメント

- [プロジェクト管理画面](ui_project_management.md)
- [実験作業者メニュー](../04_experiment_worker/ui_experiment_worker_menu.md)
