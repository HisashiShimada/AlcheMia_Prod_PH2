# タスク計画書: MAIML未登録プロジェクト詳細ボタン対応

## メタデータ
- **作成日時**: 2026-05-07 08:25
- **タスクID**: maiml-unregistered-project-detail-button
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

ProgressMonitoring画面からWorkProgressDetailDialogを開く際、MAIMLファイルが未登録のプロジェクト（`project_uuid` が NULL）ではAPIがエラーを返すため、詳細ダイアログが開けない問題を修正する。

MAIMLファイルが未登録のプロジェクトに対しては詳細ボタンを無効化（ツールチップで理由を表示）することで、ユーザーがエラーに遭遇しないようにする。

## 目的と期待される成果

### 目的
- MAIMLファイル未登録プロジェクトで詳細ボタンクリック時にエラーが発生する問題を解消する
- ユーザーが無効なプロジェクトに対して詳細ボタンを押せないようにする

### 期待される成果
- [x] MAIML未登録プロジェクトの詳細ボタンが無効化される
- [x] 無効化されたボタンにホバーすると「MAIMLファイル未登録」ツールチップが表示される
- [x] MAIML登録済みプロジェクトは従来通り詳細ダイアログが開く

## 実装ステップ

### Phase 1: バックエンド修正

#### 1-1. プロジェクト一覧取得クエリの調査
- [ ] `getProjects` APIのコントローラー・サービス・SQLファイルを確認し、`project_uuid` を含められるか確認する

#### 1-2. プロジェクト一覧レスポンスに `hasMaiml` フィールドを追加
- [ ] プロジェクト一覧取得のSQLに `project_uuid IS NOT NULL AS has_maiml` を追加
- [ ] 対応するサービス・コントローラーのレスポンスマッピングに `hasMaiml` を追加
- [ ] 型定義（`backend/src/types/`）に `hasMaiml: boolean` を追加

### Phase 2: フロントエンド修正

#### 2-1. 型定義の修正
- [ ] `frontend/src/types/progress.ts` の `Project` 型に `hasMaiml?: boolean` を追加
- [ ] `ProgressMonitoring.tsx` の `ProgressRecord` 型に `hasMaiml: boolean` を追加

#### 2-2. データ変換ロジックの修正
- [ ] `ProgressMonitoring.tsx` の `allData` useMemoブロックで `hasMaiml` を設定する（`item.hasMaiml ?? false`）

#### 2-3. 詳細ボタンの活性/非活性制御
- [ ] `ProgressMonitoring.tsx` の詳細ボタンカラムに `Tooltip` を追加
- [ ] `hasMaiml === false` の場合にボタンを `disabled` にする
- [ ] ツールチップに「MAIMLファイルが登録されていないため詳細を表示できません」を表示

## 変更ファイル

### 新規作成
なし

### 修正
1. `backend/src/sql/queries/projects/` 内プロジェクト一覧取得SQL - `has_maiml` フィールド追加
2. `backend/src/` 内プロジェクト一覧取得サービス/コントローラー - `hasMaiml` マッピング追加
3. `backend/src/types/` - `hasMaiml` 型定義追加
4. `frontend/src/types/progress.ts` - `Project` 型に `hasMaiml` 追加
5. `frontend/src/components/progress/ProgressMonitoring.tsx` - ボタン制御追加

## 技術的詳細

### 問題のフロー（現状）
```
ProgressMonitoring
  → 詳細ボタンクリック
  → getProjectFiles() でMAIMLファイルを検索
  → MAIMLファイルが存在しない → message.error('MAIMLファイルが見つかりません')
  
  または
  
  → WorkProgressDetailDialog が開く
  → /progress/projects/{projectId}/work-details を呼び出し
  → progressService.getWorkDetails()
  → downloadAndParseMAIML() → project_uuid が NULL → エラー
  → ダイアログにエラー表示
```

### 修正後のフロー
```
ProgressMonitoring
  → プロジェクト一覧APIから hasMaiml フィールドを取得
  → hasMaiml === false の場合は詳細ボタンを disabled にする
  → ツールチップ「MAIMLファイルが登録されていないため詳細を表示できません」を表示
  → hasMaiml === true の場合は従来通り詳細ダイアログを開く
```

### hasMaiml の判定基準
- `project.project_uuid IS NOT NULL` → `hasMaiml = true`
- `project.project_uuid IS NULL` → `hasMaiml = false`

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| プロジェクト一覧APIのレスポンス構造変更が他画面に影響 | 低 | 低 | `hasMaiml` フィールドの追加はオプション扱いのため既存の動作には影響しない |
| フロントエンドでのnull安全性 | 低 | 中 | `item.hasMaiml ?? false` でデフォルト値を設定 |

## テスト計画

### 手動テスト
- [ ] MAIML未登録プロジェクトの詳細ボタンが灰色（無効化）になっていることを確認
- [ ] 無効化ボタンにホバーしてツールチップが表示されることを確認
- [ ] MAIML登録済みプロジェクトの詳細ボタンが有効であることを確認
- [ ] MAIML登録済みプロジェクトで詳細ダイアログが正常に開くことを確認

## 承認記録
- **計画書提示日時**: 2026-05-07 08:25
- **承認日時**: 2026-05-07 08:25
- **承認者コメント**: 案1（フロントエンド側で事前チェック）で実装することを承認

## 実施記録

### 実施日時
開始: 2026-05-07 08:26
完了: 2026-05-07 08:31

### 計画からの変更点

**Phase 1（バックエンド修正）は不要と判明**

調査の結果、`/api/v1/projects` のレスポンスには既に以下のフィールドが含まれていた：
- `project_uuid`（プロジェクトテーブルのUUID）
- `maimlFileKey`（file_metadata経由で取得したMAIMLファイルキー）

そのため、バックエンドの修正は一切不要で、フロントエンドのみの修正で対応完了した。

**`hasMaiml` の判定基準を変更**

計画では `project_uuid IS NOT NULL` のみで判定する予定だったが、
より確実に判定するため `project_uuid || maimlFileKey` のいずれかが存在すれば `true` と判定するよう変更した。

```ts
hasMaiml: !!(item.project_uuid || item.maimlFileKey)
```

**`frontend/src/types/progress.ts` の `Project` 型への追加**

`progress.ts` の `Project` 型には `maimlFileKey` / `project_uuid` が定義されていなかったため、
オプションフィールドとして追加した（`@/types/project.ts` には既に存在）。

### 最終的な成果物
- [x] MAIML未登録プロジェクトの詳細ボタン無効化対応完了
