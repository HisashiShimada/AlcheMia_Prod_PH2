/**
 * XSDファイルからTypeScript型定義を自動生成するツール（改善版）
 * 
 * @description
 * backend/reference/schemas/ 内のXSDファイルを解析し、
 * TypeScript型定義を自動生成します。
 * 
 * Phase 3改善内容：
 * - xs:group要素の処理実装
 * - xs:choice要素の適切な処理
 * - xs:extension内のxs:choice対応
 * - globalObjectContentGroupの展開
 * 
 * @usage
 * npm run generate:types
 * 
 * @version 2.0.0
 * @date 2026-02-02
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parseStringPromise } from 'xml2js';

interface GeneratorConfig {
  schemasDir: string;
  outputFile: string;
  namespace: string;
}

interface XsdAttribute {
  $?: {
    name?: string;
    type?: string;
    use?: string;
  };
}

interface XsdElement {
  $?: {
    name?: string;
    type?: string;
    minOccurs?: string;
    maxOccurs?: string;
    ref?: string;
  };
}

interface XsdGroup {
  $?: {
    name?: string;
    ref?: string;
  };
  'xs:sequence'?: any[];
  'xs:choice'?: any[];
}

interface XsdComplexType {
  $?: {
    name?: string;
    abstract?: string;
  };
  'xs:sequence'?: Array<{
    'xs:element'?: XsdElement[];
    'xs:group'?: XsdGroup[];
  }>;
  'xs:choice'?: Array<{
    'xs:element'?: XsdElement[];
    'xs:sequence'?: Array<{
      'xs:element'?: XsdElement[];
      'xs:group'?: XsdGroup[];
    }>;
    'xs:group'?: XsdGroup[];
  }>;
  'xs:attribute'?: XsdAttribute[];
  'xs:complexContent'?: Array<{
    'xs:extension'?: Array<{
      $?: { base?: string };
      'xs:sequence'?: Array<{
        'xs:element'?: XsdElement[];
        'xs:group'?: XsdGroup[];
      }>;
      'xs:choice'?: Array<{
        'xs:element'?: XsdElement[];
        'xs:sequence'?: Array<{
          'xs:element'?: XsdElement[];
          'xs:group'?: XsdGroup[];
        }>;
        'xs:group'?: XsdGroup[];
      }>;
      'xs:attribute'?: XsdAttribute[];
      'xs:group'?: XsdGroup[];
    }>;
  }>;
  'xs:group'?: XsdGroup[];
}

interface XsdSimpleType {
  $?: {
    name?: string;
  };
  'xs:restriction'?: Array<{
    $?: { base?: string };
    'xs:pattern'?: Array<{ $?: { value?: string } }>;
  }>;
  'xs:list'?: Array<{
    $?: { itemType?: string };
  }>;
}

interface TypeProperty {
  name: string;
  type: string;
  optional: boolean;
  comment?: string;
}

/**
 * XSD → TypeScript 型定義生成クラス（改善版）
 */
class MaimlTypeGenerator {
  private config: GeneratorConfig;
  private schemas: Map<string, any> = new Map();
  private generatedTypes: string[] = [];
  private typeMap: Map<string, string> = new Map();
  private groups: Map<string, XsdGroup> = new Map();

  constructor(config: GeneratorConfig) {
    this.config = config;
  }

  /**
   * メイン実行メソッド
   */
  async generate(): Promise<void> {
    console.log('🔍 XSDファイルを読み込み中...');
    await this.loadSchemas();

    console.log('📦 グループ定義を収集中...');
    this.collectGroups();

    console.log('🔨 型定義を生成中...');
    await this.generateTypes();

    console.log('💾 ファイルに書き込み中...');
    await this.writeOutput();

    console.log('✅ 型定義生成完了！');
    console.log(`📄 出力ファイル: ${this.config.outputFile}`);
    console.log(`📊 生成された型: ${this.generatedTypes.length}個`);
    console.log(`📦 グループ定義: ${this.groups.size}個`);
  }

  /**
   * XSDファイルを読み込んで解析
   */
  private async loadSchemas(): Promise<void> {
    const schemaFiles = [
      'maiml.xsd',
      'maiml-core.xsd',
      'maiml-simpleTypes.xsd',
      'maiml-property.xsd',
      'maiml-document.xsd',
      'maiml-protocol.xsd',
      'maiml-pnml.xsd',
      'maiml-data.xsd',
      'maiml-eventLog.xsd',
      'maiml-refTypes.xsd',
    ];

    for (const file of schemaFiles) {
      const filePath = path.join(this.config.schemasDir, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = await parseStringPromise(content);
        this.schemas.set(file, parsed);
        console.log(`  ✓ ${file}`);
      } catch (error) {
        console.warn(`  ⚠ ${file} の読み込みに失敗: ${error}`);
      }
    }
  }

