# maimlParserExp.ts 型定義明確化 タスク計画書

## メタデータ
- **作成日時**: 2026-01-30 17:05
- **タスクID**: maimlParserExp型定義明確化
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

`frontend/src/utils/maimlParserExp.ts` に対応する型定義を `frontend/src/components/editorv2/types/index.ts` で明確化し、TypeScriptの型安全性を向上させる。

## 2. 目的と期待される成果

### 目的
- maimlParserExp.ts の全メソッドに対する明確な型定義を追加
- 内部で使用される型を適切に定義
- 型の不一致や any の使用を削減

### 期待される成果
- [x] MaiMLParserExp クラスの型定義追加
- [x] 全メソッドの戻り値型定義
- [x] 内部型（template, property等）の明確化
- [x] TypeScript エラーの解消

## 3. 実装ステップ

### Phase 1: 不足している型定義の特定
- [x] maimlParserExp.ts のメソッドを全て確認
- [x] types/index.ts の既存定義と照合
- [x] 不足している型定義をリストアップ

### Phase 2: 基本型定義の追加
- [ ] MaiMLParserExpConstructorOptions 型定義
- [ ] 内部データ構造の型定義（xml-js形式）
- [ ] DOMParser関連の型定義

### Phase 3: メソッド戻り値型の明確化
- [ ] getTemplates / getTemplatesFromDOM の戻り値型
- [ ] parseTemplate / parseTemplateFromDOM の戻り値型
- [ ] parseProperties 系メソッドの戻り値型
- [ ] content関連の型定義強化

### Phase 4: 型の適用とエクスポート
- [ ] 定義した型を types/index.ts に追加
- [ ] JSDocコメントで型情報を補完
- [ ] export文の整理

### Phase 5: 動作確認
- [ ] TypeScript コンパイルエラーの確認
- [ ] 型推論が正しく機能するか確認
- [ ] 既存コードへの影響確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/types/index.ts`
   - 型定義の追加・明確化
   - JSDocコメントの追加

### 影響を受ける可能性のあるファイル
1. `frontend/src/utils/maimlParserExp.ts`
   - 型注釈の追加（必要に応じて）
2. maimlParserExp を使用する全コンポーネント
   - 型推論の改善により、補完が強化される

## 5. 技術的詳細

### 追加する主要な型定義

#### 5.1 MaiMLParserExp クラス関連

```typescript
/**
 * xml-js形式のXML要素型
 */
export interface XmlElement {
  _attributes?: Record<string, string>;
  _text?: string;
  [key: string]: any;
}

/**
 * xml-js形式のMAIML構造型
 */
export interface MaimlStructure {
  maiml?: {
    _attributes?: Record<string, string>;
    protocol?: ProtocolElement;
    data?: DataElement | DataElement[];
    eventLog?: any;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Protocol要素型
 */
export interface ProtocolElement {
  _attributes?: Record<string, string>;
  name?: XmlElement;
  method?: MethodElement | MethodElement[];
  materialTemplate?: any;
  conditionTemplate?: any;
  resultTemplate?: any;
  [key: string]: any;
}

/**
 * Method要素型
 */
export interface MethodElement {
  _attributes?: Record<string, string>;
  name?: XmlElement;
  pnml?: PnmlElement;
  program?: ProgramElement | ProgramElement[];
  materialTemplate?: any;
  conditionTemplate?: any;
  resultTemplate?: any;
  [key: string]: any;
}

/**
 * PNML要素型
 */
export interface PnmlElement {
  _attributes?: Record<string, string>;
  transition?: any | any[];
  place?: any | any[];
  arc?: any | any[];
  [key: string]: any;
}

/**
 * Program要素型
 */
export interface ProgramElement {
  _attributes?: Record<string, string>;
  instruction?: any | any[];
  materialTemplate?: any;
  conditionTemplate?: any;
  resultTemplate?: any;
  [key: string]: any;
}

/**
 * Data要素型
 */
export interface DataElement {
  _attributes?: Record<string, string>;
  results?: ResultsElement | ResultsElement[];
  [key: string]: any;
}

/**
 * Results要素型
 */
export interface ResultsElement {
  _attributes?: Record<string, string>;
  material?: any | any[];
  condition?: any | any[];
  result?: any | any[];
  [key: string]: any;
}
```

#### 5.2 DOMParser関連型

```typescript
/**
 * DOMParser抽出オプション型
 */
export interface DomParserOptions {
  preserveEmptyElements?: boolean;
  extractNestedProperties?: boolean;
}

/**
 * DOMベースのテンプレート抽出結果型
 */
export interface DomTemplateExtractionResult {
  materials: ParsedTemplate[];
  conditions: ParsedTemplate[];
  results: ParsedTemplate[];
  source: 'dom_parser';
}
```

#### 5.3 内部メソッド戻り値型の明確化

```typescript
/**
 * findInstructionInMethod の戻り値型
 */
export interface InstructionElement {
  _attributes?: Record<string, string>;
  description?: XmlElement;
  transitionRef?: {
    _attributes?: {
      ref: string;
    };
  };
  [key: string]: any;
}

/**
 * parseInsertionElement の戻り値型
 */
export interface InsertionProperty {
  key: 'insertion';
  type: 'insertion';
  description: string;
  elements: {
    uri?: {
      key: 'uri';
      type: 'stringType';
      description: string;
      defaultValue: string;
      required: boolean;
      isFileInput: boolean;
      source: string;
    };
    hash?: {
      key: 'hash';
      type: 'stringType';
      description: string;
      defaultValue: string;
      required: boolean;
      autoGenerate: boolean;
      source: string;
    };
    format?: {
      key: 'format';
      type: 'stringType';
      description: string;
      defaultValue: string;
      required: boolean;
      autoDetect: boolean;
      source: string;
    };
  };
  required: boolean;
  source: string;
  elementCount: number;
}
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存コードとの型不一致 | 中 | 低 | 段階的に型を追加し、都度確認 |
| any型の過度な使用 | 低 | 中 | 必要な箇所のみanyを許容 |
| 複雑すぎる型定義 | 低 | 低 | シンプルな型定義を心がける |

## 7. テスト計画

### TypeScript コンパイル確認
- [ ] `npm run build` でエラーがないか確認
- [ ] VSCode上での型エラー表示確認

### 型推論の確認
- [ ] メソッド呼び出し時の戻り値型が正しく推論されるか
- [ ] プロパティアクセス時の補完が機能するか

## 8. ロールバック計画

問題が発生した場合:
1. types/index.ts の変更を元に戻す
2. 追加した型定義のみをコメントアウト
3. 段階的に適用範囲を縮小

## 9. 関連ドキュメント

- [maimlParserExp.ts](../frontend/src/utils/maimlParserExp.ts)
- [types/index.ts](../frontend/src/components/editorv2/types/index.ts)

## 10. 承認記録

- **計画書提示日時**: 2026-01-30 17:05
- **承認待ち**

## 11. 実施記録

### 実施日時
開始: （承認後）
完了: （承認後）

### 計画からの変更点
（実施中に記録）

### 発生した問題と解決方法
（実施中に記録）

## 12. 完了基準

- [ ] 全ての型定義が追加された
- [ ] TypeScript コンパイルエラーがない
- [ ] 型推論が正しく機能する
- [ ] JSDocコメントが適切に記述されている
- [ ] 既存コードへの悪影響がない