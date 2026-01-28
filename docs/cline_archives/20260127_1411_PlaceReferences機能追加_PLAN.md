# PlaceReferences編集機能追加 - 実装計画書

## メタデータ
- **作成日時**: 2026-01-27 14:11
- **タスクID**: PlaceReferences機能追加
- **優先度**: 高
- **推定工数**: 1時間
- **対象ファイル**: frontend/src/components/editor/TemplateEditorDialog.tsx

## 1. タスク概要

TemplateEditorDialogにPlaceReferences編集機能を追加し、テンプレートが参照するPlace（遷移先）を管理できるようにします。

## 2. 目的と期待される成果

### 目的
- テンプレートとPlaceの関連付けを可視化・編集可能にする
- Reference版の機能を現行版に移植する
- Petri Netの構造を正確に表現する

### 期待される成果
- [ ] PlaceReferences State管理追加
- [ ] allNodesからPlace一覧取得
- [ ] PlaceReferences編集UIセクション追加
- [ ] 追加/削除機能実装
- [ ] 保存処理への統合

## 3. 実装ステップ

### Phase 1: State管理追加
- [ ] placeRefs State追加（string[]）
- [ ] showPlaceRefAddModal State追加
- [ ] availablePlaces計算（useMemo）

### Phase 2: Place一覧取得ロジック
```typescript
const availablePlaces = useMemo(() => {
  return allNodes
    .filter(n => n.data.nodeType === 'place')
    .filter(n => !placeRefs.includes(n.id));
}, [allNodes, placeRefs]);
```

### Phase 3: UI実装
- [ ] PlaceReferencesセクション追加（基本情報の後）
- [ ] 参照中Place一覧表示
- [ ] Place追加モーダル実装
- [ ] Place削除ボタン実装

### Phase 4: データ読み込み・保存
- [ ] useEffect: templateRef.placeRefs読み込み
- [ ] handleSaveClick: placeRefsを保存

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editor/TemplateEditorDialog.tsx`
   - State管理追加（約20行）
   - availablePlaces計算（約10行）
   - UI追加（約80行）
   - モーダル追加（約40行）
   - データロジック追加（約20行）

### 新規作成するファイル
なし

## 5. 技術的詳細

### State定義
```typescript
const [placeRefs, setPlaceRefs] = useState<string[]>([]);
const [showPlaceRefAddModal, setShowPlaceRefAddModal] = useState(false);
```

### Place一覧取得
```typescript
const availablePlaces = useMemo(() => {
  return allNodes
    .filter(n => n.data.nodeType === 'place')
    .filter(n => !placeRefs.includes(n.id))
    .map(n => ({
      id: n.id,
      name: n.data.name || n.data.label || n.id
    }));
}, [allNodes, placeRefs]);
```

### データ読み込み
```typescript
useEffect(() => {
  if (open && node) {
    // ... 既存の読み込み処理 ...
    
    // PlaceReferences読み込み
    setPlaceRefs(templateRef.placeRefs || []);
  }
}, [open, node]);
```

### 保存処理
```typescript
const handleSaveClick = () => {
  const templateRef: any = {
    // ... 既存のプロパティ ...
    placeRefs: placeRefs  // PlaceReferences追加
  };
  
  // ... 既存の保存処理 ...
};
```

## 6. UI構成

### PlaceReferencesセクション
```
📍 PlaceReferences (参照するPlace)
[+ Place参照を追加]

参照中のPlace一覧:
- place_1: Place Name 1  [削除]
- place_2: Place Name 2  [削除]
- place_3: Place Name 3  [削除]
```

### Place追加モーダル
```
Place参照を追加

[選択してください ▼]
- place_4: Place Name 4
- place_5: Place Name 5
- place_6: Place Name 6

[キャンセル] [追加]
```

## 7. リスク分析

### 潜在的リスク
| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| allNodesが空 | 中 | 低 | フィルタリング時の空チェック |
| Place削除時の参照残存 | 低 | 低 | 削除確認ダイアログ表示 |
| 重複追加 | 低 | 低 | 追加前に重複チェック |

## 8. テスト計画

### 動作確認項目
- [ ] PlaceReferencesセクションが表示される
- [ ] Place一覧が正しく取得される
- [ ] Place追加モーダルが開く
- [ ] Placeを追加できる
- [ ] Placeを削除できる
- [ ] 保存後、PlaceReferencesが保持される
- [ ] 再度開いたときにPlaceReferencesが表示される

## 9. 実装方針

### 段階的実装
1. **Step 1**: State管理追加
2. **Step 2**: データ読み込み・保存
3. **Step 3**: UI追加
4. **Step 4**: 動作確認

### コーディング原則
- Ant Design v6コンポーネント使用
- 既存コードのパターンを踏襲
- useMemoで計算結果をキャッシュ
- 適切なエラーハンドリング

## 10. 完了基準

- [ ] PlaceReferences編集機能が動作する
- [ ] UI/UXが統一されている
- [ ] 保存・読み込みが正常動作する
- [ ] エラーハンドリングが適切
- [ ] コンソールエラーなし
- [ ] 既存機能に影響なし

## 11. 次ステップ

Phase 5-1完了後:
- Phase 5-2: 継承元テンプレート参照表示追加
- Phase 5-3: テンプレートID管理追加
- Phase 5-4: MaiML ID属性管理追加（オプション）
- Phase 5-5: 統合テスト