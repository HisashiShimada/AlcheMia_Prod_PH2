# タスク計画書: SubNetViewerのtemplateMapsキー不一致修正

## メタデータ
- **作成日時**: 2026-03-27 08:49
- **タスクID**: subnet-viewer-templatemap-fix
- **優先度**: 高
- **推定工数**: 1〜2時間

---

## 1. タスク概要

SubNetViewer（トランジションのサブネット表示）において、入力/出力Placeのテンプレート種別（material / condition / result）と詳細情報が正しく表示されない問題を修正する。

---

## 2. 問題の根本原因

### `templateMap` のキー構造の不一致

```
buildTemplateMap()
  → キーは placeId（placeRef.ref の値）
  → 値: { id: templateId, name, element, type, ... }
```

```typescript
// PetriNetViewer.tsx で生成される newTemplateMap
// キー = placeId
newTemplateMap[placeId] = { element: xmlDoc.querySelector(...) };
```

```typescript
// SubNetViewer.tsx での参照（バグ箇所）
let templateId = place.data.template?.id   // ← templateId（例: 'mt001'）
             || place.data.templateId       // ← templateId
             || place.id;                   // ← フォールバックとして placeId
//          ↑ 優先順位の問題
//          place.data.template.id が存在するとき templateId で templateMap を引いてしまう
//          templateMap のキーは placeId なので、placeId != templateId の場合にヒットしない

if (templateMap[templateId]) { ... }  // ← templateId でアクセス → ミスマッチ
```

### 結果として発生している症状

1. `templateMap[templateId]` が `undefined` になる
2. `templateInfo` が `null` のまま → PropertyViewer でプロパティ詳細が表示されない
3. `templateType` の判定は `place.data.stereotype` を使っているため正しいが、`templateInfo.element` が null なのでノードクリック時のプロパティ表示が「テンプレート詳細情報が取得できませんでした」になる

---

## 3. 影響ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `frontend/src/reference/components/SubNetViewer/index.js` | 修正 | templateMap 参照キーを `place.id`（placeId）優先に変更 |
| `frontend/src/components/viewer/dialogs/SubNetViewer.tsx` | 修正 | 同上（TypeScript版） |

---

## 4. 修正方針

### 方針: SubNetViewer の templateMap 参照キーを `place.id`（placeId）優先に変更する

`buildTemplateMap()` のキーが placeId であることに合わせ、SubNetViewer 内の templateMap 参照を **placeId 優先**に修正する。templateId でのアクセスはフォールバックとして残す。

```typescript
// 修正前
let templateId = place.data.template?.id
             || place.data.templateId
             || place.id;

if (templateId && templateMap[templateId]) { ... }
```

```typescript
// 修正後
// ① placeId で templateMap にアクセス（buildTemplateMap のキーは placeId）
let templateInfo = null;

if (templateMap[place.id]) {
  const entry = templateMap[place.id];
  if (entry.element) {
    templateInfo = {
      id: place.id,
      name: place.data.label || place.id,
      type: templateType,
      element: entry.element,
      properties: [],
    };
  }
}

// ② フォールバック: templateId でアクセス（placeId == templateId のケース）
if (!templateInfo) {
  const templateId = place.data.template?.id
                  || place.data.templateId;
  if (templateId && templateMap[templateId]) {
    const entry = templateMap[templateId];
    if (entry.element) {
      templateInfo = {
        id: templateId,
        name: place.data.label || templateId,
        type: templateType,
        element: entry.element,
        properties: [],
      };
    }
  }
}
```

---

## 5. 実装ステップ

### Phase 1: 現行版（TypeScript）の修正
- [ ] `frontend/src/components/viewer/dialogs/SubNetViewer.tsx` の `relatedPlaces` 構築部分を修正
  - `templateMap[place.id]` を優先アクセスに変更
  - `templateMap[templateId]` をフォールバックに変更
  - ログ出力も修正（参照キーの種別を明確化）

### Phase 2: reference版（JavaScript）の修正
- [ ] `frontend/src/reference/components/SubNetViewer/index.js` の `relatedPlaces` 構築部分を修正
  - 現行版と同じ修正を適用

