# タスク計画書: タイムスタンプJST変換統一 + TIMESTAMPTZ型統一

## メタデータ

- **作成日時**: 2026-08-28
- **更新日時**: 2026-09-09
- **タスクID**: 20260828_1000_タイムスタンプJST変換統一
- **優先度**: 高
- **推定工数**: 3～4日
- **関連資料**: docs/design/db/timestamp_investigation.md

---

## 1. タスク概要

現在DBのタイムスタンプカラムは TIMESTAMP WITHOUT TIME ZONE（WITHOUT TZ）と TIMESTAMPTZ（WITH TIME ZONE）が混在しており、UI表示時のJST変換方式も formatDateTimeJST() / .toISOString() / 生値返却の3パターンが混在している。

本タスクでは以下を一括対応する。

1. 全タイムスタンプカラムを TIMESTAMPTZ（TIMESTAMP WITH TIME ZONE）に型統一
2. dateUtils.ts に JST変換関数を追加
3. Service層の日時返却を dateUtils JST変換関数に統一（DBへの書き込みはUTCのまま。変換は読み出し時のみ）
4. db.ts の WITHOUT TIME ZONE 用ハックコードを削除
5. 開発ポリシーを .clinerules/development/config.md に明文化

---

## 2. 背景と現状の問題点

### 問題1：タイムスタンプ型の混在（調査結果）

| 型 | カラム数 | DDLファイル数 |
|----|---------|-------------|
| TIMESTAMP WITHOUT TIME ZONE | 62カラム | 28ファイル |
| TIMESTAMP WITH TIME ZONE / TIMESTAMPTZ | 21カラム | 8ファイル |

### 問題2：Service層の日時変換が3パターン混在

| パターン | 該当ファイル数 | 問題 |
|---------|-------------|------|
| A formatDateTimeJST() 使用 | 3ファイル | 正しいJST変換（既存正常実装） |
| B .toISOString() 使用 | 17ファイル | UTC文字列のままAPIレスポンスに返す |
| C 生値返却（変換なし） | 複数ファイル | DateオブジェクトやUTC文字列のまま返す |

### 問題3：db.ts にハックコードが存在する

```typescript
types.setTypeParser(1114, (val: string) => new Date(val + 'Z'));
```

このハックは WITHOUT TIME ZONE 型がタイムゾーン情報を持たないことへの回避策であり、根本的な解決ではない。

---

## 3. 修正方針（重要）

```
【DBへの書き込み】変更なし
  API → Service → INSERT ... NOW()（UTC） → DB(UTC格納) ← そのまま

【DBからの読み出し】JST変換を統一
  DB(UTC/TIMESTAMPTZ) → Service → toJSTIsoString(row.create_at) → API → UI(JST表示)

【変更対象外の toISOString() 呼び出し】
  - MaiML XML ファイル内コンテンツ（'edit-timestamp' 等）→ MaiMLファイルへの保存は行わない
  - S3 署名付き URL の有効期限（UTC が仕様）
  - X.509 証明書の有効期限（notBefore / notAfter）
  - DB挿入用の現在時刻（INSERT の created_at 等）
```

---

## 4. 修正スコープの全体像

変更必要 合計53ファイル: dateUtils 1 + services 17 + DDL 34 + マイグレーション 1新規 + db.ts 1 + config.md 1
変更不要 105ファイル以上: sql/queries 63 + repositories 42 + frontend/
NOW() は TIMESTAMPTZ カラムへも問題なく格納できるため SQL 変更不要。

---

## 5. フェーズ別実装ステップ

### フェーズ1: dateUtils.ts に JST変換関数を追加

- [ ] toISOStringJST(date) 追加（既存 toJSTIsoString のエイリアス）
- [ ] toDisplayStringJST(date) 追加（dayjs使用、"YYYY-MM-DD HH:mm:ss" 形式）
- [ ] toDateStringJST(date) 追加（dayjs使用、"YYYY-MM-DD" 形式）
- [ ] formatJST(date, format) 追加（dayjs使用、汎用フォーマット関数）

### フェーズ2: Service層日時返却を統一（17ファイル）

DBから取得した日時 / APIレスポンス用の現在時刻を toJSTIsoString() に統一

- [ ] authService.ts
- [ ] batchIngestService.ts
- [ ] encryptionKeyService.ts
- [ ] experimentDataService.ts
- [ ] experimentInstructionService.ts
- [ ] fileAccessService.ts
- [ ] formatService.ts
- [ ] maimlEncryptionService.ts
- [ ] maimlIntegrityService.ts
- [ ] maimlService.ts
- [ ] progressService.ts
- [ ] projectInstructionService.ts
- [ ] projectService.ts
- [ ] sessionService.ts
- [ ] taskService.ts
- [ ] tokenBlacklistService.ts
- [ ] workerProjectService.ts

### フェーズ3: DDL型統一 + マイグレーション + db.ts修正

- [ ] docs/design/db/ddl/*.sql 34ファイルの TIMESTAMP -> TIMESTAMPTZ 修正
- [ ] backend/migrations/20260828_convert_timestamp_to_timestamptz.sql 新規作成
- [ ] backend/src/database/db.ts の OID 1114 typeParser 削除（フェーズ3完了後に実施）

### フェーズ4: 開発ポリシー追記

- [ ] .clinerules/development/config.md にタイムスタンプ処理規約を追記

---

## 6. 影響範囲

- UIの日時表示が UTC から JST に統一される（ユーザー向け改善）
- APIレスポンスの日時フォーマットが統一される
- 既存DBデータ: USING AT TIME ZONE 'UTC' で正確に変換されるためデータ損失なし
- 新規INSERT: TIMESTAMPTZ カラムへ NOW()（UTC）で格納。変換は読み出し時のみ

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|-------|--------|---------|------|
| マイグレーション型変換失敗 | 高 | 小 | USING カラム AT TIME ZONE 'UTC' で既存UTC値を正確に変換 |
| Service修正漏れ | 中 | 中 | フェーズ2完了後に .toISOString() 残存を全文検索で確認 |
| db.ts typeParser削除順序ミス | 高 | 小 | フェーズ3（TIMESTAMPTZ統一）完了後に削除。順序を必ず守る |
| 既存テストの破損 | 中 | 中 | フェーズ1完了後に npm test を実行し都度確認 |

---

## 8. テスト計画

- [ ] フェーズ1完了後: dateUtils.ts 追加関数の単体テスト実行
- [ ] フェーズ2完了後: 各Serviceの日時レスポンスが JST形式になっているか確認
- [ ] フェーズ3完了後: マイグレーション実行後に既存データが正しく読めるか確認
- [ ] 全フェーズ完了後: npm test 全件パス確認
- [ ] .toISOString() の残存がないことを全文検索で確認

---

## 9. 承認記録

- **計画書提示日時**: 2026-08-28
- **更新日時**: 2026-09-09
- **承認日時**: 2026-09-09
- **承認者コメント**: Act モードで承認・実装開始
