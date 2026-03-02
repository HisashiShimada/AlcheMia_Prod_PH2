# タスク計画書: テンプレートデータ欠損バグ修正

## メタデータ
- **作成日時**: 2026-03-02 13:09
- **タスクID**: template-data-missing-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`GET /api/v1/experiments/projects/{projectName}/methods/{methodId}/tasks/{taskNo}/data?transitionId={transitionId}` APIにおいて、`template_data` テーブルに一部のplaceIdのデータが保存されている場合に、未保存のplaceIdのデータがレスポンスから欠損するバグを修正する。

## 原因分析

### 発生条件

1. トランジションに隣接するプレースが3つある（material / condition / result）
2. そのうち1つ（例: material）のみ保存済み、残り2つ（condition / result）は未保存

### バグの所在

`backend/src/services/experimentDataService.ts` の `getTemplateData` 関数、ステップ8の条件分岐ロジック。

### 問題コード（修正前）

```typescript
// 7. template_data レコードを隣接プレースIDでフィルタリング
const filteredRecords = allRecords.filter((r: TemplateDataRow) =>
  adjacentPlaceIds.includes(r.place_id)
);

// 8. 件数確認とフォールバック処理
if (filteredRecords.length > 0) {
  // 8-a. DB実績データのみをマッピング（保存済みのplaceIdだけ返る）
  templates = filteredRecords.map((r: TemplateDataRow) => { ... });
} else {
  // 8-b. 0件フォールバック: MAIMLテンプレートから全件生成
  templates = buildFallbackTemplates(parser, methodId, adjacentPlaceIds);
}
```

### バグの挙動

| 状態 | `filteredRecords.length` | 結果 |
|------|--------------------------|------|
| 初回（DBレコードなし） | 0 → `else` へ | フォールバック実行 → **3件全部返る** ✅ |
| material 1件保存後 | 1 → `if` へ | DBレコードのみ返す → **1件だけ返る** ❌ |

`filteredRecords.length > 0` の条件が「部分的にDBレコードがある場合」を考慮していないため、  
1件でもDBレコードがあれば `if` ブロックに入り、**保存済みのplaceIdの分しか返らない**。  
未保存の condition・result は `filteredRecords` に含まれないため、レスポンスから消える。

## 修正方針

### 修正後のロジック

「全部DBあり or 全部フォールバック」の二択をやめ、**placeId ごとに個別判定**する方式に変更する。

```
各 adjacentPlaceId について:
  └─ DBにそのplaceIdのレコードが存在する → DBのデータを使う
  └─ DBにそのplaceIdのレコードが存在しない → MAIMLフォールバック（初期値）を使う
```

### 修正後コード（イメージ）

```typescript
// 8. adjacentPlaceIds ごとに DB実績 or フォールバックを選択
const fallbackAll = buildFallbackTemplates(parser, methodId, adjacentPlaceIds);

templates = adjacentPlaceIds.map(placeId => {
  // DBレコードが存在するか確認
  const dbRecord = filteredRecords.find(r => r.place_id === placeId);

  if (dbRecord) {
    // DBのデータを使用（既存ロジック流用）
    const ps: PropertySet | null = dbRecord.property_set;
    return {
      placeId: dbRecord.place_id,
      templateType: ps?.templateType ?? '',
      templateId: ps?.templateId ?? '',
      data: ps as unknown as Record<string, unknown> ?? {},
      recordedBy: dbRecord.update_user_id ?? null,
      recordedAt: dbRecord.update_at instanceof Date
        ? dbRecord.update_at.toISOString()
        : (dbRecord.update_at != null ? String(dbRecord.update_at) : null),
    };
  } else {
    // フォールバック: MAIMLテンプレートから初期値を使用
    const fallback = fallbackAll.find(f => f.placeId === placeId);
    return fallback ?? null;
  }
}).filter((item): item is TemplateDataItem => item !== null);
```

### 期待するレスポンス（修正後）

- material が保存済み → DBのデータ（`recordedBy`・`recordedAt` あり）
- condition が未保存 → MAIMLフォールバック（`recordedBy: null`・`recordedAt: null`）
- result が未保存 → MAIMLフォールバック（`recordedBy: null`・`recordedAt: null`）
- **全3件が常に返る** ✅

## 影響範囲

### 変更するファイル

1. `backend/src/services/experimentDataService.ts` - ステップ8の条件分岐ロジックを修正

### 影響を受ける機能

- `GET /api/v1/experiments/projects/{projectName}/methods/{methodId}/tasks/{taskNo}/data` API
- 実験作業画面のテンプレートデータ表示

### 影響を受けないこと

- データ保存ロジック（`saveBatchData`）は変更しない
- DB スキーマは変更しない
- フォールバック関数 `buildFallbackTemplates` 自体は変更しない

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 修正後に全DBレコードありの場合に動作が変わる | 低 | 低 | `adjacentPlaceIds` をループするため、全件DBにある場合も全件DBデータが返る（既存と同等） |
| フォールバックで該当placeIdがMAIMLに定義されていない場合にnullになる | 低 | 低 | `filter((item) => item !== null)` でnullを除外するため影響なし |

## 実装ステップ

- [x] Step 1: タスク計画書の作成（本ファイル）
- [x] Step 2: `experimentDataService.ts` のステップ8を修正
- [ ] Step 3: 動作確認（手動またはAPIテスト）

## テスト計画

### 手動テスト（修正後に確認）

**シナリオ1: 全件未保存（フォールバック）**
- `template_data` に該当タスクのレコードなし
- → 3件全部フォールバック（`recordedBy: null`）で返ること

**シナリオ2: 1件のみ保存済み**
- material のみ保存済み
- → material は DBデータ（`recordedBy` あり）、condition・result はフォールバックで返ること

**シナリオ3: 全件保存済み**
- 3件全部保存済み
- → 3件全部 DBデータ（`recordedBy` あり）で返ること

## 承認記録

- **計画書提示日時**: 2026-03-02 13:09
- **承認日時**: 2026-03-02 13:09
- **承認者コメント**: 実装開始承認

## 実施記録

### 実施日時
開始: 2026-03-02 13:09
完了: 2026-03-02 13:12

### 計画からの変更点
なし

### 発生した問題と解決方法
なし

### 最終的な成果物
- [x] `backend/src/services/experimentDataService.ts` の修正
