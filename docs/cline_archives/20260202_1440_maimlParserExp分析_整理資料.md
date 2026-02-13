# maimlParserExp.ts 分析・整理資料

## メタデータ
- **作成日時**: 2026-02-02 14:40
- **目的**: maimlParserExp.tsの役割と責務を整理し、今後の対応方針を検討
- **対象ファイル**: `frontend/src/utils/maimlParserExp.ts`

---

## 📋 現在のファイル概要

### 基本情報
- **ファイル名**: `maimlParserExp.ts`
- **クラス名**: `MaiMLParserExp`
- **役割**: MAIML（Materials Informatics Markup Language）形式のXMLファイルを解析し、フロントエンドで利用しやすい形式に変換する
- **行数**: 約2,700行（大規模クラス）
- **依存ライブラリ**: xml-js, DOMParser

---

## 🎯 このクラスの責務（何をしているか）

### 1. XMLパース処理（入力処理）

#### 1-1. xml-js形式でのパース
```typescript
constructor(maimlData: string | any) {
  if (typeof maimlData === 'string') {
    this.data = xmljs.xml2js(maimlData, { compact: true });
  } else {
    this.data = maimlData;
  }
  this.maiml = this.data.maiml || this.data;
}
```

**目的**: XML文字列をJavaScriptオブジェクトに変換

#### 1-2. DOMParser形式でのパース（補助的）
```typescript
if (this.maimlDataString) {
  const parser = new DOMParser();
  this.domDocument = parser.parseFromString(this.maimlDataString, 'text/xml');
}
```

**目的**: 空要素（`<property key="..." />`）を正しく取得するため

---

### 2. データ抽出メソッド群（中核機能）

#### 2-1. トランジション関連（実験作業者向け）

##### `getTransitionsForExperimentManager()`
**目的**: 実験作業者が実行すべきトランジション（作業）を抽出
**使用場所**: ExperimentWorkerメニュー
**処理内容**:
- `protocol/method/pnml/transition`要素を全て取得
- `program/instruction`要素からトランジション説明を取得
- アーク（arc）情報を取得して入出力を解析
- カテゴリ分類（experiment, preparation, finalization）を実施

**重要**: 複数method対応済み

```typescript
// 出力形式
{
  success: true,
  transitions: [
    {
      id: "T001",
      methodId: "method_0",
      name: "サンプル準備",
      description: "...",
      hasInstruction: true,
      arcCount: 2,
      arcs: [...],
      category: "preparation"
    }
  ],
  metadata: { ... }
}
```

##### `getMethods()`
**目的**: 各メソッドとそのトランジション一覧を取得
**使用場所**: 複数method対応の画面
**処理内容**:
- `protocol/method`要素を全て取得
- 各methodのpnmlからトランジションを抽出

```typescript
// 出力形式
[
  {
    methodId: "method_0",
    methodName: "分析手順A",
    transitions: [
      { id: "T001", name: "..." },
      { id: "T002", name: "..." }
    ],
    transitionCount: 2
  }
]
```

---

#### 2-2. テンプレート関連（Petri Net エディタ向け）

##### `getTemplates()`
**目的**: Material/Condition/Resultテンプレート一覧を取得
**使用場所**: PetriNetエディタ、テンプレート編集ダイアログ
**処理内容**:
- `protocol/materialTemplate`, `conditionTemplate`, `resultTemplate`を取得
- `method`直下のテンプレートも取得
- `program`配下のテンプレートも取得
- `property`要素を解析してプロパティリストを構築
- `templateRef`（テンプレート参照）を解決

**重要**: 
- 複数method対応済み
- templateRef参照解決対応済み
- insertion要素（ファイル添付）対応済み
- propertyListType多重ネスト対応済み

```typescript
// 出力形式
{
  materials: [
    {
      id: "MT001",
      type: "material",
      name: "試薬A",
      placeRef: "P001",
      transitionRef: "T001",
      properties: [
        {
          key: "concentration",
          type: "doubleType",
          description: "濃度",
          units: "mol/L",
          defaultValue: ""
        },
        {
          key: "OnePoint",
          type: "propertyListType",
          properties: [
            { key: "Position", ... },
            { key: "Intensity", ... }
          ]
        }
      ]
    }
  ],
  conditions: [...],
  results: [...]
}
```

##### `getTemplatesFromDOM()`
**目的**: DOMParser版テンプレート取得（空要素対応）
**使用場所**: getTemplates()の内部でフォールバック
**処理内容**:
- DOMDocumentから直接テンプレートを抽出
- 空の`<property key="..." />`要素も正しく取得

---

