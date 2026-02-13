# maiml-unified型定義 必須プロパティ見直し計画書

**作成日時**: 2026-02-03 16:12  
**タスクID**: maiml-unified-property-review  
**優先度**: 中  
**推定工数**: 2時間

---

## 1. タスク概要

XRF2.maiml（実MAIMLファイル）を基に、uuid等の必須プロパティを再検証し、型定義を実態に即した形に修正する。

---

## 2. XRF2.maimlでのuuid使用状況分析結果

### ✅ uuidを持つタグ（実質必須）

| タグ | id属性 | uuid | 判定 |
|------|--------|------|------|
| document | ✅ | ✅ | **uuid必須** |
| protocol | ✅ | ✅ | **uuid必須** |
| method | ✅ | ✅ | **uuid必須** |
| pnml | ✅ | ✅ | **uuid必須** |
| program | ✅ | ✅ | **uuid必須** |
| instruction | ✅ | ✅ | **uuid必須** |
| materialTemplate | ✅ | ✅ | **uuid必須** |
| conditionTemplate | ✅ | ✅ | **uuid必須** |
| resultTemplate | ✅ | ✅ | **uuid必須** |
| data | ✅ | ✅ | **uuid必須** |
| results | ✅ | ✅ | **uuid必須** |
| material | ✅ | ✅ | **uuid必須** |
| condition | ✅ | ✅ | **uuid必須** |
| result | ✅ | ✅ | **uuid必須** |
| eventLog | ✅ | ✅ | **uuid必須** |
| log | ✅ | ✅ | **uuid必須** |
| trace | ✅ | ✅ | **uuid必須** |
| event | ✅ | ✅ | **uuid必須** |
| creator | ✅ | ✅ | **uuid必須** |
| vendor | ✅ | ✅ | **uuid必須** |
| owner | ✅ | ✅ | **uuid必須** |
| instrument | ✅ | ✅ | **uuid必須** |

### ❌ uuidを持たないタグ（オプション）

| タグ | id属性 | uuid | 判定 |
|------|--------|------|------|
| place | ✅ | ❌ | uuidオプション（name, descriptionのみ） |
| transition | ✅ | ❌ | uuidオプション（name, descriptionのみ） |
| arc | ✅ | ❌ | uuidオプション（name, descriptionのみ） |

### 🔧 uuidを持たない特殊型（対象外）

| タグ | key属性 | uuid | 判定 |
|------|---------|------|------|
| property | ✅ | ❌ | **uuid不要**（key属性で識別、構造が特殊） |

**Property型の特徴**:
- MAIMLの中で特殊な型（測定パラメータ・結果データを表現）
- `key`属性で識別（uuidではなく）
- 型が動的（`xsi:type`属性で決定）
- 構造的にネスト可能（`propertyListType`）
- XSD仕様でもuuid定義なし
- 実MAIMLでもproperty要素にuuidは含まれない

→ **Property型はuuid必須化の対象外**

---

## 3. 採用方針: タグごとに必須判断 + 共通定義廃止

### XSD仕様に基づく必須性

#### hasIdAttributeType定義（XSD仕様）
```xml
<xs:complexType abstract="true" name="hasIdAttributeType">
    <xs:attribute name="id" type="xs:ID" use="required" />
</xs:complexType>
```
→ **id属性は必須** (`use="required"`)

#### globalObjectContentGroup定義（XSD仕様）
```xml
<xs:group name="globalObjectContentGroup">
  <xs:sequence>
    <xs:element name="uuid" type="uuid" />  <!-- 必須 -->
    <xs:choice>
      <xs:sequence>
        <xs:element name="name" type="xs:QName" minOccurs="0" />  <!-- オプション -->
        <xs:element name="description" type="xs:string" minOccurs="0" />  <!-- オプション -->
        <xs:element name="annotation" type="xs:string" minOccurs="0" />  <!-- オプション -->
      </xs:sequence>
    </xs:choice>
  </xs:sequence>
</xs:group>
```
→ **uuid必須、name/description/annotationオプション**

### 実装方針

