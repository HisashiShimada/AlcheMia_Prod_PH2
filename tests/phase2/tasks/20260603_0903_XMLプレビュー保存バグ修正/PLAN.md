# タスク計画書: XMLプレビュー保存バグ修正

## メタデータ
- **作成日時**: 2026-06-03 09:03
- **タスクID**: xml-preview-save-bug-fix
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

XMLプレビュー機能でXMLを直接編集して保存したときに、編集内容が画面に反映されない問題を修正する。

**発生している問題:**
- ユーザーがXMLタブでテンプレートのXMLを直接編集
- 保存ボタンをクリック
- 保存は成功するが、画面に変更が反映されない（古いデータのまま）

## 2. 目的と期待される成果

### 目的
XMLプレビュー機能を使ってXMLを直接編集した場合でも、保存後に確実に最新のデータが画面に反映されるようにする。

### 期待される成果
- [x] 問題の原因を特定
- [x] Reference版との比較分析
- [x] 修正方針の決定
- [x] ソースコードの修正実装
- [ ] 動作確認テスト

## 3. 問題の原因分析

### 根本原因

**React の `setState` は非同期処理**のため、XMLをパースして状態を更新した直後に、その状態を参照しても**まだ古い値が取得される**。

### 現在の実装フロー（問題あり）

```typescript
// frontend/src/components/editorv2/TemplateEditorDialog.tsx
const handleSave = () => {
  // 1. XMLタブで保存する場合
  if (activeTabKey === 'xml' && hasUnsyncedXmlChanges) {
    const parseResult = parseXMLToTemplate(xmlContent);
    const d = parseResult.data;
    
    // 2. 状態を更新（非同期 - まだ反映されない）
    setTemplateId(d.id || templateId);
    setProperties((d.properties || {}) as Record<string, PropertyData>);
    setContents((d.contents || {}) as Record<string, PropertyData>);
    // ...
    setHasUnsyncedXmlChanges(false);
  }

  // 3. ⚠️ 問題: この時点では properties/contents はまだ古い値！
  const convertedProperties = convertPropertyDataToPropertiesArray(properties);
  const convertedContents = convertPropertyDataToContentsArray(contents);

  // 4. 古いデータで保存してしまう ❌
  const templateRef: Template = {
    properties: convertedProperties,  // ← 古いデータ
    contents: convertedContents,      // ← 古いデータ
  };
  
  onSave(node.id, templateRef, ...);
};
```

### Reference版の確認結果

Reference版（`frontend/src/reference/components/PetriNetEditorV2/components/TemplateEditorDialog.jsx`）も**同じ問題を抱えている**ことを確認。

```javascript
// 行2154-2273
const handleSaveClick = () => {
  if (activeTab === 1 && hasUnsyncedXmlChanges) {
    const parsedData = parseResult.data;
    setProperties(parsedData.properties || {});  // ← 非同期更新
    setContents(parsedData.contents || {});      // ← 非同期更新
  }
  
  // ⚠️ 古い properties/contents で保存
  const templateRef = {
    properties: properties,  // ← 古い値
    contents: contents,      // ← 古い値
  };
};
```

**結論:** Reference版も理論上は同じバグを持っている。

## 4. 修正方針

### 【推奨】方針1: パース結果を直接使用

XMLタブから保存する場合、`parseResult.data` を直接使用して保存処理を実行する。

**メリット:**
- ✅ 確実に最新のデータで保存される
- ✅ シンプルで理解しやすい
- ✅ 状態更新のタイミングを気にしなくて良い
- ✅ Reference版の問題も同時に修正できる

**デメリット:**
- UIタブとXMLタブで処理が分岐する（ただし、明確に分離されるため保守性は問題なし）

### 方針2: useEffect で状態更新を待つ（非推奨）

**デメリット:**
- ❌ 複雑になる
- ❌ 余計な再レンダリングが発生
- ❌ バグの温床になりやすい

**結論:** 方針1を採用

## 5. 実装ステップ

### Phase 1: handleSave関数の修正

