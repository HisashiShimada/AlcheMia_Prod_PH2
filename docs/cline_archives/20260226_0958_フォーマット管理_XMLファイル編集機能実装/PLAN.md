# タスク計画書: フォーマット管理_XMLファイル編集機能実装

## メタデータ
- **作成日時**: 2026-02-26 09:58
- **タスクID**: format_xml_edit_modal_simplify
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

フォーマット管理画面でXMLファイルを編集する際に使用されるTemplateEditorDialogモーダルから、不要なセクションを削除してシンプル化します。

## 2. 目的と期待される成果

### 目的
- フォーマット管理画面でのXML編集時に、不要な項目（基本情報、Place References、Insertion情報）を非表示にし、XMLの構造編集に集中できるUIにする

### 期待される成果
- [x] TemplateEditorDialogの不要セクションを削除
- [ ] 動作確認（フォーマット管理画面からXMLファイル編集時）
- [ ] 既存機能（PetriNetEditor内での使用）が影響を受けないことを確認

## 3. 実装ステップ

### Phase 1: 現状分析
- [x] フォーマット管理画面のファイル構造確認
- [x] TemplateEditorDialogの現在の実装確認
- [x] 削除対象のセクション特定

### Phase 2: TemplateEditorDialog修正
- [ ] 基本情報セクション（テンプレートID、UUID、Name、Description）を削除
- [ ] Place Referencesセクションを削除
- [ ] Insertion情報セクションを削除
- [ ] 削除に伴う不要なStateとハンドラーを整理

### Phase 3: 動作確認
- [ ] フォーマット管理画面でXMLファイル編集モーダルが正常に開くことを確認
- [ ] Properties編集機能が正常に動作することを確認
- [ ] 保存機能が正常に動作することを確認
- [ ] PetriNetEditor内での使用に影響がないことを確認

## 4. 影響範囲

### 修正するファイル
1. `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx` - 不要セクション削除

### 影響を受ける可能性のある機能
- フォーマット管理画面のXMLファイル編集機能（意図的な変更）
- PetriNetEditor内でのTemplateEditorDialog使用（影響なし想定だが確認必要）

## 5. 技術的詳細

### 削除対象のコード範囲

#### 1. 基本情報セクション
```tsx
{/* 基本情報 */}
<Title level={5}>📋 基本情報</Title>

<Form.Item label="テンプレートID">...</Form.Item>
<Form.Item label="UUID">...</Form.Item>
<Form.Item label="Name">...</Form.Item>
<Form.Item label="Description">...</Form.Item>
```

#### 2. Place Referencesセクション
```tsx
{/* ✅ Place References編集セクション */}
<Divider />
<div style={{ display: 'flex', ... }}>
  <Title level={5}>🔗 Place References</Title>
  ...
</div>
```

#### 3. Insertionセクション
```tsx
{/* Insertion（MaterialTemplate・ResultTemplateの場合表示） */}
{(node.data.placeType === 'material' || node.data.placeType === 'result') && (
  <>
    <Divider />
    <Title level={5}>📎 Insertion情報</Title>
    ...
  </>
)}
```

#### 4. 関連するState
```tsx
const [templateId, setTemplateId] = useState('');
const [uuid, setUuid] = useState('');
const [name, setName] = useState('');
const [description, setDescription] = useState('');
const [placeRefs, setPlaceRefs] = useState<PlaceRef[]>([]);
const [insertion, setInsertion] = useState<Insertion>(...);
const [showPlaceRefAddDialog, setShowPlaceRefAddDialog] = useState(false);
```

#### 5. 関連するハンドラー
```tsx
const handleGenerateUuid = () => {...};
```

#### 6. 関連するModal
```tsx
{/* ✅ Phase 1-1: Place Reference追加ダイアログ */}
<Modal title="🔗 Place Reference追加" ...>
  ...
</Modal>
```

### 削除に伴う調整が必要な箇所

#### useEffect（初期化処理）
```tsx
useEffect(() => {
  if (open && node && mergedTemplate) {
    // 以下を削除
    setTemplateId(mergedTemplate.id || '');
    setUuid(mergedTemplate.uuid || '');
    setName(mergedTemplate.name || '');
    setDescription(mergedTemplate.description || '');
    setInsertion(mergedTemplate.insertion || ...);
    setPlaceRefs(mergedTemplate.placeRefs || []);
    
    // Properties変換は残す
    ...
  }
}, [open, node, mergedTemplate]);
```

#### handleSave（保存処理）
```tsx
const handleSave = () => {
  // バリデーション部分を削除または調整
  // if (!templateId.trim()) { ... }  // 削除
  
  const templateRef: Template = {
    ...(node.data.templateRef || {}),
    // 以下を削除または調整
    // id: templateId,
    // uuid: uuid,
    // name: name,
    // description: description,
    // placeRefs: placeRefs,
    // insertion: insertion,
    
    // Properties/Contentsは残す
    properties: convertedProperties,
    contents: convertedContents,
  };
  
  ...
};
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| PetriNetEditor内での使用に影響 | 高 | 低 | 削除前に使用箇所を確認し、必要に応じて条件分岐で対応 |
| 保存処理が正常に動作しない | 高 | 中 | 保存処理のロジックを慎重に修正し、テスト実施 |
| 削除したStateが他の箇所で使用されている | 中 | 低 | コード全体を検索して依存関係を確認 |

## 7. テスト計画

### 手動テスト
- [ ] フォーマット管理画面を開く
- [ ] XMLファイルの編集ボタンをクリック
- [ ] モーダルが開き、不要なセクションが表示されないことを確認
- [ ] Propertiesセクションが表示され、編集可能であることを確認
- [ ] プロパティを追加・編集・削除して動作を確認
- [ ] 保存ボタンをクリックして正常に保存されることを確認
- [ ] 保存後、ファイル一覧に反映されることを確認

### 確認項目
- [ ] 基本情報セクションが表示されない
- [ ] Place Referencesセクションが表示されない
- [ ] Insertion情報セクションが表示されない
- [ ] Propertiesセクションが正常に表示される
- [ ] プロパティの追加・編集・削除が正常に動作する
- [ ] 保存ボタンが正常に動作する
- [ ] エラーがコンソールに出力されない

## 8. ロールバック計画

修正前のTemplateEditorDialog.tsxをバックアップし、問題が発生した場合は元に戻す。

```bash
# バックアップ（実行前）
cp frontend/src/components/editorv2/components/TemplateEditorDialog.tsx \
   frontend/src/components/editorv2/components/TemplateEditorDialog.tsx.backup

# ロールバック（必要時）
cp frontend/src/components/editorv2/components/TemplateEditorDialog.tsx.backup \
   frontend/src/components/editorv2/components/TemplateEditorDialog.tsx
```

## 9. 関連ドキュメント

- フォーマット管理画面: `frontend/src/components/project/FormatManagement.tsx`
- TemplateEditorDialog: `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx`
- FormatFileDetailModal: `frontend/src/components/project/FormatFileDetailModal.tsx`

## 10. 承認記録

- **計画書提示日時**: 2026-02-26 10:00
- **承認日時**: （承認待ち）
- **承認者コメント**: （未記入）

## 11. 実施記録

### 実施日時
開始: （未開始）
完了: （未完了）

### 計画からの変更点
（実施後に記入）

### 発生した問題と解決方法
（実施後に記入）

### 最終的な成果物
- [ ] TemplateEditorDialog.tsx修正完了
- [ ] 動作確認完了

## 12. 振り返り

### うまくいった点
（実施後に記入）

### 改善が必要な点
（実施後に記入）

### 学んだこと
（実施後に記入）
