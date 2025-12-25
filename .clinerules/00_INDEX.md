# .clinerules 規約インデックス

このディレクトリには、mmdpfプロジェクトの開発規約が階層化されて格納されています。

## 📂 ディレクトリ構造

```
.clinerules/
├── 00_INDEX.md                    # このファイル
├── core/                          # コア規約（常に適用）
├── development/                   # 開発規約
├── operations/                    # 運用規約
└── references/                    # 参照資料
```

---

## 🎯 コア規約（Core Rules）

**すべてのタスクで適用される基本規約**

### [core/base.md](core/base.md)
- ロール定義（Web開発エキスパートエンジニア）
- 専門領域（React、Node.js、TypeScript、AWS）
- 期待する回答の品質基準
- 出力言語規約

### [core/project.md](core/project.md)
- プロジェクト名：mmdpf（マルチモーダルデータプラットフォーム）
- 目的・技術スタック
- フォルダ構成
- 主要機能・環境要件

### [core/workflow.md](core/workflow.md)
- タスク実行ワークフロー
- タスク計画書の作成ルール
- 承認プロセス
- 完了報告手順

---

## 💻 開発規約（Development Rules）

**コーディング・テスト・セキュリティに関する規約**

### [development/config.md](development/config.md)
- コーディング規約統合ドキュメント
- DRY、SOLID原則
- ファイル命名規則
- インポート順序、コメント規約

### [development/frontend.md](development/config.md#フロントエンド規約)
- React 18.2.0 + Next.js 15 + Ant Design v6
- コンポーネント設計原則
- Hooks使用順序
- スタイリング規約

### [development/backend.md](development/config.md#バックエンド規約)
- Node.js 18+ + Express.js + TypeScript
- レイヤードアーキテクチャ
- データベース操作規約
- セキュリティベストプラクティス

### [development/security.md](development/security.md)
- 機密ファイル管理
- ユーザー認証（JWT + Session Hybrid）
- マルチテナント分離
- ロールベースアクセス制御（RBAC）

### [development/test.md](development/test.md)
- テストコード配置
- テスト実行方法
- カバレッジ目標（70%以上）
- ベストプラクティス

---

## 🚀 運用規約（Operations Rules）

**デプロイ・インフラに関する規約**

### [operations/deploy.md](operations/deploy.md)
- Docker / AWS ECS デプロイメント
- 環境変数管理
- ロールバック手順
- モニタリング・トラブルシューティング

---

## 📚 参照資料（References）

**詳細な仕様・ガイドライン（必要時に参照）**

### [references/ui_policy.md](references/ui_policy.md)
- Ant Design v6 デザイントークン使用規約
- コンポーネント使用ガイドライン詳細
- レイアウト原則
- アクセシビリティ対応

### [references/document-structure.md](references/document-structure.md)
- ドキュメント構造ガイドライン
- ファイル分割ルール
- 相互参照の原則
- メタデータ・バージョン管理

### [references/a5er_specification.md](references/a5er_specification.md)
- A5:SQL Mk-2 ER図ファイル形式仕様書
- `.a5er` ファイルフォーマット詳細

---

## 🔍 使い方

### 新しいタスクを開始する時
1. `core/workflow.md` を確認してタスク計画書を作成
2. `core/base.md` でロール・期待値を確認
3. 必要に応じて `development/` の該当ファイルを参照

### フロントエンド開発時
1. `development/frontend.md` でコンポーネント設計を確認
2. `references/ui_policy.md` でAnt Design使用方法を確認

### バックエンド開発時
1. `development/backend.md` でアーキテクチャを確認
2. `development/security.md` でセキュリティ対策を確認
3. `development/test.md` でテスト方針を確認

### デプロイ時
1. `operations/deploy.md` でデプロイ手順を確認

---

## 📝 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2024-12-25 | 階層化整理（core/development/operations/references） | Cline |
| 2024-12-XX | 初版作成 | Development Team |

---

## ✅ ベストプラクティス

### DO（推奨）
✅ タスク開始時は必ず `core/workflow.md` を確認
✅ 開発中は該当する `development/` のファイルを参照
✅ 詳細なUI仕様が必要な時は `references/ui_policy.md` を参照
✅ 規約に不明点があれば ask_followup_question を使用

### DON'T（非推奨）
❌ 規約を無視してコーディングしない
❌ タスク計画書なしで実装を開始しない
❌ セキュリティ規約を軽視しない
