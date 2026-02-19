# タスク計画書: projectRepository.ts 規約準拠修正

## メタデータ
- **作成日時**: 2026-02-18 16:23
- **更新日時**: 2026-02-18 16:28（DB規約更新に伴う修正）
- **タスクID**: projectRepository規約準拠修正
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

`backend/src/repositories/projectRepository.ts`を`.clinerules/development/database.md`の規約に従って修正します。現在のクラスベース実装を関数ベース実装に変更し、汎用的な`insert`/`update`メソッドを実装して、保守性と一貫性を向上させます。

## 2. 目的と期待される成果

### 目的
- データベース操作規約への準拠
- Repository層の実装統一化
- 保守性・可読性・拡張性の向上
- 型安全性の確保

### 期待される成果
- [ ] 規約に準拠した関数ベースの実装
- [ ] 汎用的な`insert`メソッドの実装
- [ ] 汎用的な`update`メソッドの実装
- [ ] 適切な型定義の使用
- [ ] 既存機能の維持（後方互換性）

## 3. 実装ステップ

### Phase 1: 現状分析と型定義の整備
- [ ] projectテーブルのスキーマを確認
- [ ] 型定義ファイル（types/database.ts）が存在するか確認
- [ ] 存在しない場合、Project型をtypes/database.tsに定義
- [ ] instruction.tsのProject型との関係を整理

### Phase 2: Repository実装の修正
- [ ] クラスベースから関数ベースに変更
- [ ] `insert`関数の実装（規約準拠の動的SQLクエリ構築、clientパラメータなし）
- [ ] `update`関数の実装（規約準拠の動的SQLクエリ構築、clientパラメータなし）
- [ ] `getById`関数の実装（既存の`findById`をリネーム、clientパラメータなし）
- [ ] 既存の`updateStatus`機能を維持（後方互換性のため残す）

### Phase 3: 使用箇所の確認と修正
- [ ] projectRepositoryを使用している箇所を検索
- [ ] 必要に応じて呼び出し側のコードを修正
- [ ] インポート文の修正（クラスから関数へ）

### Phase 4: テストとドキュメント
- [ ] 修正内容の動作確認
- [ ] 既存機能が正常に動作することを確認
- [ ] コメント・JSDocの追加

## 4. 影響範囲

### 変更するファイル
1. `backend/src/repositories/projectRepository.ts` - Repository実装の全面的な書き換え
2. `backend/src/types/database.ts` - Project型定義の追加（存在しない場合）
3. (必要に応じて) projectRepositoryを使用しているファイル
   - services層
   - controllers層

### 影響を受ける機能
- プロジェクトの作成（insert機能追加）
- プロジェクトの更新（update機能追加）
- プロジェクトの取得（既存機能を維持）
- プロジェクトステータス更新（既存機能を維持）

## 5. 技術的詳細

### 規約に従った実装パターン

#### 型定義（backend/src/types/database.ts）
```typescript
/**
 * projectテーブルの型定義
 */
export interface Project {
  organization_id: string;
  project_id: string;
  project_name: string;
  project_status: number;
  project_overview?: string;
  created_at: Date;
  updated_at: Date;
  created_user_id?: string;
  updated_user_id?: string;
}
```

