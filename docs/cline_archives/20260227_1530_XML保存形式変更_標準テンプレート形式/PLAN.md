# タスク計画書: XML保存形式変更（標準テンプレート形式へ）

## メタデータ
- **作成日時**: 2026-02-27 15:30
- **タスクID**: xml-save-format-change
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

フォーマット管理画面のXML保存処理を変更し、`keyDictionary`形式ではなく標準の`materialTemplate`/`conditionTemplate`/`resultTemplate`形式で保存することで、再編集時のパースエラーを解消します。

## 2. 目的と期待される成果

### 目的
- `xmlConverter.ts`を修正せず、保存形式を変更することで問題を解決
- MAIML標準形式に準拠したXMLを生成
- 既存の`convertXmlToTemplate`関数をそのまま利用可能にする

### 期待される成果
- [ ] FormatManagement.tsxの保存処理を修正
- [ ] 編集→保存→再編集のフローが正常に動作する
- [ ] xmlConverter.tsの変更なし（既存のままで動作）

## 3. 問題の詳細

### 現在の状況

**現在の保存形式（keyDictionary）:**
```xml
<keyDictionary xmlns="http://abc.com/schema/keyDictionary/{s3_path}" xmlns:xsi="...">
  <property key="...">...</property>
  <content key="...">...</content>
</keyDictionary>
```

**問題点:**
- `xmlConverter.ts`の`convertXmlToTemplate()`が`keyDictionary`を認識できない
- 再編集時に「不明なテンプレートタイプ: keyDictionary」エラーが発生

### 解決策

**標準テンプレート形式で保存:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<materialTemplate id="..." xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <name>...</name>
  <description>...</description>
  <property key="...">...</property>
  <content key="...">...</content>
</materialTemplate>
```

**メリット:**
1. ✅ `xmlConverter.ts`の修正不要
2. ✅ MAIML標準形式に準拠
3. ✅ 既存の`convertXmlToTemplate()`がそのまま使える
4. ✅ 変更箇所が少ない（FormatManagement.tsxのみ）

## 4. 実装ステップ

### Phase 1: FormatManagement.tsxの修正
- [ ] `onSave`ハンドラー内のXML生成ロジックを変更
- [ ] ルート要素を`keyDictionary`から`${templateType}Template`に変更
- [ ] `templateId`と`name`、`description`要素を追加
- [ ] `xmlns`属性を削除（標準形式では不要）

### Phase 2: テスト・検証
- [ ] 新規XMLファイル作成 → 保存 → 再編集の動作確認
- [ ] 各カテゴリ（material/condition/result）での動作確認
- [ ] 生成されたXMLの妥当性確認

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/FormatManagement.tsx` - XML保存処理を修正

### 影響を受ける機能
- フォーマット管理画面のXML保存処理のみ
- 既存のXMLファイル読み込み処理は影響なし

## 6. 技術的詳細

### 修正前のコード（FormatManagement.tsx）

```typescript
// ❌ 現在: keyDictionary形式
const s3PathWithoutExt = editingXmlFile.path.replace(/\.xml$/i, '');
const xmlns = `http://abc.com/schema/keyDictionary/${s3PathWithoutExt}`;

let xmlContent = `<keyDictionary xmlns="${escapeXml(xmlns)}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;

properties.forEach(prop => {
  xmlContent += buildPropertyXML(prop, 1);
});

contents.forEach(content => {
  xmlContent += buildContentXML(content, 1);
});

xmlContent += `</keyDictionary>\n`;
```

### 修正後のコード（FormatManagement.tsx）

```typescript
// ✅ 修正後: 標準テンプレート形式
// placeTypeからtemplateTypeを判定
const templateType = placeType === 'material' ? 'materialTemplate' :
                    placeType === 'condition' ? 'conditionTemplate' :
                    'resultTemplate';

// templateIdを生成（既存のtemplateIdがあればそれを使用、なければ生成）
const generatedTemplateId = templateId || `${templateType}_${Date.now()}`;

// XML宣言とルート要素
let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
xmlContent += `<${templateType} id="${escapeXml(generatedTemplateId)}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;