#### 2-3. 既存データ関連（データ編集向け）

##### `getExistingExperimentData()`
**目的**: 既に保存された実験データ（material/condition/result）を取得
**使用場所**: データ編集モーダル
**処理内容**:
- `data/results/result`, `material`, `condition`要素を全て取得
- `property`要素を解析してプロパティ値を抽出
- `content`要素（数値配列データ）を解析
- `propertyListType`（ネスト構造）を忠実にパース
- OnePoint要素（XRFスペクトル等）の特殊処理

**重要**:
- content要素の完全対応（Intensity等の数値配列）
- propertyListType内のネストcontent対応
- xsi:type最優先パース

```typescript
// 出力形式
{
  materials: [
    {
      elementId: "M001",
      templateRef: "MT001",
      properties: {
        "concentration": 0.5,
        "OnePoint": {
          type: "propertyList",
          properties: {
            "Position": 12.34,
            "Intensity": {
              type: "content",
              values: [100, 200, 300, ...],
              axis: "Energy",
              units: "keV"
            }
          }
        }
      }
    }
  ],
  conditions: [...],
  results: [...]
}
```

---

#### 2-4. その他の補助メソッド

##### `findTransitionByPlace(placeId)`
**目的**: place IDからトランジションIDを特定
**処理内容**: arcを辿ってplaceに接続されたtransitionを検索

##### `getArcs()`
**目的**: 全てのarc（エッジ）要素を取得
**処理内容**: pnml/arcを全て取得し、source/targetを抽出

##### `findTemplateById(templateId)`
**目的**: テンプレートIDからテンプレートを検索
**処理内容**: protocol/method/program配下を全て探索

##### `resolveTemplateRef(templateRefId)`
**目的**: templateRef参照を解決
**処理内容**: 参照先テンプレートを再帰的に取得

##### `validateForExperimentManager()`
**目的**: ExperimentManager向けのファイル検証
**処理内容**: 必須要素の存在チェック

---

## 🔍 データフロー図

```
XML文字列
  ↓
[xml-js] コンパクト形式に変換
  ↓
MaiMLParserExp
  ├─ data: any ────────→ 全体のXMLデータ（生データ）
  ├─ maiml: any ───────→ maimlルート要素
  ├─ domDocument ──────→ DOMParser版（空要素対応用）
  │
  ├─ getTransitionsForExperimentManager()
  │   ↓
  │   [ protocol/method/pnml/transition ]
  │   [ program/instruction ]
  │   ↓
  │   トランジション一覧（カテゴリ分類済み）
  │
  ├─ getTemplates()
  │   ↓
  │   [ protocol/materialTemplate ]
  │   [ method/conditionTemplate ]
  │   [ program/resultTemplate ]
  │   ↓
  │   テンプレート一覧（プロパティ解析済み）
  │
  └─ getExistingExperimentData()
      ↓
      [ data/results/material ]
      [ data/results/condition ]
      [ data/results/result ]
      ↓
      既存データ（プロパティ値解析済み）
```

---

## 🧩 使用される場所

### 1. PetriNetエディタ関連
- **ファイル**: `frontend/src/utils/petriNetExtractor.ts`
- **メソッド**: `getTemplates()`, `getTemplatesForPetriNetViewer()`
- **目的**: Petri Net可視化のためにテンプレート情報を取得

### 2. ExperimentWorkerメニュー
- **ファイル**: `frontend/src/components/experiment_worker/*`
- **メソッド**: `getTransitionsForExperimentManager()`, `getMethods()`
- **目的**: 実験作業者が実行可能なトランジションを一覧表示

### 3. データ編集モーダル
- **ファイル**: `frontend/src/components/experiment_admin/*`
- **メソッド**: `getExistingExperimentData()`
- **目的**: 既存の実験データを読み込んで編集

---

## ⚠️ 現在の問題点

### 問題1: any型への依存
```typescript
private data: any;
private maiml: any;
```

**影響**:
- 型安全性がない
- IDEの補完が効かない
- ランタイムエラーのリスク

### 問題2: xml-js形式の非標準構造
```typescript
// xml-js形式（独自構造）
{
  property: {
    _attributes: { key: "concentration" },
    value: { _text: "0.5" }
  }
}

// 本来のXSD準拠型（標準構造）
{
  property: {
    key: "concentration",
    value: "0.5"
  }
}
```

**影響**:
- 複雑なネスト構造の取り扱いが困難
- プロパティアクセスが冗長（`._attributes?.key`）
- 空要素の取り扱いが不統一

### 問題3: 巨大クラス（約2,700行）
**影響**:
- 保守性が低い
- テストが困難
- 責務が明確でない