#### ✅ 必須プロパティ（2つ）
1. **id**: `use="required"` (hasIdAttributeType)
2. **uuid**: `minOccurs` 指定なし = デフォルト1 (globalObjectContentGroup)

#### ❌ オプションプロパティ（3つ）
3. **name**: `minOccurs="0"` (globalObjectContentGroup)
4. **description**: `minOccurs="0"` (globalObjectContentGroup)
5. **annotation**: `minOccurs="0"` (globalObjectContentGroup)

### タグごとの分類

#### グループA: id必須 + uuid必須（21タグ）
- Document, Protocol, Method, PNML
- Program, Instruction
- MaterialTemplate, ConditionTemplate, ResultTemplate
- Data, Results, Material, Condition, Result
- EventLog, Log, Trace, Event
- Creator, Vendor, Owner, Instrument

#### グループB: id必須 + uuidオプション（3タグ）
- Place, Transition, Arc（Petri Net要素）

#### グループC: key必須 + uuid不要（1型）
- Property（特殊型、構造が異なる）

### 共通定義廃止の理由

❌ **MaimlElementBase廃止**:
- タグごとに必須性が異なる（uuid必須/オプション）
- 型安全性が損なわれる（オプショナルな共通定義だと必須チェックができない）
- ドキュメント性が低下（各タグの仕様が不明確）

✅ **個別定義のメリット**:
- XSD仕様と完全一致
- 型安全性の向上（必須プロパティをコンパイル時に保証）
- ドキュメント性の向上（タグごとの仕様が明確）
- 実MAIMLパターンと完全一致

---

## 4. 実装計画

### Phase 1: 型定義の更新

#### Step 1: MaimlElementBase の完全削除

**理由**:
- タグごとに必須性が異なる（共通定義では型安全性が保証できない）
- XSD仕様と完全一致させるため個別定義が必要

**@deprecated マーカーは削除**:
- 後方互換性維持のためではなく、完全に廃止する
- 新規実装では各タグで個別の型定義を使用

#### Step 2: タグごとの型定義作成（共通プロパティ個別定義）

**グループA: id必須 + uuid必須（21タグ）**

```typescript
// Document型（XSD仕様に完全準拠）
export interface Document {
  // === XSD: hasIdAttributeType ===
  id: string;              // 必須（use="required"）
  
  // === XSD: globalObjectContentGroup ===
  uuid: string;            // 必須（minOccurs指定なし = 1）
  name?: string;           // オプション（minOccurs="0"）
  description?: string;    // オプション（minOccurs="0"）
  annotation?: string;     // オプション（minOccurs="0"）
  
  // === Document固有のプロパティ ===
  creator: Creator[];
  vendor: Vendor[];
  owner: Owner[];
  instrument?: Instrument[];
  date?: string;
  // ...
}

// Protocol型（XSD仕様に完全準拠）
export interface Protocol {
  // === XSD: hasIdAttributeType ===
  id: string;              // 必須
  
  // === XSD: globalObjectContentGroup ===
  uuid: string;            // 必須
  name?: string;           // オプション
  description?: string;    // オプション
  annotation?: string;     // オプション
  
  // === Protocol固有のプロパティ ===
  method: Method[];
  materialTemplate?: MaterialTemplate[];
  conditionTemplate?: ConditionTemplate[];
  resultTemplate?: ResultTemplate[];
}

// Method型（XSD仕様に完全準拠）
export interface Method {
  id: string;              // 必須
  uuid: string;            // 必須
  name?: string;           // オプション
  description?: string;    // オプション
  annotation?: string;     // オプション
  
  pnml: PNML[];
  program: Program[];
  materialTemplate?: MaterialTemplate[];
  conditionTemplate?: ConditionTemplate[];
  resultTemplate?: ResultTemplate[];
}

// ... 他18タグも同様（Creator, Vendor, Owner, Instrument, PNML, Program, 
//     Instruction, MaterialTemplate, ConditionTemplate, ResultTemplate,
//     Data, Results, Material, Condition, Result, EventLog, Log, Trace, Event）
```

**グループB: id必須 + uuidオプション（3タグ）**

