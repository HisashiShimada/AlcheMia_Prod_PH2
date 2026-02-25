# タスク計画書: formatFileUtils.ts実装問題分析と修正

## メタデータ
- **作成日時**: 2026-02-25 09:40
- **タスクID**: formatFileUtils_analysis
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

`backend/src/utils/formatFileUtils.ts`のデフォルトXML/MAIMLコンテンツ生成関数が、MAIML仕様（XSD準拠型定義）と一致していない問題を分析し、修正方針を策定する。

## 2. 問題点の詳細分析

### 問題1: デフォルトXMLコンテンツ（Material/Condition/Result Template）

#### 現在の実装
```xml
<MaterialTemplate>
  <Material id="material_1">
    <Name>fileName</Name>
    <Description>description</Description>
    <Properties>
      <Property>
        <PropertyName>property_1</PropertyName>
        <PropertyValue></PropertyValue>
        <Unit></Unit>
      </Property>
    </Properties>
  </Material>
</MaterialTemplate>
```

#### 問題点
❌ **MAIML仕様と完全に異なる構造**
1. ルート要素が `<MaterialTemplate>` ではなく、単に `<template>` であるべき
2. ネストされた `<Material>` タグは存在しない
3. `<Properties>` / `<Property>` の構造が間違っている
   - 正: `<property key="..." xsi:type="...">`
   - 誤: `<Property><PropertyName>...</PropertyName></Property>`
4. 必須属性が欠けている
   - `id`, `uuid`, `category`（material/condition/result）

#### 正しい構造（maiml-unified.ts Template型に基づく）
```xml
<?xml version="1.0" encoding="UTF-8"?>
<template 
  id="template_material_001" 
  uuid="550e8400-e29b-41d4-a716-446655440000"
  category="material">
  <name>Material Template 001</name>
  <description>デフォルトの材料テンプレート</description>
  <property key="sampleName" xsi:type="stringType">
    <description>サンプル名</description>
    <value></value>
  </property>
  <property key="quantity" units="g" xsi:type="doubleType">
    <description>量</description>
    <value>0.0</value>
  </property>
</template>
```

### 問題2: デフォルトMAIMLコンテンツ

#### 現在の実装
```xml
<document xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <method id="method_1">
    <name>fileName</name>
    <description>description</description>
    <petri_net>  <!-- ❌ 間違い -->
      <place id="place_start">
        <name>Start</name>
        <initial_marking>1</initial_marking>  <!-- ❌ 間違い -->
      </place>
      ...
    </petri_net>
  </method>
</document>
```

#### 問題点
❌ **MAIML仕様と多数の不一致**
1. **ルート要素が `<document>` ではなく `<maiml>` であるべき**
2. **名前空間が不完全**
   - 必須: `xmlns`, `xmlns:xsi`, `version`, `xsi:type`
3. **`<petri_net>` ではなく `<pnml>`（Petri Net Markup Language）**
4. **`<initial_marking>` タグは存在しない**
   - placeRefのinitialMarking属性として表現
5. **必須セクションが欠けている**
   - document配下: creator, vendor, owner, instrument
   - method配下: program
   - その他: protocol, data（オプション）

#### 正しい構造（maiml-unified.ts MaimlRoot型に基づく）
```xml
<?xml version="1.0" encoding="UTF-8"?>
<maiml 
  xmlns="http://www.example.com/maiml"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  version="1.0"
  xsi:type="maimlRootType">
  
  <document id="doc_001" uuid="...">
    <name>New Project</name>
    <description>Default MAIML project</description>
    <date>2026-02-25T00:00:00.000Z</date>
    
    <creator id="creator_001" uuid="...">
      <name>System</name>
    </creator>
    
    <vendor id="vendor_001" uuid="...">
      <name>MMDPF</name>
    </vendor>
    
    <owner id="owner_001" uuid="...">
      <name>User</name>
    </owner>
    
    <instrument id="instrument_001" uuid="...">
      <name>Default Instrument</name>
    </instrument>
  </document>
  
  <protocol id="protocol_001" uuid="...">
    <method id="method_001" uuid="...">
      <name>Method 1</name>
      <description>Default method</description>
      
      <pnml id="pnml_001" uuid="...">
        <place id="place_start">
          <name>Start</name>
        </place>
        <place id="place_end">
          <name>End</name>
        </place>
        <transition id="transition_001">
          <name>Process</name>
        </transition>
        <arc id="arc_001" source="place_start" target="transition_001" />
        <arc id="arc_002" source="transition_001" target="place_end" />
      </pnml>
      
      <program id="program_001" uuid="...">
        <instruction id="instruction_001" uuid="...">
          <transitionRef id="..." ref="transition_001" />
        </instruction>
      </program>
    </method>
  </protocol>
</maiml>
```

