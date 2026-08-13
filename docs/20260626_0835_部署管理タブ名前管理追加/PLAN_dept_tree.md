# タスク計画書: 名前空間ツリーへの部署ノード追加機能

## メタデータ
- **作成日時**: 2026-06-26 08:55
- **タスクID**: dept-tree-node-management
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

名前管理タブに「部署ツリー管理」サブタブを追加し、
名前空間ツリーに表示される部署ノードの一覧・追加・編集・削除ができる機能を実装する。

## 変更ファイル

### 新規作成
1. `frontend/src/components/namespace/DepartmentTreeManagement.tsx` - 部署ノード一覧・管理画面
2. `frontend/src/components/namespace/DepartmentNodeAddDialog.tsx` - 部署ノード追加ダイアログ

### 修正
1. `frontend/src/components/menus/SystemAdminMenu.tsx` - 「部署ツリー管理」タブを追加

## タブ構成（完成後）

```
タブ4: 部署管理
├── サブタブ「部署一覧」       → DepartmentManagement（既存）
└── サブタブ「名前管理」
    ├── 「部署ツリー管理」     ← 今回追加
    ├── 「用語Prefix管理」     → PrefixManagement（既存）
    └── 「用語管理」           → NamespaceMain（既存）
```

## 実装ステップ

- [x] タスク計画書の作成
- [ ] DepartmentNodeAddDialog.tsx の作成
- [ ] DepartmentTreeManagement.tsx の作成
- [ ] SystemAdminMenu.tsx の修正（タブ追加）
