# .clinerules 規約インデックス

このディレクトリには、mmdpfプロジェクトの開発規約が階層化されて格納されています。

## 📂 ディレクトリ構造の概要

### .clinerules/ (プロジェクト規約)
プロジェクト固有の開発規約、セキュリティルール、参照資料を格納

```
.clinerules/
├── 00_INDEX.md                    # このファイル
├── core/                          # コア規約（常に適用）
├── development/                   # 開発規約
└── references/                    # 参照資料
```

### .cline/skills/ (Clineスキル定義)
Clineの動作を制御するスキル定義ファイルを格納

**⚠️ 重要**: `.clinerules/` とは別のディレクトリです

```
.cline/skills/
├── backend-develop-skill/
│   └── SKILL.md
├── frontend-develop-skill/
│   └── SKILL.md
└── test-skill/
    └── SKILL.md
```

### 関係性
- **`.clinerules/`** → 主要な規約とリファレンス（最優先）
- **`.cline/skills/`** → 補足的なガイドライン（追加情報）

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
- タスク専用フォルダの作成ルール
- タスク計画書の作成ルール
- 承認プロセス
- 完了報告手順
- レポート管理（docs/直下の.mdファイル参照禁止）

### [core/workflow-spec-impl.md](core/workflow-spec-impl.md)
- spec-implワークフロー実行時の注意事項
- ソースコード実装の必須化
- 実装確認チェックポイント
- 誤った実行パターンの回避方法

---

## 💻 開発規約（Development Rules）

**コーディング・テスト・セキュリティに関する規約**

### [development/config.md](development/config.md)
- コーディング規約統合ドキュメント
- DRY、SOLID原則
- ファイル命名規則
- インポート順序、コメント規約

### [development/security.md](development/security.md)
- 機密ファイル管理
- ユーザー認証（JWT + Session Hybrid）
- マルチテナント分離
- ロールベースアクセス制御（RBAC）

### [development/file-writing.md](development/file-writing.md)
- ファイル書き込みツールの使い分け
- write_fileツールの制約事項
- replace_in_fileツールの活用
- 大規模ファイル書き込みワークフロー
- トラブルシューティング

### [development/command-execution.md](development/command-execution.md)
- コマンド実行ベストプラクティス
- Pending問題の回避方法
- echo+リダイレクトの注意点
- cd+複数コマンドチェーンの対処法
- インタラクティブコマンドの回避
- 長時間実行プロセスの対応
- コマンドテンプレート集

### [development/database.md](development/database.md)
- データベース操作の統一化
- Repository層のInsert/Update処理の標準化
- テーブル型を活用した汎用的なDB操作メソッド
- トランザクション処理のベストプラクティス
- SQLインジェクション対策

### [development/typescript.md](development/typescript.md)
- TypeScript型定義の作成・管理・利用規約
- 型定義ファイルへの集約ルール
- Object型の明示的な型定義
- 型の再利用性とネーミング規則
- ジェネリック型の活用

---

## 📚 参照資料（References）

**詳細な仕様・ガイドライン（必要時に参照）**

### [references/s3_structure.md](references/s3_structure.md)
- S3/Swiftフォルダ構成定義
- マルチテナント分離（org_{organization_id}プレフィックス）
- プロジェクト・実験記録・テンプレート・ワークフローの階層構造
- セキュリティとアクセス制御（署名付きURL）
- 実装ガイドライン（storageService.ts使用方法）

---

## 🔍 使い方

### 新しいタスクを開始する時
1. `core/workflow.md` を確認してタスク計画書を作成
2. `core/base.md` でロール・期待値を確認
3. 必要に応じて `development/` の該当ファイルを参照

---

## 📝 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-02-18 | database.md追加（Repository層のDB操作統一化規約） | Cline |
| 2026-02-18 | typescript.md追加（TypeScript型定義管理規約） | Cline |
| 2026-02-18 | workflow.md更新（タスク専用フォルダ作成ルール・レポート管理追加） | Cline |
| 2026-02-17 | s3_structure.md更新（組織プレフィックス形式から組織ID（UUID）形式に変更） | Cline |
| 2026-02-16 | skillsに移動したドキュメントを削除 | yukihiro.omori |
| 2026-02-03 | workflow-spec-impl.md追加（spec-implワークフロー実行時の注意事項） | Cline |
| 2026-01-14 | command-execution.md追加（コマンド実行ベストプラクティス） | Cline |
| 2026-01-09 | s3_structure.md追加（S3/Swiftフォルダ構成定義） | Cline |
| 2026-01-09 | ui_structure.md追加（画面構成定義・110+コンポーネント管理） | Cline |
| 2024-12-25 | 階層化整理（core/development/operations/references） | Cline |
| 2024-12-XX | 初版作成 | Development Team |

---

## ✅ ベストプラクティス

### DO（推奨）
✅ タスク開始時は必ず `core/workflow.md` を確認
✅ 開発中は該当する `development/` のファイルを参照
✅ 規約に不明点があれば ask_followup_question を使用

### DON'T（非推奨）
❌ 規約を無視してコーディングしない
❌ タスク計画書なしで実装を開始しない
❌ セキュリティ規約を軽視しない