- [x] 現在の実装を確認
- [x] XMLタブ保存処理を分離
- [x] パース結果を直接使用する処理を実装
- [x] UIタブ保存処理はそのまま維持

### Phase 2: エラーハンドリングの追加

- [x] XMLバリデーションエラー時の処理
- [x] XMLパースエラー時の処理
- [x] ユーザーへのエラーメッセージ表示

### Phase 3: テスト

- [ ] XMLタブでの編集→保存テスト
- [ ] UIタブでの編集→保存テスト
- [ ] タブ切り替えテスト

## 6. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/TemplateEditorDialog.tsx` - handleSave関数の修正

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- **XMLプレビュー機能**: 修正の主対象
- **UIベースの編集機能**: 影響なし（既存の処理を維持）
- **タブ切り替え機能**: 影響なし

## 7. 技術的詳細

### 修正後の実装イメージ

```typescript
const handleSave = () => {
  // ===== XMLタブから保存する場合の専用処理 =====
  if (activeTabKey === 'xml' && hasUnsyncedXmlChanges) {
    // バリデーション
    const validationResult = validateTemplateXML(xmlContent);
    if (!validationResult.isValid) {
      message.error('XMLにエラーがあるため保存できません');
      return;
    }
    
    // パース
    const parseResult = parseXMLToTemplate(xmlContent);
    if (!parseResult.success || !parseResult.data) {
      message.error('XMLのパースに失敗しました');
      return;
    }
    
    const d = parseResult.data;
    
    // ✅ パース結果を直接使用して保存
    const templateRef: Template = {
      ...(node.data.templateRef || {}),
      id: d.id || templateId,
      uuid: d.uuid || '',
      name: d.name || '',
      category: nodeCategory,
      description: d.description || '',
      properties: convertPropertyDataToPropertiesArray(d.properties || {}),
      contents: convertPropertyDataToContentsArray(d.contents || {}),
      placeRefs: (d.placeRefs || []).map(ref => 
        typeof ref === 'string' ? { id: '', ref } : ref
      ),
    };
    
    // templateRefの継承情報を保持
    if (node.data.templateRef?.templateRef) {
      templateRef.templateRef = node.data.templateRef.templateRef;
    }
    
    // Material/ResultTemplateの場合、insertionを追加
    if ((node.data.placeType === 'material' || node.data.placeType === 'result') && 
        (insertion.uri || insertion.hash || insertion.format)) {
      templateRef.insertion = insertion;
    }
    
    // 保存実行
    onSave(
      node.id, 
      templateRef, 
      isNewTemplate, 
      templateCategory, 
      isCommonTemplate, 
      methodId, 
      originalTemplateId
    );
    
    // 状態更新（次回ダイアログを開いたとき用）
    setTemplateId(d.id || templateId);
    setUuid(d.uuid || '');
    setName(d.name || '');
    setDescription(d.description || '');
    setProperties((d.properties || {}) as Record<string, PropertyData>);
    setContents((d.contents || {}) as Record<string, PropertyData>);
    setPlaceRefs((d.placeRefs || []).map(ref => 
      typeof ref === 'string' ? { id: '', ref } : ref
    ));
    setHasUnsyncedXmlChanges(false);
    
    onClose();
    return; // ← ここで終了（後続の処理をスキップ）
  }
  
  // ===== UIタブからの通常保存処理 =====
  // 基本チェック
  if (!templateId.trim()) {
    message.error(t('editor.template.idRequired'));
    return;
  }
  
  // ... 既存の処理（変更なし）
};
```

### データ変換処理

既存の変換関数を使用:
- `convertPropertyDataToPropertiesArray(properties)` - PropertyData形式 → Property[]
- `convertPropertyDataToContentsArray(contents)` - PropertyData形式 → Content[]

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| XMLタブとUIタブで処理が重複する | 低 | 低 | 明確に処理を分岐させ、コメントで説明 |
| 既存のUIタブ保存が影響を受ける | 中 | 低 | UIタブの処理は一切変更しない |
| パース失敗時にデータが失われる | 高 | 中 | バリデーション強化、エラーメッセージ改善 |
| Reference版との差異が生じる | 低 | 中 | Reference版も同様に修正することを推奨 |