  /**
   * 全スキーマからグループ定義を収集
   */
  private collectGroups(): void {
    for (const [filename, schema] of this.schemas) {
      const groups = schema['xs:schema']?.['xs:group'] || [];
      for (const group of groups) {
        const groupName = group.$?.name;
        if (groupName) {
          this.groups.set(groupName, group);
          console.log(`  ✓ グループ: ${groupName} (from ${filename})`);
        }
      }
    }
  }

  /**
   * 型定義を生成
   */
  private async generateTypes(): Promise<void> {
    // Phase 1: simpleTypesを最初に処理（他の型が依存するため）
    for (const [filename, schema] of this.schemas) {
      if (filename.includes('simpleTypes')) {
        console.log(`  - ${filename} (simpleTypes) を処理中...`);
        this.processSchema(schema, filename);
      }
    }

    // Phase 2: 残りのスキーマを処理
    for (const [filename, schema] of this.schemas) {
      if (!filename.includes('simpleTypes')) {
        console.log(`  - ${filename} を処理中...`);
        this.processSchema(schema, filename);
      }
    }
  }

  /**
   * スキーマを処理
   */
  private processSchema(schema: any, _filename: string): void {
    const complexTypes = schema['xs:schema']?.['xs:complexType'] || [];
    const simpleTypes = schema['xs:schema']?.['xs:simpleType'] || [];

    // SimpleType の処理
    for (const simpleType of simpleTypes) {
      const typeDef = this.generateTypeAlias(simpleType);
      if (typeDef) {
        this.generatedTypes.push(typeDef);
      }
    }

    // ComplexType の処理
    for (const complexType of complexTypes) {
      const typeDef = this.generateInterface(complexType);
      if (typeDef) {
        this.generatedTypes.push(typeDef);
      }
    }
  }

  /**
   * ComplexType → Interface を生成
   */
  private generateInterface(complexType: XsdComplexType): string | null {
    const name = complexType.$?.name;
    if (!name) return null;

    const interfaceName = this.toPascalCase(name);
    const isAbstract = complexType.$?.abstract === 'true';
    
    let code = `/**\n * ${name}`;
    if (isAbstract) {
      code += ' (abstract)';
    }
    code += '\n * @generated from XSD\n */\n';
    code += `export interface ${interfaceName}`;

    // 継承関係の処理
    const baseType = this.getBaseType(complexType);
    if (baseType) {
      code += ` extends ${baseType}`;
    }

    code += ' {\n';

    // プロパティの抽出
    const properties = this.extractProperties(complexType);
    for (const prop of properties) {
      const optional = prop.optional ? '?' : '';
      if (prop.comment) {
        code += `  /** ${prop.comment} */\n`;
      }
      code += `  ${prop.name}${optional}: ${prop.type};\n`;
    }

    code += '}\n\n';

    // 型名をマップに登録
    this.typeMap.set(name, interfaceName);

    return code;
  }

  /**
   * SimpleType → Type Alias を生成
   */
  private generateTypeAlias(simpleType: XsdSimpleType): string | null {
    const name = simpleType.$?.name;
    if (!name) return null;

    const aliasName = this.toPascalCase(name);
    
    // restriction の処理
    const restriction = simpleType['xs:restriction']?.[0];
    const listDef = simpleType['xs:list']?.[0];

    let tsType: string;
    let comment = '';

    if (restriction) {
      const baseType = restriction.$?.base || 'string';
      tsType = this.mapXsdTypeToTs(baseType);
      
      // pattern があればコメントに追加
      const pattern = restriction['xs:pattern']?.[0]?.$?.value;
      if (pattern) {
        comment = ` // Pattern: ${pattern}`;
      }
    } else if (listDef) {
      const itemType = listDef.$?.itemType || 'string';
      tsType = `${this.mapXsdTypeToTs(itemType)}[]`;
    } else {
      tsType = 'string';
    }

    let code = `/**\n * ${name}\n * @generated from XSD\n */\n`;
    code += `export type ${aliasName} = ${tsType};${comment}\n\n`;

    // 型名をマップに登録
    this.typeMap.set(name, aliasName);

    return code;
  }

  /**
   * 基底型を取得
   */
  private getBaseType(complexType: XsdComplexType): string | null {
    const extension = complexType['xs:complexContent']?.[0]?.['xs:extension']?.[0];
    if (extension?.$?.base) {
      return this.mapXsdTypeToTs(extension.$.base);
    }
    return null;
  }

