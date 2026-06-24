# タスク計画書: 鍵管理画面の独立化（実験管理者メニューへ移動）

## メタデータ
- **作成日時**: 2026-06-23 08:38
- **タスクID**: key-management-standalone
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

現在、`EncryptionManagementModal`（プロジェクト管理画面から開くモーダル）内に「暗号化・復号化」タブと「鍵管理」タブがタブ切り替え式で共存している。

鍵は特定プロジェクトに紐づかない組織全体の共有リソースであるため、鍵管理を独立した画面として実験管理者メニューに追加する。

また、開発用途で作成していた独立ページ（`/encryption?project=xxx`）のモックページは削除する。

## 目的と期待される成果

- [ ] 実験管理者メニューに「鍵管理」タブが追加される
- [ ] `EncryptionManagement.tsx` がシンプルになる（鍵管理タブを削除、暗号化・復号化のみ）
- [ ] 開発用モックページ（`app/encryption/page.tsx`）が削除される
- [ ] `KeyManagement.tsx` が独立した画面コンテナから再利用される

## 実装ステップ

### Phase 1: 削除
- [ ] `frontend/src/app/encryption/page.tsx` を削除

### Phase 2: 新規作成
- [ ] `frontend/src/components/key-management/KeyManagementScreen.tsx` を作成

### Phase 3: 既存ファイルの修正
- [ ] `frontend/src/components/encryption/EncryptionManagement.tsx` - 鍵管理タブを削除
- [ ] `frontend/src/components/menus/ExperimentAdminMenu.tsx` - タブ5「鍵管理」を追加

### Phase 4: ドキュメント
- [ ] `docs/design/ui/ui_screen_list.md` に `KeyManagementScreen.tsx` を追加

## 変更ファイル

### 削除
1. `frontend/src/app/encryption/page.tsx` - 開発用モックページ（不要）

### 新規作成
1. `frontend/src/components/key-management/KeyManagementScreen.tsx` - 鍵管理画面コンテナ

### 修正
1. `frontend/src/components/encryption/EncryptionManagement.tsx` - 鍵管理タブ（key:'keys'）を削除
2. `frontend/src/components/menus/ExperimentAdminMenu.tsx` - タブ5「鍵管理」追加、コンテンツ表示追加

### ドキュメント更新
1. `docs/design/ui/ui_screen_list.md` - 新コンポーネント追加

## 技術仕様

### KeyManagementScreen.tsx の設計

```
frontend/src/components/key-management/
└── KeyManagementScreen.tsx
    - encryptionService.listKeys() で鍵一覧を取得
    - KeyManagement.tsx を内包して再利用
    - Spin / Alert でローディング・エラー状態を表示
```

### ExperimentAdminMenu.tsx への追加

```typescript
// インポート追加
import { KeyOutlined } from '@ant-design/icons';
import KeyManagementScreen from '@/components/key-management/KeyManagementScreen';

// tabItems に追加（key: '5'）
{
  key: '5',
  label: '鍵管理',
  icon: <KeyOutlined />,
}

// コンテンツエリアに追加（display: none パターンを踏襲）
<div style={{ display: currentTab === '5' ? 'block' : 'none', height: '100%', overflow: 'auto' }}>
  <KeyManagementScreen />
</div>
```

### EncryptionManagement.tsx の修正

- `Tabs` の `items` から `key: 'keys'` のタブオブジェクトを削除
- `KeyOutlined` の import を削除（EncryptionManagement.tsx 内で不要になるため）
- `activeTab` の状態管理は残す（暗号化・復号化タブのみになるが構造維持）
  - ※ タブが1つになるのでタブ自体を消してもよいが、将来的な拡張余地として維持

## アクセス権限

- 対象ロール: `experiment_admin`（実験管理者）のみ
- ExperimentAdminMenu 内に配置することで自動的に制御される

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| ExperimentAdminMenu の display:none パターンへの踏襲 | 低 | 既存タブ（1〜4）と同じパターンで実装 |
| EncryptionManagement の鍵管理タブ削除後の鍵セレクト | 低 | 鍵選択ドロップダウン（EncryptionConfigPanel）は維持するため問題なし |

## 承認記録
- **計画書提示日時**: 2026-06-23 08:38
- **承認日時**: 2026-06-23 08:39

## 実施記録

### 実施日時
開始: 2026-06-23 08:39
完了: 2026-06-23 08:41

### 計画からの変更点

- `frontend/src/app/encryption/page.tsx` は既に存在しなかったため削除作業は不要だった（自動的に完了）

### 作成・修正ファイル一覧

#### 新規作成
- `frontend/src/components/key-management/KeyManagementScreen.tsx` - 鍵管理画面コンテナ

#### 修正
- `frontend/src/components/menus/ExperimentAdminMenu.tsx` - タブ5「鍵管理」追加、KeyManagementScreen の display:none パターン組み込み
- `frontend/src/components/encryption/EncryptionManagement.tsx` - 鍵管理タブ（key:'keys'）削除、KeyOutlined インポート削除、KeyManagement インポート削除

#### ドキュメント更新
- `docs/design/ui/ui_screen_list.md` - 暗号化管理セクション（8コンポーネント）を追加

### 最終的な成果物
- [x] 実験管理者メニューに「鍵管理」タブ（タブ5）が追加された
- [x] `EncryptionManagement.tsx` がシンプルになった（暗号化・復号化のみ）
- [x] 開発用モックページ（`app/encryption/page.tsx`）は既に存在せず（削除済み確認）
- [x] `KeyManagement.tsx` が `KeyManagementScreen.tsx` を通じて独立画面として再利用される