## 3. 実装がこうなった推測される経緯

### 仮説1: MAIML仕様書を参照せずに実装
- XSD型定義（maiml-unified.ts）が存在するにも関わらず、それを参照していない
- 独自の簡略化された構造を想像で作成した可能性

### 仮説2: 初期実装時の暫定コード
- プロトタイプとして簡易的な構造を作成
- 後で修正する予定だったが、そのまま残ってしまった

### 仮説3: ユーザー向け簡略化の意図
- MAIML完全版は複雑すぎるため、簡略版を提供しようとした
- しかし、それでは実際のMAIMLパーサーで読み込めない

## 4. 影響範囲

### 影響を受ける機能
1. **フォーマット管理画面 - テンプレート新規作成**
   - Material/Condition/Resultテンプレート作成時のデフォルトXML
2. **フォーマット管理画面 - MAIMLワークフロー新規作成**
   - MAIMLワークフロー作成時のデフォルトコンテンツ
3. **既に作成されたテンプレート/ワークフローファイル**
   - 既存ファイルが不正な構造の可能性

### データ整合性への影響
- **高**: 作成されたファイルがMAIMLパーサーで読み込めない可能性
- **高**: 実験管理画面で使用できない可能性
- **中**: S3に保存されたファイルの再生成が必要な可能性

## 5. 修正方針

### Phase 1: 型定義の確認と理解（30分）
- [x] maiml-unified.tsの型定義を再確認
- [x] Template型の正しい構造を理解
- [x] MaimlRoot型の正しい構造を理解
- [ ] 実際のMAIMLサンプルファイルを確認

### Phase 2: formatFileUtils.tsの修正（1時間）
- [ ] `generateMaterialTemplate()` の修正
  - MAIML準拠のTemplate構造に変更
  - 必須属性（id, uuid, category）を追加
  - Property型（xsi:type付き）に変更
- [ ] `generateConditionTemplate()` の修正
- [ ] `generateResultTemplate()` の修正
- [ ] `generateDefaultMaimlContent()` の修正
  - ルート要素を `<maiml>` に変更
  - 名前空間を完全に定義
  - document, protocol, method, pnml, program構造を正しく実装
  - UUID生成ロジックを追加

### Phase 3: テストとバリデーション（30分）
- [ ] 生成されたXML/MAIMLをパーサーでテスト
- [ ] 実際の画面で動作確認
- [ ] 既存ファイルへの影響を確認

## 6. 技術的詳細

### 必要な変更

#### 1. UUID生成の追加
```typescript
import { v4 as uuidv4 } from 'uuid';
```

#### 2. 名前空間定義の追加
```typescript
const MAIML_NAMESPACE = 'http://www.example.com/maiml';
const XSI_NAMESPACE = 'http://www.w3.org/2001/XMLSchema-instance';
```

