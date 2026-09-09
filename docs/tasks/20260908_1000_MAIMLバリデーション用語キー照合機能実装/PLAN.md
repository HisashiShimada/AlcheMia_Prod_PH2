# タスク計画書: MAIMLバリデーション用語キー照合機能実装（Rev.2）

## メタデータ
- **作成日時**: 2026-09-08
- **改訂日時**: 2026-09-08（ご指摘反映）
- **タスクID**: 20260908_1000_MAIMLバリデーション用語キー照合機能実装
- **優先度**: 高
- **推定工数**: 3〜4時間

---

## タスク概要

MAIMLファイルのバリデーション機能（`maimlParser.ts` の `analyzeMaiMLFile`）に
**Phase 7: 用語キー照合バリデーション** を追加する。

MAIMLファイル内の `<property>` タグおよび `<uncertainty>` タグの `key` 属性が
当該組織の名前空間テーブル（`namespace_term`）に登録済みの用語かどうかを検証し、
**未登録用語はエラーとして報告する**。

---

## 背景・調査結果

### 現在の `analyzeMaiMLFile` フェーズ構成

| Phase | 内容 | 実装状態 |
|-------|------|----------|
| Phase 1〜6 | 既存バリデーション（構文/構造/参照/重複ID） | ✅ 実装済み |
| **Phase 7** | **用語キー照合バリデーション（今回追加）** | ✅ 実装済み |

### property/uncertainty タグの key 属性仕様

`key` 属性には以下の2形式が実在する：

| 形式 | 例 | 照合対象 |
|------|----|---------|
| `prefix:localName` 形式（QName） | `Alchemia:SampleId`、`time:timestamp` | ✅ 照合対象 |
| プレーンキー形式（prefix なし） | `Sample`、`Temperature`、`Laser` | ✅ 照合対象（**対象外にすると機能の意味がなくなる**） |

### グローバルネームスペースの仕組み（重要）

調査により、グローバルネームスペースの管理は以下の状態にある：

- `namespace.global_flg` カラムは **2026-08-13のマイグレーションで廃止**（`DROP COLUMN`）
- グローバル名前空間は現在 **ファイルサーバ（`system/namespaces/global-declarations.csv`）で管理**
- 現在CSVに登録されているのは以下3件のみ：

```csv
prefix,uri
maiml,http://www.maiml.org/schemas
xsi,http://www.w3.org/2001/XMLSchema-instance
Alchemia,https://Alchemia.co.jp
```

**問題**: システムが自動生成するeventLogには `time:timestamp`、`lifecycle:transition`、`concept:instance` 等の XES標準キーが使われているが、これらの prefix（`time`、`lifecycle`、`concept`）がグローバルCSVに登録されていない。

**方針**: バリデーション機能を正しく動作させるため、グローバルCSVに不足している宣言を追記する対応も本タスクのスコープに含める。

### システム全体で使用されているprefixの調査結果

コードベース全体（`eventLogRepository.ts`、`maimlQualityWriter.ts`、`progressService.ts`、MAIMLサンプルファイル等）を調査した結果、以下のprefixが使用されている：

| prefix | 使用キー例 | 用途 | グローバルCSV登録 |
|--------|-----------|------|-----------------|
| `Alchemia` | `Alchemia:status`、`Alchemia:evaluationDigital` 等 | システム固有用語 | ✅ 登録済み |
| `time` | `time:timestamp` | XES標準（イベント時刻） | ❌ 未登録 |
| `lifecycle` | `lifecycle:transition` | XES標準（ライフサイクル状態） | ❌ 未登録 |
| `concept` | `concept:instance`、`concept:name` | XES標準（概念識別子） | ❌ 未登録 |
| `xsi` | `xsi:type`（属性用） | XML Schema Instance | ✅ 登録済み |
| `maiml` | MAIMLスキーマ宣言 | MAIMLスキーマ | ✅ 登録済み |

### バリデーション方針（正しい考え方）

用語キーのバリデーションは以下の2段階で判定する：