## 9. テスト計画

### ユニットテスト
- [ ] parseXMLToTemplate関数のテスト
- [ ] convertPropertyDataToPropertiesArray関数のテスト
- [ ] convertPropertyDataToContentsArray関数のテスト

### 統合テスト
- [ ] XMLタブでの編集→保存→画面反映確認
- [ ] UIタブでの編集→保存→画面反映確認
- [ ] XMLタブ編集→UIタブ切り替え→反映確認
- [ ] UIタブ編集→XMLタブ切り替え→反映確認

### 手動テスト

#### テストケース1: XMLタブでの編集→保存
1. TemplateEditorDialogを開く
2. XMLタブに切り替え
3. プロパティ値を編集（例: `<value>100</value>` → `<value>200</value>`）
4. 保存ボタンをクリック
5. **期待結果**: ダイアログが閉じ、画面に新しい値（200）が反映される

#### テストケース2: UIタブでの編集→保存
1. TemplateEditorDialogを開く
2. UI編集タブでプロパティを変更
3. 保存ボタンをクリック
4. **期待結果**: 正常に保存され、画面に反映される

#### テストケース3: XMLエラーハンドリング
1. TemplateEditorDialogを開く
2. XMLタブに切り替え
3. 不正なXMLを入力（例: タグを閉じない）
4. 保存ボタンをクリック
5. **期待結果**: エラーメッセージが表示され、保存されない

#### テストケース4: タブ切り替え同期
1. XMLタブで編集
2. UIタブに切り替え
3. **期待結果**: XMLの変更がUIに反映される
4. UIタブで編集
5. XMLタブに切り替え
6. **期待結果**: UIの変更がXMLに反映される

## 10. ロールバック計画

万が一問題が発生した場合:
1. 該当コミットをrevertする
2. 既存の実装に戻す
3. 別のアプローチで再検討

## 11. 関連ドキュメント

- `frontend/src/components/editorv2/TemplateEditorDialog.tsx` - 修正対象ファイル
- `frontend/src/reference/components/PetriNetEditorV2/components/TemplateEditorDialog.jsx` - Reference版
- `frontend/src/components/editorv2/utils/templateToXML.ts` - XML変換ユーティリティ

## 12. 承認記録

- **計画書提示日時**: 2026-06-03 09:03
- **承認日時**: 2026-06-03 09:22
- **承認者コメント**: 選択肢A（バグ修正のみ）で実施。パース方式統一は別タスク。

## 13. 実施記録

### 実施日時
開始: 2026-06-03 09:22
完了: 2026-06-03 09:25

### 計画からの変更点

- パース方式統一（DOMParser → MaimlParserTyped）の検討を追加実施したが、今回はスコープ外と判断
- 重複チェック処理をXMLタブパスにも追加（UIタブと同等の検証を維持）

### 発生した問題と解決方法

特になし。TypeScriptコンパイルエラー0件で完了。

### 最終的な成果物
- [x] handleSave関数の修正完了
- [ ] テスト完了（手動テスト待ち）
- [x] ドキュメント更新

## 14. 振り返り

### うまくいった点

- 根本原因（ReactのsetState非同期問題）を早期に特定できた
- Reference版も同じ問題を持っていることを確認し、参考にせず独自修正できた
- TypeScriptの型安全性を維持したまま修正できた（コンパイルエラー0件）

### 改善が必要な点

- パース方式が2つ（DOMParser / MaimlParserTyped）存在しており、別タスクで統一が必要
- Reference版も同様のバグを持っているため、別途修正が推奨される

### 学んだこと

- ReactのsetStateは非同期のため、setState直後に同じstateを参照してはいけない
- 状態更新が必要な場合は「保存処理にはパース結果を直接使用し、状態更新は後回し」のパターンが有効