### Phase 3: 動作確認
- [ ] 複数種別（material / condition / result）が混在するMAIMLファイルで SubNetViewer を起動
- [ ] 入力Place・出力PlaceのテンプレートTypeが正しく表示されることを確認
- [ ] ノードクリック時にPropertyViewerが正しく表示されることを確認
- [ ] placeId == templateId の場合（フォールバックケース）も正しく動作することを確認

---

## 6. 修正箇所の詳細

### SubNetViewer.tsx（現行版）

**変更前（約L220〜L260）**

```typescript
// templateIdの取得
let templateId: string | null = null;
if (place.data.template && place.data.template.id) {
  templateId = place.data.template.id;
} else if (place.data.templateId) {
  templateId = place.data.templateId;
} else {
  templateId = place.id;
}

// templateMapから取得
let templateInfo: TemplateInfo | null = null;
if (templateId && templateMap[templateId]) {
  const templateMapEntry = templateMap[templateId];
  if (templateMapEntry && templateMapEntry.element) {
    templateInfo = {
      id: templateId,
      name: place.data.label || templateId,
      type: templateType,
      element: templateMapEntry.element,
      properties: [],
    };
  }
}
```

**変更後**

```typescript
// templateMapから取得
// buildTemplateMap() のキーは placeId（placeRef.ref の値）なので、place.id で優先アクセス
let templateInfo: TemplateInfo | null = null;

// ① placeId で検索（優先）
if (templateMap[place.id]?.element) {
  templateInfo = {
    id: place.id,
    name: place.data.label || place.id,
    type: templateType,
    element: templateMap[place.id].element,
    properties: [],
  };
  console.log(`✅ [SubNetViewer] Place ${place.id} templateMap取得: placeIdキーでヒット`);
}

// ② templateId で検索（フォールバック）
if (!templateInfo) {
  const templateId = place.data.template?.id || place.data.templateId;
  if (templateId && templateMap[templateId]?.element) {
    templateInfo = {
      id: templateId,
      name: place.data.label || templateId,
      type: templateType,
      element: templateMap[templateId].element,
      properties: [],
    };
    console.log(`✅ [SubNetViewer] Place ${place.id} templateMap取得: templateIdキーでヒット (${templateId})`);
  }
}

if (!templateInfo) {
  console.warn(`⚠️ [SubNetViewer] Place ${place.id} templateMapエントリなし`, {
    placeId: place.id,
    templateId: place.data.template?.id || place.data.templateId,
    templateMapKeys: Object.keys(templateMap).slice(0, 5),
  });
}
```

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `place.id` でアクセスしても `templateMap` にヒットしないMAIMLファイルが存在する | 中 | 低 | フォールバック（templateId）を残す |
| reference版にも同じ修正が必要 | 低 | 高 | Phase 2 で必ず修正する |
| `PetriNetViewer.tsx` 側の `newTemplateMap` 構築も問題を持つ可能性 | 中 | 低 | 修正後に動作確認して問題があれば追加修正 |

---

## 8. 確認が必要な追加事項

### PetriNetViewer.tsx の `newTemplateMap` 構築ロジック

```typescript
// templateMap を SubNetViewer 用の { element: Element } 形式に変換
const xmlDoc = new DOMParser().parseFromString(maimlData, 'text/xml');
const newTemplateMap: Record<string, { element: Element }> = {};

Object.entries(builtTemplateMap).forEach(([placeId, tmpl]) => {
  const el = xmlDoc.querySelector(
    // ← ここのセレクターが正しくない場合、element が null になる可能性がある
  );
  // el が null の場合、newTemplateMap[placeId] が { element: null } になる
});
```

PetriNetViewer.tsx の `newTemplateMap` 構築部分も詳細確認が必要。`querySelector` のセレクターが正しくない場合、`element` が null になりサブネットビューアでプロパティが表示されない。

---

## 9. 承認記録

- **計画書提示日時**: 2026-03-27 08:49
- **承認日時**: （承認時に記入）
- **承認者コメント**: （未記入）