### 問題4: 重複コード
- `parsePropertiesFaithful()` と `parsePropertiesFromDOM()` が似た処理
- `getTemplates()` と `getTemplatesFromDOM()` が似た処理

---

## 🎯 Phase 2で目指すこと

### Phase 2の目的（再確認）
**「xml-js形式」→「XSD準拠型」への移行**

```typescript
// 移行前（現在）
class MaiMLParserExp {
  private data: any;  // xml-js形式
  private maiml: any; // xml-js形式
  
  getTemplates() {
    // this.maiml?.protocol?.method を直接操作
    // ._attributes?.key でアクセス
  }
}

// 移行後（Phase 2完了時）
class MaiMLParserExp {
  private typedMaiml: MaimlRoot | null; // XSD準拠型
  
  getTemplates() {
    // this.typedMaiml?.protocol?.method を操作
    // .key で直接アクセス（型安全）
  }
}
```

---

## 📊 Phase 2の詳細な作業内容

### Phase 2-1: 基盤整備（型変換処理の追加）

#### 何をするか
1. `maimlTypeConverter.ts`をインポート
2. `typedMaiml`フィールドを追加
3. コンストラクタで`convertXmlJsToMaimlRoot()`を実行

#### なぜ必要か
- xml-js形式からXSD準拠型に変換するため
- 型安全なデータアクセスを可能にするため

#### 影響範囲
- **破壊的変更なし**
- 既存のdata/maimlフィールドは維持
- 既存メソッドは変更不要

---

### Phase 2-2: アクセサメソッドの追加

#### 何をするか
```typescript
getTypedMaiml(): MaimlRoot | null
getTypedProtocol(): Protocol | null
getTypedMethods(): Method[]
getTypedMethod(methodId: string): Method | null
```

#### なぜ必要か
- 型安全にデータにアクセスするため
- 次のPhaseで既存メソッドを書き換える準備

#### 影響範囲
- **破壊的変更なし**
- 新規メソッド追加のみ

---

### Phase 2-3: 既存メソッドの書き換え

#### 何をするか（高優先度）
1. **getTransitionsForExperimentManager()**
   ```typescript
   // 変更前
   const methods = Array.isArray(protocol.method) ? protocol.method : [protocol.method];
   methods.forEach((method, methodIndex) => {
     const methodId = method._attributes?.id || `method_${methodIndex}`;
     // ...
   });
   
   // 変更後
   const methods = this.getTypedMethods();
   methods.forEach((method, methodIndex) => {
     const methodId = method.id; // 型安全
     // ...
   });
   ```

2. **getMethods()**
   ```typescript
   // 変更前
   const methods = Array.isArray(protocol.method) ? protocol.method : [protocol.method];
   
   // 変更後
   const methods = this.getTypedMethods();
   ```

#### 何をするか（中優先度）
3. **getTemplates()**
4. **getExistingExperimentData()**

#### なぜ必要か
- 型安全性を確保
- コードの可読性向上
- IDEの補完サポート

#### 影響範囲
- **破壊的変更の可能性あり**
- メソッドの戻り値型は維持（外部インターフェース不変）
- 内部実装のみ変更

---

### Phase 2-4: 旧型フィールドの削除（オプショナル）

#### 何をするか
```typescript
// 削除対象
// private data: any;
// private maiml: any;
```

#### なぜ必要か（議論の余地あり）
- コードのクリーンアップ
- 二重管理の解消
- メモリ使用量削減

#### 影響範囲
- **破壊的変更の可能性が高い**
- 既存メソッドが全てtypedMaimlに依存していることが前提
- Phase 2-3完了後のみ実施可能

---

## 🤔 検討すべき論点

### 論点1: Phase 2-4（旧型削除）は本当に必要か？

#### A案: 削除する（引き継ぎ資料の方針）
**メリット**:
- コードがクリーン
- 型安全性が保証される
- 二重管理がなくなる

**デメリット**:
- 既存メソッド全ての書き換えが必須
- リスクが高い
- 工数が大きい（2-3時間）

#### B案: 削除しない（共存）
**メリット**:
- リスクが低い
- 段階的な移行が可能
- 既存メソッドをそのまま維持できる

**デメリット**:
- 二重管理になる
- メモリ使用量が増える

**推奨**: まずはB案（共存）で進め、後で必要に応じてA案を検討

---

### 論点2: Phase 2-3の優先順位と範囲

#### 最小限の変更（推奨）
- **対象**: 新規機能のみ
- **方針**: 既存メソッドは触らない、新規メソッドのみtypedMaimlを使用
- **メリット**: リスク最小、既存機能の破壊なし
- **デメリット**: 統一性がない