  /**
   * プロパティを抽出（改善版）
   */
  private extractProperties(complexType: XsdComplexType): TypeProperty[] {
    const properties: TypeProperty[] = [];

    // 1. 直接のsequence要素の処理
    const sequence = complexType['xs:sequence']?.[0];
    if (sequence) {
      properties.push(...this.processSequence(sequence));
    }

    // 2. 直接のchoice要素の処理
    const choice = complexType['xs:choice']?.[0];
    if (choice) {
      properties.push(...this.processChoice(choice));
    }

    // 3. 直接のgroup要素の処理
    const groups = complexType['xs:group'] || [];
    for (const group of groups) {
      properties.push(...this.processGroup(group));
    }

    // 4. complexContent/extension の処理
    const extension = complexType['xs:complexContent']?.[0]?.['xs:extension']?.[0];
    if (extension) {
      // extension内のsequence
      if (extension['xs:sequence']?.[0]) {
        properties.push(...this.processSequence(extension['xs:sequence'][0]));
      }

      // extension内のchoice（これが重要！Property型で使われる）
      if (extension['xs:choice']?.[0]) {
        properties.push(...this.processChoice(extension['xs:choice'][0]));
      }

      // extension内のgroup
      const extGroups = extension['xs:group'] || [];
      for (const group of extGroups) {
        properties.push(...this.processGroup(group));
      }

      // extension内のattribute
      const extAttributes = extension['xs:attribute'] || [];
      for (const attr of extAttributes) {
        const prop = this.extractAttributeProperty(attr);
        if (prop) properties.push(prop);
      }
    }

    // 5. 直接のattribute要素の処理
    const attributes = complexType['xs:attribute'] || [];
    for (const attr of attributes) {
      const prop = this.extractAttributeProperty(attr);
      if (prop) properties.push(prop);
    }

    return properties;
  }

  /**
   * xs:sequence要素を処理（新規）
   */
  private processSequence(sequence: any): TypeProperty[] {
    const properties: TypeProperty[] = [];

    // sequence内のelement
    const elements = sequence['xs:element'] || [];
    for (const element of elements) {
      const prop = this.extractProperty(element);
      if (prop) properties.push(prop);
    }

    // sequence内のchoice（重要：globalObjectContentGroupで使用）
    const choices = sequence['xs:choice'] || [];
    for (const choice of choices) {
      properties.push(...this.processChoice(choice));
    }

    // sequence内のgroup
    const groups = sequence['xs:group'] || [];
    for (const group of groups) {
      properties.push(...this.processGroup(group));
    }

    return properties;
  }

  /**
   * xs:choice要素を処理（新規）
   */
  private processChoice(choice: any): TypeProperty[] {
    const properties: TypeProperty[] = [];

    // choice内のsequence
    const sequences = choice['xs:sequence'] || [];
    const groups = choice['xs:group'] || [];

    // encryptionGroupを含むか確認
    const hasEncryption = groups.some((g: XsdGroup) => g.$?.ref === 'encryptionGroup');

    if (hasEncryption && sequences.length === 1) {
      // encryptionGroupとの二択の場合、通常のコンテンツ（sequence）のみを採用
      console.log('    ℹ encryptionGroupを検出。通常コンテンツを優先します。');
      properties.push(...this.processSequence(sequences[0]));
    } else {
      // その他の場合、すべてのオプションを処理
      for (const seq of sequences) {
        properties.push(...this.processSequence(seq));
      }

      // choice内の直接のelement
      const elements = choice['xs:element'] || [];
      for (const element of elements) {
        const prop = this.extractProperty(element);
        if (prop) {
          prop.optional = true; // choiceの要素はすべてオプショナル
          properties.push(prop);
        }
      }

      // encryptionGroup以外のgroup
      for (const group of groups) {
        if (group.$?.ref !== 'encryptionGroup') {
          properties.push(...this.processGroup(group));
        }
      }
    }

    return properties;
  }

  /**
   * xs:group要素を処理（新規）
   */
  private processGroup(group: XsdGroup): TypeProperty[] {
    const groupRef = group.$?.ref;
    if (!groupRef) return [];

    // グループ定義を取得
    const groupDef = this.groups.get(groupRef);
    if (!groupDef) {
      console.warn(`    ⚠ グループ '${groupRef}' の定義が見つかりません`);
      return [];
    }

    console.log(`    ✓ グループ '${groupRef}' を展開中...`);

    const properties: TypeProperty[] = [];

    // グループ内のsequence
    if (groupDef['xs:sequence']?.[0]) {
      properties.push(...this.processSequence(groupDef['xs:sequence'][0]));
    }

    // グループ内のchoice
    if (groupDef['xs:choice']?.[0]) {
      properties.push(...this.processChoice(groupDef['xs:choice'][0]));
    }

    return properties;
  }