**ステップ1: グローバルCSVのprefixチェック**
- ファイルサーバの `system/namespaces/global-declarations.csv` から prefix 一覧を取得（`readGlobalDeclarations()`）
- MAIMLの `key` に含まれる prefix がグローバルCSVに登録されている場合 → **エラーにしない**
  - 例: `time:timestamp`（`time` がCSVに登録されていれば OK）
  - 例: `lifecycle:transition`（`lifecycle` がCSVに登録されていれば OK）
  - 例: `Alchemia:SampleId`（`Alchemia` がCSVに登録されているため OK）
  - 例: `Alchemia:Unknown`（`Alchemia` がCSVに登録されているためキー名不問で OK）

**ステップ2: `namespace_term`（DB）チェック**
- グローバルCSVに登録されていない prefix を持つキー、またはプレーンキーに対して `namespace_term` テーブルで照合
- DB に `is_active = TRUE` で登録されていれば OK → エラーにしない
- 未登録の場合 → エラー（strict）/ 警告（lenient）

```
key の prefix が グローバルCSV に登録されている？
  → YES: エラーなし（グローバル宣言のprefixを持つ用語として許可）
  → NO:  namespace_term に is_active=TRUE で登録されている？
           → YES: エラーなし
           → NO:  エラー（strict）/ 警告（lenient）
```

> ※ `Alchemia` はグローバルCSVに登録されているため、`Alchemia:SampleId` も `Alchemia:Unknown` も
> ステップ1で「エラーなし」になる。`Alchemia` prefix を持つ用語がDB未登録であってもエラーにならない。
> 用語レベルの管理（どのローカル名が有効か）はグローバルCSVではなくユーザーの設定管理にゆだねる。

### `isValid` フラグの意味（調査結果）

`isValid = false` は Phase 3（構造バリデーション）で、XMLとして壊れており
編集画面でも修正が困難な**構造的欠落**（`uuid` 欠落、`protocol` 欠落 等）に設定される。
用語キー未登録は「編集画面でキーを変更すれば修正可能」なため、**`isValid` は変更しない**。

---

## 目的と期待される成果

- [x] `<property key="...">` のキーが未登録の場合にエラーを追加する
- [x] `<uncertainty key="...">` のキーが未登録の場合にエラーを追加する
- [x] `prefix:localName` 形式・プレーンキー形式の**両方を照合対象とする**
- [x] グローバルCSV（`global-declarations.csv`）に登録されている prefix のキーはエラーにしない
- [x] グローバルCSV未登録の prefix を持つキーは `namespace_term`（DB）で照合し、未登録ならエラーにする
- [x] `is_active = false` の用語（非アクティブ）は未登録扱いとしてエラーにする
- [x] `strict` モードではエラー（`canBeIgnoredOnUpload: false`）、`lenient` モードでは警告として報告する
- [x] `organizationId` が空の場合はスキップ
- [x] `isValid` フラグは変更しない（構造的なエラーではないため）
- [x] 既存のバリデーション（Phase 1〜6）の動作に影響を与えない

---

## 実装ステップ

### Phase 0: グローバル宣言ファイルへの追記（運用対応）

- [x] `docs/design/namespace/global-declarations-template.csv` に不足しているXES標準prefix を追記

  **現在（3件）→ 追記後（6件）**:
  ```csv
  prefix,uri
  maiml,http://www.maiml.org/schemas
  xsi,http://www.w3.org/2001/XMLSchema-instance
  Alchemia,https://Alchemia.co.jp
  time,http://www.xes-standard.org/time.xesext#
  lifecycle,http://www.xes-standard.org/lifecycle.xesext#
  concept,http://www.xes-standard.org/concept.xesext#
  ```

  > ⚠️ ファイルサーバへの反映は ProviderMenu の「名前空間管理」>「インポート」で実施

### Phase 1: SQL 新規追加（アクティブ用語のみ取得）

- [x] `backend/src/sql/queries/namespace_terms/findAllActiveByOrganization.sql` を新規作成

### Phase 2: Repository 層追加

- [x] `backend/src/repositories/namespaceTermRepository.ts` に `findAllActiveByOrganization` 関数を追加

### Phase 3: maimlParser.ts に Phase 7 を追加

- [x] `import` に `namespaceTermRepository` と `readGlobalDeclarations` を追加
- [x] `errorTypes` に `TERM_NOT_REGISTERED: 'term_not_registered'` を追加
- [x] `analyzeMaiMLFile` に Phase 7 の呼び出しを追加（DB・CSVを `Promise.all` で並列取得）
- [x] `collectPropertyAndUncertaintyKeys()` 関数を追加（再帰走査）
- [x] `validatePropertyTermKeys()` 関数を追加（2段階判定ロジック）