#### 段階的な移行
- **対象**: 高優先度メソッドのみ
- **方針**: getTransitionsForExperimentManager(), getMethods()のみ書き換え
- **メリット**: リスク中程度、主要機能の型安全化
- **デメリット**: 部分的な統一

#### 全面的な移行
- **対象**: 全メソッド
- **方針**: 全てのメソッドをtypedMaimlに書き換え
- **メリット**: 完全な型安全化、統一性
- **デメリット**: リスク大、工数大（4-6時間）

**推奨**: まずは「最小限の変更」で進め、動作確認後に必要に応じて「段階的な移行」を検討

---

### 論点3: 型定義不足への対応

#### 懸念
引き継ぎ資料にも記載があるように、実装中に型定義不足が発見される可能性が高い

#### 対応方針（案）
1. **即座に報告・中断**（引き継ぎ資料の方針）
2. **一時的に any で回避**（実用的）
3. **型定義を拡張**（理想的だが工数大）

**推奨**: 実装中に型定義不足が発見されたら即座に報告し、ユーザーと協議

---

## 📝 今後の推奨アクション

### Step 1: 現状維持で一旦様子見（0時間）
- Phase 2実装を見送り
- 現在のmaimlParserExp.tsをそのまま使用
- 新規機能が必要になったら再検討

### Step 2: 最小限のPhase 2実装（1-2時間）
1. Phase 2-1: typedMaiml基盤追加
2. Phase 2-2: アクセサメソッド追加
3. **Phase 2-3は実施しない**
4. **Phase 2-4は実施しない**

**メリット**: 
- リスク最小
- 既存機能は一切変更しない
- 新規機能でtypedMaimlを使用可能

### Step 3: 段階的なPhase 2実装（2-4時間）
1. Phase 2-1: typedMaiml基盤追加
2. Phase 2-2: アクセサメソッド追加
3. Phase 2-3: 高優先度メソッドのみ書き換え
4. Phase 2-4: 実施しない（共存）

**メリット**:
- 主要メソッドの型安全化
- リスク中程度
- 既存機能との共存

### Step 4: 全面的なPhase 2実装（4-6時間）
引き継ぎ資料の通りに全て実施

**メリット**: 完全な型統一
**デメリット**: リスク大、工数大

---

## 🎯 結論と提案

### 推奨方針: Step 2（最小限のPhase 2実装）

#### 理由
1. **リスク最小化**: 既存機能を一切変更しない
2. **将来の拡張性**: typedMaimlが使える状態になる
3. **工数適正**: 1-2時間で完了
4. **段階的移行**: 後で必要に応じてPhase 2-3を実施可能

#### 実施内容
```typescript
// Phase 2-1 & 2-2のみ実施
class MaiMLParserExp {
  private data: any;  // 既存（維持）
  private maiml: any; // 既存（維持）
  private typedMaiml: MaimlRoot | null; // 新規追加
  
  constructor(maimlData: string | any) {
    // 既存処理（維持）
    // ...
    
    // 型変換追加
    try {
      this.typedMaiml = convertXmlJsToMaimlRoot(this.data);
    } catch (error) {
      this.typedMaiml = null;
    }
  }
  
  // 既存メソッド（全て維持・変更なし）
  getTransitionsForExperimentManager() { ... }
  getTemplates() { ... }
  
  // 新規アクセサ（追加のみ）
  getTypedMaiml() { ... }
  getTypedProtocol() { ... }
  getTypedMethods() { ... }
  getTypedMethod(methodId) { ... }
}
```

---

## 📞 次のアクション

ユーザーに確認すべき質問：

### 質問1: Phase 2の範囲
どのStepを実施しますか？
- A. Step 1: 現状維持（Phase 2見送り）
- B. Step 2: 最小限実装（Phase 2-1 & 2-2のみ）← **推奨**
- C. Step 3: 段階的実装（Phase 2-1 ~ 2-3高優先度）
- D. Step 4: 全面実装（Phase 2-1 ~ 2-4全て）

### 質問2: 実施タイミング
- A. 今すぐ実施
- B. 後で実施（他のタスクを優先）

### 質問3: 型定義不足への対応
実装中に型定義不足が発見された場合：
- A. 即座に中断・報告（引き継ぎ資料の方針）
- B. 一時的にanyで回避して先に進む
- C. 型定義を拡張してから進む

---

**Last Updated**: 2026-02-02 14:40
**推奨**: Step 2（最小限のPhase 2実装）で進める