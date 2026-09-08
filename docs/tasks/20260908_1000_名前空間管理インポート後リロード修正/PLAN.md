# タスク計画書: 名前空間管理タブ CSVインポート後リロード修正

## メタデータ
- **作成日時**: 2026-09-08 10:46
- **タスクID**: 20260908_1000
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

プロバイダメニュー「名前空間管理」タブで、異なる列名・列数のCSVをインポート後に正しいCSVを再インポートすると、UIのデータリロードが正常に行われない問題を修正する。

### 調査結果

**問題①: ヘッダー検証（mmdpf では既に実装済み）**
- `TermManagement.tsx` L246〜254: `csvHeaderMismatch` エラー実装済み
- `PrefixManagement.tsx` L629〜637: `csvHeaderMismatch` エラー実装済み

**問題②: インポート後のデータリロード不足（未修正・本タスクの対象）**

`TermManagement.tsx` L284:
```typescript
// 現状（NG）: 楽観的更新のみで DB からの再取得なし
if (added.length > 0) setTerms((prev) => [...prev, ...added]);
```

`PrefixManagement.tsx` L676〜678:
```typescript
// 現状（NG）: 楽観的更新のみで DB からの再取得なし
if (added.length > 0) {
  setRows((prev) => [...prev, ...added]);
}
```

**再現シナリオ:**
1. 列順が異なるCSV（例: `uri,prefix,description`）をインポート → DBに不正データ登録
2. 正しいCSVを再インポート → 重複エラーで一部失敗
3. UIには `[...prev, ...added]` で成功分のみ追加される（古いデータも残留）
4. `reloadNamespaces()` / `fetchTerms()` が呼ばれないため、UIとDBが乖離したまま

**対照例（正しい実装）:** `GlobalNamespaceView.tsx` はインポート後に `await fetchDeclarations()` を呼んでいる。

## 目的と期待される成果

- [ ] CSVインポート完了後（成功・失敗問わず）にDBから最新データを再取得する
- [ ] 楽観的更新（`setRows([...prev, ...added])`）を廃止し、常にDBとUI状態を同期させる
- [ ] 既存のヘッダー検証ロジックは変更しない

## 実装ステップ

- [x] `TermManagement.tsx`: インポート後に `fetchTerms()` を呼ぶよう修正
- [x] `PrefixManagement.tsx`: インポート後に `reloadNamespaces()` を呼ぶよう修正
- [x] コード検証（構文・関数参照確認）

## 変更ファイル

1. `frontend/src/components/namespace/TermManagement.tsx` - インポート後に `fetchTerms()` 呼び出し追加、楽観的更新削除
2. `frontend/src/components/namespace/PrefixManagement.tsx` - インポート後に `reloadNamespaces()` 呼び出し追加、楽観的更新削除

## リスク

| リスク | 対策 |
|--------|------|
| `fetchTerms` が非同期のため `await` 漏れ | `await fetchTerms()` を明示的に使用 |
| `reloadNamespaces` の呼び出しタイミング（finally vs メッセージ表示後）| メッセージ表示後に `finally` 内で呼ぶ |

## 承認記録
- **計画書提示日時**: 2026-09-08 10:46
- **承認日時**: 2026-09-08 10:46（ユーザーから「実装をお願いします」の指示あり）
