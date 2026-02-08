# Research & Design Decisions

---
**Feature**: worker-instructions-api  
**Discovery Scope**: Extension  
**Key Findings**:
- 既存のプロジェクト管理APIシステムへの新規エンドポイント追加
- 認証・テナント分離パターンは確立済み
- 類似エンドポイント実装パターンを参照可能
- MAIMLファイルパーサーを活用

---

## Summary

### Discovery Scope
Extension - 既存システムへの新エンドポイント追加

### Key Findings
1. 既存認証・認可パターン確立済み
2. マルチテナント分離実装統一
3. 類似エンドポイント参照可能
4. MAIMLメタデータ抽出必要
5. パフォーマンス考慮必要

---

## Research Log

### 認証・認可パターン調査

**Context**: 既存パターン確認

**Sources**: authMiddleware.ts, projectRoutes.ts, api_project_management.md

**Findings**: authMiddlewareでJWT認証、req.userにユーザー情報格納

**Implications**: ルート定義でauthMiddlewareのみ適用、コントローラーでロールチェック

---

### マルチテナント分離調査

**Context**: テナント分離パターン確認

**Findings**: 全DBクエリにorganization_idフィルタ必須

**Implications**: 指示取得クエリにorganization_idフィルタ必須、JOIN全テーブルで指定

---

## Design Decisions

### Decision: アクセス制御方法

**Selected Approach**: コントローラー層でロールチェック

**Rationale**: 責務明確化、テスト容易性

---

### Decision: MAIMLパース最適化

**Selected Approach**: プロジェクトIDでグループ化

**Rationale**: N+1問題回避

---

## Risks & Mitigations

- Risk 1: パフォーマンス問題 → バッチ処理
- Risk 2: メモリ不足 → ページネーション検討
- Risk 3: テナント分離漏れ → 全クエリチェック

---

## References

- [API設計](../../../.clinerules/development/api.md)
- [バックエンド規約](../../../.clinerules/development/backend.md)
- [セキュリティ](../../../.clinerules/development/security.md)