```typescript
// Place型（XSD仕様: uuidはglobalObjectContentGroupに含まれないケース）
export interface Place {
  id: string;              // 必須（hasIdAttributeType）
  uuid?: string;           // オプション（実MAIMLで不使用）
  name?: string;           // オプション
  description?: string;    // オプション
}

// Transition型
export interface Transition {
  id: string;              // 必須
  uuid?: string;           // オプション
  name?: string;           // オプション
  description?: string;    // オプション
}

// Arc型
export interface Arc {
  id: string;              // 必須
  uuid?: string;           // オプション
  name?: string;           // オプション
  description?: string;    // オプション
  source: string;          // 必須（Arc固有）
  target: string;          // 必須（Arc固有）
}
```

**グループC: Property型（構造が特殊）**

```typescript
// Property型は現状維持（key属性が識別子、uuidは不要）
export interface Property {
  key: string;             // 必須（XSD: uncertaintyBaseType）
  'xsi:type': PropertyType;// 必須
  description?: string;    // オプション
  value?: string | number | boolean;
  values?: (string | number | boolean)[];
  properties?: Property[];
  units?: string;
  formatString?: string;
  scaleFactor?: number;
}
```

### Phase 2: 既存コードの影響調査

**確認対象ファイル**:
- `frontend/src/services/maimlParser.ts`
- `backend/src/services/maimlService.ts`
- `backend/src/utils/petriNetExtractor.ts`

**確認ポイント**:
- uuid?からuuidへの変更で型エラーが発生する箇所
- Optional Chaining (`?.`) を使用している箇所

### Phase 3: 修正実装

**必要な修正パターン**:

```typescript
// ❌ 修正前（uuid?の場合）
if (element.uuid) {
  // uuid が存在する場合の処理
}

// ✅ 修正後（uuid必須の場合）
// uuidは常に存在するため、チェック不要
processUuid(element.uuid);
```

### Phase 4: テスト

- [ ] 型エラーがないことを確認
- [ ] 既存の単体テストがすべて成功
- [ ] maimlParser.tsの型変換が正常に動作
- [ ] petriNetExtractor.tsのPetri Net抽出が正常に動作

---

## 5. 期待される成果

### 実装後の効果

✅ **型安全性の向上**: uuidが実質必須のタグでコンパイル時エラー検出  
✅ **コード品質の向上**: Optional Chainingの不要な使用を削減  
✅ **ドキュメント性の向上**: タグごとの型定義で仕様が明確化  
✅ **実MAIMLとの整合性**: XRF2.maimlと完全一致する型定義

---

## 6. リスクと対策

### リスク1: 既存コードへの影響

**内容**: uuid?からuuidへの変更で型エラーが発生  
**影響度**: 中  
**発生確率**: 高

**対策**:
1. 段階的移行（非推奨化期間を設ける）
2. 影響範囲を事前に調査
3. テストケースで動作確認

### リスク2: XSD仕様との乖離

**内容**: XSD仕様にuuid定義がない場合、仕様と実装が乖離  
**影響度**: 低  
**発生確率**: 不明

**対策**:
1. コメントでXSD仕様との差異を明記
2. 実MAIMLパターンを優先する方針を文書化

---

## 7. 実施記録

### 実施日時
開始: 2026-02-03 16:12  
完了: （未定）

### 計画からの変更点
（実施中に発生した変更を記録）

### 発生した問題と解決方法
（実施中に発生した問題を記録）

### 最終的な成果物
- [ ] frontend/src/types/maiml-unified.ts 更新完了
- [ ] 既存コードの修正完了
- [ ] テスト完了

---

## 8. 振り返り

### うまくいった点
（完了後に記録）

### 改善が必要な点
（完了後に記録）

### 学んだこと
**uuid必須性の判断基準**:
- XSD仕様だけでなく、実MAIMLファイルの使用パターンを重視
- Petri Net要素（Place, Transition, Arc）は例外的にuuidオプション
- その他の主要タグ（21タグ）はすべてuuid必須

---

**承認日時**: 2026-02-03 16:20（予定）  
**承認者コメント**: （ユーザーからのフィードバック）