  /**
   * Element から Property を抽出
   */
  private extractProperty(element: XsdElement): TypeProperty | null {
    const propName = element.$?.name;
    if (!propName) return null;

    const propType = this.mapXsdTypeToTs(element.$?.type || 'any');
    const minOccurs = element.$?.minOccurs;
    const maxOccurs = element.$?.maxOccurs;

    // 配列型の判定
    let type = propType;
    if (maxOccurs === 'unbounded' || (maxOccurs && parseInt(maxOccurs) > 1)) {
      type = `${propType}[]`;
    }

    // オプショナルの判定
    const optional = minOccurs === '0' || !minOccurs;

    return { name: propName, type, optional };
  }

  /**
   * Attribute から Property を抽出
   */
  private extractAttributeProperty(attr: XsdAttribute): TypeProperty | null {
    const attrName = attr.$?.name;
    if (!attrName) return null;

    const attrType = this.mapXsdTypeToTs(attr.$?.type || 'string');
    const required = attr.$?.use === 'required';

    return { name: attrName, type: attrType, optional: !required };
  }

  /**
   * XSD型 → TypeScript型 のマッピング
   */
  private mapXsdTypeToTs(xsdType: string): string {
    // 名前空間プレフィックスを削除
    const cleanType = xsdType.replace(/^xs:/, '');

    // 基本型のマッピング
    const baseTypeMap: Record<string, string> = {
      'string': 'string',
      'token': 'string',
      'int': 'number',
      'integer': 'number',
      'decimal': 'number',
      'float': 'number',
      'double': 'number',
      'long': 'number',
      'short': 'number',
      'byte': 'number',
      'unsignedInt': 'number',
      'unsignedLong': 'number',
      'unsignedShort': 'number',
      'unsignedByte': 'number',
      'boolean': 'boolean',
      'date': 'string',
      'dateTime': 'string',
      'time': 'string',
      'ID': 'string',
      'IDREF': 'string',
      'QName': 'string',
      'NCName': 'string',
      'Name': 'string',
      'NMTOKEN': 'string',
      'NMTOKENS': 'string',
      'language': 'string',
      'anyURI': 'string',
      'base64Binary': 'string',
      'hexBinary': 'string',
      'any': 'any',
    };

    if (baseTypeMap[cleanType]) {
      return baseTypeMap[cleanType];
    }

    // カスタム型が登録されているか確認
    if (this.typeMap.has(cleanType)) {
      return this.typeMap.get(cleanType)!;
    }

    // 未知の型はPascalCaseに変換して返す
    return this.toPascalCase(cleanType);
  }

  /**
   * 文字列を PascalCase に変換
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
      .replace(/^(.)/, (char) => char.toUpperCase());
  }

  /**
   * 生成結果をファイルに書き込み
   */
  private async writeOutput(): Promise<void> {
    const header = `/**
 * MAIML Schema Type Definitions
 * 
 * @generated from XSD schemas in backend/reference/schemas/
 * @do-not-edit This file is automatically generated
 * @version 2.0.0 (Phase 3 improved)
 * @date ${new Date().toISOString()}
 * 
 * Phase 3 Improvements:
 * - ✅ xs:group element processing (globalObjectContentGroup, genericDataContainerGroup)
 * - ✅ xs:choice element proper handling (Property types with value element)
 * - ✅ xs:extension with xs:choice support
 * - ✅ Array type detection (maxOccurs="unbounded")
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

`;

    const content = header + this.generatedTypes.join('');

    // 出力ディレクトリが存在しない場合は作成
    const outputDir = path.dirname(this.config.outputFile);
    await fs.mkdir(outputDir, { recursive: true });

    await fs.writeFile(this.config.outputFile, content, 'utf-8');
  }
}

// =====================================================
// メイン実行部分
// =====================================================

async function main() {
  const generator = new MaimlTypeGenerator({
    schemasDir: path.join(__dirname, '../reference/schemas'),
    outputFile: path.join(__dirname, '../../frontend/src/types/maiml-schema.ts'),
    namespace: 'MaimlSchema',
  });

  try {
    await generator.generate();
    process.exit(0);
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプトとして実行された場合のみ main() を呼び出す
if (require.main === module) {
  main();
}

export { MaimlTypeGenerator };