#### Repository実装（backend/src/repositories/projectRepository.ts）
```typescript
import { getPool } from '../database/db';
import { Project } from '../types/database';

/**
 * プロジェクトをInsert
 * @param data Insertするプロジェクトデータ（テーブル型Object）
 * @returns Insertされたプロジェクト
 */
export async function insert(
  data: Project
): Promise<Project> {
  const pool = getPool();
  
  // データからカラム名と値を抽出（undefinedは除外）
  const columns = Object.keys(data).filter(key => data[key] !== undefined);
  const values = columns.map(col => data[key]);
  
  // プレースホルダーを生成 ($1, $2, $3, ...)
  const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
  
  // SQLクエリを構築
  const query = `
    INSERT INTO project (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * プロジェクトをUpdate
 * @param data 更新するプロジェクトデータ（テーブル型Object）
 * @returns 更新されたプロジェクト
 */
export async function update(
  data: Project
): Promise<Project> {
  const pool = getPool();
  
  // WHERE句で使用するカラム（project_id と organization_id）
  const whereColumns = ['project_id', 'organization_id'];
  const whereValues = whereColumns.map(col => data[col]);
  
  // 更新するカラム（WHERE句で使用するカラムを除外）
  const updateColumns = Object.keys(data).filter(
    key => !whereColumns.includes(key) && data[key] !== undefined
  );
  const updateValues = updateColumns.map(col => data[col]);
  
  // SET句を構築 (project_name = $1, project_status = $2, ...)
  const setClause = updateColumns
    .map((col, idx) => `${col} = $${idx + 1}`)
    .join(', ');
  
  // WHERE句を構築 (project_id = $N AND organization_id = $N+1)
  const whereClauseStr = whereColumns
    .map((col, idx) => `${col} = $${updateColumns.length + idx + 1}`)
    .join(' AND ');
  
  // SQLクエリを構築
  const query = `
    UPDATE project
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP
    WHERE ${whereClauseStr}
    RETURNING *
  `;
  
  const allValues = [...updateValues, ...whereValues];
  const result = await pool.query(query, allValues);
  
  if (result.rows.length === 0) {
    throw new Error(`No rows updated in project table`);
  }
  
  return result.rows[0];
}

/**
 * プロジェクトを取得（Update前に使用）
 * @param projectId プロジェクトID
 * @param organizationId 組織ID
 * @returns プロジェクト
 */
export async function getById(
  projectId: string,
  organizationId: string
): Promise<Project | null> {
  const pool = getPool();
  
  const query = `
    SELECT * FROM project
    WHERE project_id = $1 AND organization_id = $2
  `;
  
  const result = await pool.query(query, [projectId, organizationId]);
  return result.rows[0] || null;
}
```

**重要な変更点（最新のDB規約に準拠）：**
- `client?: PoolClient`パラメータを**削除**
- 各関数内で直接`getPool()`を使用
- トランザクション処理が必要な場合は、呼び出し側（Service層）で管理

### セキュリティ考慮事項
- [ ] すべてのクエリでParameterized Queriesを使用
- [ ] すべてのクエリにorganization_idフィルタを含める
- [ ] マルチテナント分離を維持

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存コードの動作不良 | 高 | 中 | 既存メソッド名を残す、段階的な移行 |
| 型定義の不整合 | 中 | 低 | 実際のDBスキーマと照合、テーブル定義を確認 |
| インポート文の修正漏れ | 中 | 中 | search_filesで全使用箇所を検索 |
| トランザクション処理の変更 | 中 | 中 | 規約に従いclientパラメータを削除、Service層でトランザクション管理 |

## 7. テスト計画

### 動作確認
- [ ] insert関数の動作確認（新規プロジェクト作成）
- [ ] update関数の動作確認（プロジェクト更新）
- [ ] getById関数の動作確認（プロジェクト取得）
- [ ] 既存のupdateStatus機能の互換性確認

### セキュリティチェック
- [ ] organization_idフィルタが適用されているか
- [ ] Parameterized Queriesが使用されているか
- [ ] SQLインジェクション対策が施されているか

## 8. ロールバック計画

問題が発生した場合：
1. Gitで変更前の状態に戻す
2. 修正したファイルのバックアップから復元
3. 依存するサービス層のコードを元に戻す

## 9. 関連ドキュメント

- [.clinerules/development/database.md](../../.clinerules/development/database.md) - データベース操作規約
- [.clinerules/development/typescript.md](../../.clinerules/development/typescript.md) - TypeScript型定義規約
- [.clinerules/development/security.md](../../.clinerules/development/security.md) - セキュリティ規約

## 10. 承認記録

- **計画書提示日時**: 2026-02-18 16:23
- **承認日時**: 2026-02-18 16:30
- **承認者コメント**: 承認されました

## 11. 実施記録

### 実施日時
開始: 2026-02-18 16:30
完了: 2026-02-18 16:33

### 計画からの変更点
特になし。計画通りに実装完了。

### 発生した問題と解決方法
**問題**: instructionService.tsでupdateStatusメソッドの引数にuserIdが不足していた
**解決**: updateStatus呼び出し時にuserIdパラメータを追加（4番目の引数として）

### 最終的な成果物
- [x] projectRepository.ts修正完了
  - クラスベースから関数ベースに変更
  - insert関数を実装（動的SQLクエリ構築）
  - update関数を実装（動的SQLクエリ構築）
  - getById関数を実装（findByIdからリネーム）
  - updateStatus関数を維持（後方互換性）
- [x] 型定義ファイル整備完了
  - backend/src/types/database.tsを新規作成
  - Project型を定義（JSDocコメント付き）
- [x] 使用箇所の修正完了
  - instructionService.tsのインポート文を修正
  - ProjectRepositoryクラスのインスタンス変数を削除
  - メソッド呼び出しを関数呼び出しに変更
- [x] コード品質
  - すべてParameterized Queries使用
  - organization_idフィルタ必須
  - 型安全性を確保

## 12. 振り返り

### うまくいった点
1. **DB規約の更新を即座に反映**: ユーザーからDB規約更新の指示を受け、すぐに最新規約を確認して計画書を更新できた
2. **段階的な実装**: Phase分けにより、体系的に実装を進められた
3. **後方互換性の維持**: updateStatusメソッドを残すことで既存コードへの影響を最小化
4. **型安全性の向上**: database.tsの導入により、型定義が統一された

### 改善が必要な点
1. **テストコードの作成**: 今回は実装のみで、テストコードは未作成
2. **他のRepositoryへの展開**: 同様のパターンを他のRepositoryにも適用すべき

### 学んだこと
1. **規約準拠の重要性**: 最新のDB規約に準拠することで、保守性が大幅に向上
2. **動的SQLクエリ構築**: Object.keysを使った汎用的なSQL構築により、カラム追加時の修正が不要になる
3. **型定義の集約**: database.tsに型定義を集約することで、再利用性が向上
4. **関数ベースのメリット**: クラスベースよりもシンプルで、依存関係が明確になる