// 基本情報
xmlContent += `  <name>${escapeXml(name)}</name>\n`;
if (description) {
  xmlContent += `  <description>${escapeXml(description)}</description>\n`;
}

// property要素群を出力
properties.forEach(prop => {
  xmlContent += buildPropertyXML(prop, 1);
});

// content要素群を出力（resultTemplateのみ）
if (placeType === 'result') {
  contents.forEach(content => {
    xmlContent += buildContentXML(content, 1);
  });
}

xmlContent += `</${templateType}>\n`;
```

### 必要な情報の取得方法

**placeType:**
```typescript
// FormatEditorDialogから既に渡されている
const placeType = tempNode.data.placeType; // 'material' | 'condition' | 'result'
```

**templateId, name, description:**
```typescript
// onSaveの引数として既に渡されている
onSave(
  nodeId: string,
  properties: Property[],
  contents: Content[],
  templateId: string,      // ← これを使用
  name: string,            // ← これを使用
  description: string,     // ← これを使用
  category: string
)
```

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存のkeyDictionary形式XMLが読めなくなる | 低 | 低 | 既存ファイルは古い形式のまま保持、新規保存時のみ新形式 |
| buildPropertyXML/buildContentXMLが不足 | 低 | 低 | 既にFormatManagement.tsxでimport済み |

## 8. テスト計画

### 単体テスト
- [ ] material系フォルダでXML作成 → 保存 → materialTemplate形式で保存される
- [ ] condition系フォルダでXML作成 → 保存 → conditionTemplate形式で保存される
- [ ] result系フォルダでXML作成 → 保存 → resultTemplate形式で保存される

### 統合テスト
- [ ] フォーマット管理画面で新規XMLファイル作成
- [ ] プロパティを追加して保存
- [ ] 再度編集ボタンをクリック
- [ ] エラーが発生せず、FormatEditorDialogが開く
- [ ] プロパティが正しく表示される
- [ ] 再度保存して、XML形式が正しいことを確認

### 生成XMLの妥当性確認
- [ ] XML宣言が含まれている
- [ ] ルート要素が`materialTemplate`/`conditionTemplate`/`resultTemplate`
- [ ] `id`属性が正しく設定されている
- [ ] `name`要素が含まれている
- [ ] `property`/`content`要素が正しくネストされている

## 9. 実装の詳細

### 変更箇所の特定

**ファイル:** `frontend/src/components/project/FormatManagement.tsx`

**関数:** `onSave`ハンドラー（FormatEditorDialog内、行数: 約1127行目）

**変更範囲:**
```typescript
onSave={async (
  nodeId: string,
  properties: Property[],
  contents: Content[],
  templateId: string,
  name: string,
  description: string,
  category: string
) => {
  // この関数内のXML生成部分を修正
  // 約60行程度の変更
}}
```

### 必要なimport確認

既に以下がimportされているので追加不要:
```typescript
import { 
  buildPropertyXML, 
  buildContentXML,
  escapeXml
} from '@/components/editorv2/utils/converters/reactFlowToMaiml';
```

## 10. 承認記録

- **計画書提示日時**: 2026-02-27 15:30
- **承認日時**: （承認後記入）
- **承認者コメント**: （承認後記入）

## 11. 実施記録

### 実施日時
開始: （作業開始時記入）
完了: （作業完了時記入）

### 計画からの変更点
（作業中に記入）

### 発生した問題と解決方法
（作業中に記入）

### 最終的な成果物
- [ ] `frontend/src/components/project/FormatManagement.tsx` - 修正完了
- [ ] 動作確認完了

## 12. 振り返り

### うまくいった点
（完了後記入）

### 改善が必要な点
（完了後記入）

### 学んだこと
（完了後記入）