---

## 変更ファイル

| # | ファイル | 変更種別 |
|---|---------|---------|
| 1 | `docs/design/namespace/global-declarations-template.csv` | 修正（XES標準prefix 3件追記） |
| 2 | `backend/src/sql/queries/namespace_terms/findAllActiveByOrganization.sql` | **新規** |
| 3 | `backend/src/repositories/namespaceTermRepository.ts` | 修正（関数追加） |
| 4 | `backend/src/utils/maimlParser.ts` | 修正（Phase 7 追加） |

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| グローバルCSVファイルが未配置でファイルサーバ読み込み失敗 | 高 | 低 | `readGlobalDeclarations()` はファイル不在時に空配列を返す安全設計のため、空配列の場合は全キーをDB照合にフォールバック |
| グローバルCSVに未追記のまま本機能を有効化 | 高 | 中 | Phase 0 の追記を先に実施してから本機能を有効化する |
| `organizationId` が空でDBクエリが失敗 | 高 | 低 | `organizationId` が空なら Phase 7 をスキップ |
| 用語件数が多くバリデーション速度が低下 | 中 | 中 | DB・ファイルサーバ取得を `Promise.all` で並列実行し `Set` で O(1) 照合 |
| 既存テストファイルへの影響 | 中 | 低 | 既存テスト `.maiml` ファイルに `prefix:` キーがなければ影響なし |

---

## テスト計画

### ユニットテスト
- [ ] `validatePropertyTermKeys` 関数の単体テスト
  - ケース1: `Alchemia:SampleId`（`Alchemia` がグローバルCSVに登録済み）→ エラーなし（ステップ1で通過）
  - ケース2: `Alchemia:Unknown`（`Alchemia` がグローバルCSVに登録済み）→ エラーなし（ステップ1で通過、ローカル名不問）
  - ケース3: `org:SampleId`（`org` がグローバルCSV未登録、DB登録済み, strict）→ エラーなし（ステップ2で通過）
  - ケース4: `org:Unknown`（`org` がグローバルCSV未登録、DB未登録, strict）→ エラーあり
  - ケース5: `org:Unknown`（`org` がグローバルCSV未登録、DB未登録, lenient）→ 警告あり
  - ケース6: `time:timestamp`（グローバルCSVに `time` 登録済み）→ エラーなし（ステップ1で通過）
  - ケース7: `lifecycle:transition`（グローバルCSVに `lifecycle` 登録済み）→ エラーなし（ステップ1で通過）
  - ケース8: プレーンキー `Temperature`（DB未登録）→ エラーあり（ステップ2で不一致）
  - ケース9: `uncertainty` タグの未登録キー → エラーあり

### 手動テスト
- [ ] 未登録用語キーを含むMAIMLを `strict` バリデーション → エラーが返ること
- [ ] `time:timestamp` を含むMAIML（グローバルCSVに `time` 登録済み）→ エラーが追加されないこと
- [ ] `namespace_term` に登録済みの用語キーのみのMAIML → エラーが追加されないこと
- [ ] `lenient` モード → 未登録キーが警告として返ること

---

## 承認記録

- **計画書提示日時**: 2026-09-08
- **承認日時**: 2026-09-08
- **承認者コメント**: 承認

## 実施記録

### 実施日時
開始: 2026-09-08
完了: 2026-09-08

### 実装済みファイル
- [x] `docs/design/namespace/global-declarations-template.csv` — `time`、`lifecycle`、`concept` prefix 3件追記
- [x] `backend/src/sql/queries/namespace_terms/findAllActiveByOrganization.sql` — 新規作成
- [x] `backend/src/repositories/namespaceTermRepository.ts` — `findAllActiveByOrganization` 関数追加
- [x] `backend/src/utils/maimlParser.ts` — Phase 7 追加（import 2件・errorTypes追加・Phase 7 呼び出し・`collectPropertyAndUncertaintyKeys`・`validatePropertyTermKeys` 関数追加）

### TypeScript ビルド確認
`npx tsc --noEmit` → exit:0（エラーなし）



