# XSDからTypeScript型定義を自動生成するツール

## 概要

`backend/reference/schemas/` 内のXSDファイルを解析し、TypeScript型定義を自動生成するツールです。

## 生成される型定義

- **出力ファイル**: `frontend/src/types/maiml-schema.ts`
- **生成される型の数**: 151個
- **ファイルサイズ**: 約1,237行

## 使用方法

### 1回だけ生成

```bash
cd backend
npm run generate:types
```

### ファイル変更を監視して自動生成（開発時）

```bash
cd backend
npm run generate:types:watch
```

XSDファイルに変更があると自動的に型定義が再生成されます。

## 生成される型の例

### SimpleType（型エイリアス）

```typescript
/**
 * uuid
 * @generated from XSD
 */
export type Uuid = string; // Pattern: [0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[3-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}
```

### ComplexType（インターフェース）

```typescript
/**
 * maimlRootType
 * @generated from XSD
 */
export interface MaimlRootType extends RootObjectType {
  protocol: ProtocolType;
  data: DataType;
  eventLog: EventLogType;
}
```

## 対応するXSDファイル

以下のXSDファイルから型定義が生成されます：

1. `maiml.xsd` - メインスキーマ
2. `maiml-core.xsd` - コア要素
3. `maiml-simpleTypes.xsd` - シンプル型定義
4. `maiml-property.xsd` - プロパティ定義
5. `maiml-document.xsd` - ドキュメント関連
6. `maiml-protocol.xsd` - プロトコル定義
7. `maiml-pnml.xsd` - Petri Net定義
8. `maiml-data.xsd` - データ構造
9. `maiml-eventLog.xsd` - イベントログ
10. `maiml-refTypes.xsd` - 参照型定義

## 型マッピング

### XSD基本型 → TypeScript型

| XSD型 | TypeScript型 |
|-------|-------------|
| xs:string | string |
| xs:int, xs:integer | number |
| xs:boolean | boolean |
| xs:date, xs:dateTime | string |
| xs:decimal, xs:float, xs:double | number |

### カスタム型

XSDで定義されたcomplexTypeとsimpleTypeは、PascalCase形式のTypeScript型に変換されます。

例：
- `maimlRootType` → `MaimlRootType`
- `protocolType` → `ProtocolType`
- `uuid` → `Uuid`

## 実装の詳細

### 生成ロジック

1. **Phase 1**: simpleTypesを最初に処理（他の型が依存するため）
2. **Phase 2**: complexTypesを処理
3. **型マッピング**: XSD型名 → TypeScript型名の変換
4. **継承関係**: xs:extensionをextendsとして出力
5. **配列型**: maxOccurs="unbounded"を配列型として出力
6. **オプショナル**: minOccurs="0"をオプショナルプロパティとして出力

### 主要クラス

```typescript
class MaimlTypeGenerator {
  async generate(): Promise<void>
  private loadSchemas(): Promise<void>
  private generateTypes(): Promise<void>
  private generateInterface(complexType): string | null
  private generateTypeAlias(simpleType): string | null
  private mapXsdTypeToTs(xsdType: string): string
}
```

## トラブルシューティング

### 型定義生成に失敗する

XSDファイルのパスを確認してください：

```bash
ls -la backend/reference/schemas/*.xsd
```

### TypeScriptコンパイルエラー

生成されたファイルを確認：

```bash
npx tsc --noEmit frontend/src/types/maiml-schema.ts
```

### 依存パッケージが見つからない

必要なパッケージをインストール：

```bash
cd backend
npm install xml2js @types/xml2js
```

## 開発者向け情報

### スクリプトの場所

- **生成スクリプト**: `backend/scripts/generate-types-from-xsd.ts`
- **package.jsonスクリプト**:
  - `generate:types`: 1回だけ生成
  - `generate:types:watch`: ファイル監視して自動生成

### カスタマイズ

`backend/scripts/generate-types-from-xsd.ts` の設定を変更：

```typescript
const generator = new MaimlTypeGenerator({
  schemasDir: path.join(__dirname, '../reference/schemas'),
  outputFile: path.join(__dirname, '../../frontend/src/types/maiml-schema.ts'),
  namespace: 'MaimlSchema',
});
```

## 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-02-02 | 初版作成（151型定義生成） | Development Team |

## 関連ドキュメント

- [計画書](../../docs/20260202_0931_XSDからMaiml型定義生成_PLAN.md)
- [XSD仕様](../reference/schemas/)
- [生成された型定義](../../frontend/src/types/maiml-schema.ts)