#### 3. Template型に準拠したXML生成
```typescript
function generateMaterialTemplate(fileName: string, description?: string): string {
  const uuid = uuidv4();
  const id = `template_material_${Date.now()}`;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<template 
  id="${id}" 
  uuid="${uuid}"
  category="material"
  xmlns:xsi="${XSI_NAMESPACE}">
  <name>${escapeXml(fileName)}</name>
  <description>${escapeXml(description || '')}</description>
  <property key="sampleName" xsi:type="stringType">
    <description>サンプル名</description>
    <value></value>
  </property>
  <property key="quantity" units="g" xsi:type="doubleType">
    <description>量</description>
    <value>0.0</value>
  </property>
</template>`;
}
```

#### 4. MaimlRoot型に準拠したMAIML生成
```typescript
function generateDefaultMaimlContent(fileName: string, description?: string): string {
  const now = new Date().toISOString();
  
  // UUIDs
  const docUuid = uuidv4();
  const protocolUuid = uuidv4();
  const methodUuid = uuidv4();
  const pnmlUuid = uuidv4();
  const programUuid = uuidv4();
  const creatorUuid = uuidv4();
  const vendorUuid = uuidv4();
  const ownerUuid = uuidv4();
  const instrumentUuid = uuidv4();
  const instructionUuid = uuidv4();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<maiml 
  xmlns="${MAIML_NAMESPACE}"
  xmlns:xsi="${XSI_NAMESPACE}"
  version="1.0"
  xsi:type="maimlRootType">
  
  <document id="document_${Date.now()}" uuid="${docUuid}">
    <name>${escapeXml(fileName)}</name>
    <description>${escapeXml(description || '')}</description>
    <date>${now}</date>
    
    <creator id="creator_${Date.now()}" uuid="${creatorUuid}">
      <name>System</name>
    </creator>
    
    <!-- 残りのセクション省略 -->
  </document>
  
  <protocol id="protocol_${Date.now()}" uuid="${protocolUuid}">
    <method id="method_${Date.now()}" uuid="${methodUuid}">
      <name>Method 1</name>
      
      <pnml id="pnml_${Date.now()}" uuid="${pnmlUuid}">
        <place id="place_start"><name>Start</name></place>
        <place id="place_end"><name>End</name></place>
        <transition id="transition_001"><name>Process</name></transition>
        <arc id="arc_001" source="place_start" target="transition_001" />
        <arc id="arc_002" source="transition_001" target="place_end" />
      </pnml>
      
      <program id="program_${Date.now()}" uuid="${programUuid}">
        <instruction id="instruction_${Date.now()}" uuid="${instructionUuid}">
          <transitionRef id="transitionRef_${Date.now()}" ref="transition_001" />
        </instruction>
      </program>
    </method>
  </protocol>
</maiml>`;
}
```

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存ファイルが読み込めなくなる | 高 | 中 | パーサーで両方の形式に対応（後方互換性） |
| 実際のXSD仕様と異なる可能性 | 高 | 低 | XSDファイルを参照して正確性を確認 |
| フロントエンドのパーサーが対応していない | 中 | 低 | maimlParserTypedで動作確認 |

## 8. テスト計画

### ユニットテスト
- [ ] generateMaterialTemplate() のテスト
- [ ] generateConditionTemplate() のテスト
- [ ] generateResultTemplate() のテスト
- [ ] generateDefaultMaimlContent() のテスト

### 統合テスト
- [ ] 生成されたXMLをmaimlParserTypedでパース
- [ ] フォーマット管理画面での新規作成テスト
- [ ] 実験管理画面での読み込みテスト

### 手動テスト
- [ ] Material/Condition/Resultテンプレート新規作成
- [ ] MAIMLワークフロー新規作成
- [ ] 生成されたファイルをダウンロードして内容確認
- [ ] PetriNetEditorで読み込めるか確認

## 9. ロールバック計画

- 既存の実装をコメントアウトして残す
- フラグで切り替え可能にする（環境変数 `USE_LEGACY_FORMAT=true`）
- データベースに生成形式のバージョンを記録

## 10. 承認記録

- **計画書提示日時**: 2026-02-25 09:40
- **承認日時**: （承認待ち）
- **承認者コメント**: （待機中）

## 11. 次のステップ

1. ✅ **この計画書をユーザーに提示して承認を得る**
2. 実際のMAIMLサンプルファイルを確認（frontend/src/data/mock/等）
3. XSDファイルが存在すれば参照して正確性を確認
4. formatFileUtils.tsの修正実装
5. テスト実施

## 12. 関連ドキュメント

- [frontend/src/types/maiml-unified.ts](../frontend/src/types/maiml-unified.ts) - MAIML型定義
- [.clinerules/references/s3_structure.md](../.clinerules/references/s3_structure.md) - S3フォルダ構造
- [backend/src/utils/formatFileUtils.ts](../backend/src/utils/formatFileUtils.ts) - 現在の実装
