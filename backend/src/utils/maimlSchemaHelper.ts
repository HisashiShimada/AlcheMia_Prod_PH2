/**
 * MAIML XSD スキーマ解析ユーティリティ
 *
 * @remarks
 * UPA（Unique Particle Attribution）制約チェックのために、
 * MAIML XSD スキーマを解析して「暗号化グループ（encryptionGroup）を
 * xs:choice の選択肢として持つ complexType」の一覧を構築する。
 *
 * MAIML スキーマ設計方針:
 *   各 complexType は xs:choice に以下の2択を持つ:
 *   1. xs:sequence — 通常のコンテンツ
 *   2. xs:group ref="encryptionGroup" — 暗号化済みの EncryptedData
 *
 * encryptionGroup を持つ型 → 暗号化後もスキーマ準拠（UPA違反なし）
 * encryptionGroup を持たない型 → 暗号化すると EncryptedData が不正（UPA違反リスク）
 *
 * @module maimlSchemaHelper
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parseStringPromise } from 'xml2js';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/** complexType 名 → 暗号化グループを xs:choice で持つか */
type ChoiceEncryptionMap = Map<string, boolean>;

/** 要素名 → 型名（element name to type name） */
type ElementTypeMap = Map<string, string>;

/** XSD解析結果キャッシュ */
interface SchemaCache {
  /** encryptionGroup を choice に持つ complexType 名の集合 */
  encryptionSupportedTypes: Set<string>;
  /** 要素名 → 対応する complexType 名 */
  elementTypeMap: ElementTypeMap;
  /** 解析済みスキーマファイル数 */
  parsedFileCount: number;
}

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const SCHEMAS_DIR = path.resolve(__dirname, '../schemas');
const ENCRYPTION_GROUP_REF = 'encryptionGroup';

// ---------------------------------------------------------------------------
// キャッシュ（遅延初期化）
// ---------------------------------------------------------------------------

let schemaCache: SchemaCache | null = null;
let schemaCachePromise: Promise<SchemaCache> | null = null;

// ---------------------------------------------------------------------------
// XSD 解析ロジック
// ---------------------------------------------------------------------------

/**
 * 単一の XSD ファイルを解析して結果をマップに蓄積する
 */
async function parseXsdFile(
  filePath: string,
  choiceEncryptionMap: ChoiceEncryptionMap,
  elementTypeMap: ElementTypeMap,
): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = await parseStringPromise(content, {
      explicitArray: true,
      explicitCharkey: false,
      mergeAttrs: false,
    });

    const schema = parsed['xs:schema'] ?? parsed['schema'];
    if (!schema) return;

    // complexType の解析
    const complexTypes: any[] = schema['xs:complexType'] ?? [];
    for (const ct of complexTypes) {
      const typeName: string | undefined = ct.$?.name;
      if (!typeName) continue;

      const hasEncryptionInChoice = detectEncryptionGroupInChoice(ct);
      choiceEncryptionMap.set(typeName, hasEncryptionInChoice);
    }

    // complexContent / extension 内の complexType も解析
    // （xs:extension base="..." で基底型を持つケース）
    for (const ct of complexTypes) {
      const typeName: string | undefined = ct.$?.name;
      if (!typeName) continue;

      const complexContents: any[] = ct['xs:complexContent'] ?? [];
      for (const cc of complexContents) {
        const extensions: any[] = cc['xs:extension'] ?? [];
        for (const ext of extensions) {
          // extension の中の choice に encryptionGroup があるか確認
          if (hasEncryptionGroupInChoiceArray(ext['xs:choice'] ?? [])) {
            choiceEncryptionMap.set(typeName, true);
          }
        }
      }
    }

    // トップレベル element の type マッピング
    const elements: any[] = schema['xs:element'] ?? [];
    for (const el of elements) {
      const elemName: string | undefined = el.$?.name;
      const typeName: string | undefined = el.$?.type;
      if (elemName && typeName) {
        // 名前空間プレフィックスを除去（例: "tns:stringType" → "stringType"）
        const localTypeName = typeName.includes(':') ? typeName.split(':')[1] : typeName;
        elementTypeMap.set(elemName, localTypeName);
      }
    }
  } catch {
    // 解析エラーのある XSD は無視（処理継続）
  }
}

/**
 * complexType オブジェクト全体から encryptionGroup を xs:choice で持つかを判定
 */
function detectEncryptionGroupInChoice(ct: any): boolean {
  // 直接の xs:choice
  if (hasEncryptionGroupInChoiceArray(ct['xs:choice'] ?? [])) {
    return true;
  }

  // xs:complexContent > xs:extension > xs:choice
  const complexContents: any[] = ct['xs:complexContent'] ?? [];
  for (const cc of complexContents) {
    const extensions: any[] = cc['xs:extension'] ?? [];
    for (const ext of extensions) {
      if (hasEncryptionGroupInChoiceArray(ext['xs:choice'] ?? [])) {
        return true;
      }
    }
  }

  return false;
}

/**
 * xs:choice 配列の中に encryptionGroup への ref があるかを確認
 */
function hasEncryptionGroupInChoiceArray(choices: any[]): boolean {
  for (const choice of choices) {
    const groups: any[] = choice['xs:group'] ?? [];
    for (const group of groups) {
      const ref: string | undefined = group.$?.ref;
      if (ref) {
        // "ns:encryptionGroup" または "encryptionGroup" に対応
        const localRef = ref.includes(':') ? ref.split(':')[1] : ref;
        if (localRef === ENCRYPTION_GROUP_REF) {
          return true;
        }
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// キャッシュ構築
// ---------------------------------------------------------------------------

/**
 * 全 XSD ファイルを解析してキャッシュを構築する（遅延初期化・シングルトン）
 */
async function buildSchemaCache(): Promise<SchemaCache> {
  const choiceEncryptionMap: ChoiceEncryptionMap = new Map();
  const elementTypeMap: ElementTypeMap = new Map();

  let files: string[];
  try {
    const entries = await fs.readdir(SCHEMAS_DIR);
    files = entries
      .filter((f) => f.endsWith('.xsd'))
      .map((f) => path.join(SCHEMAS_DIR, f));
  } catch {
    // スキーマディレクトリが存在しない場合は空のキャッシュを返す
    return {
      encryptionSupportedTypes: new Set(),
      elementTypeMap: new Map(),
      parsedFileCount: 0,
    };
  }

  await Promise.all(
    files.map((filePath) => parseXsdFile(filePath, choiceEncryptionMap, elementTypeMap)),
  );

  // encryptionGroup を choice に持つ型名の集合を構築
  const encryptionSupportedTypes = new Set<string>();
  for (const [typeName, hasEncryption] of choiceEncryptionMap) {
    if (hasEncryption) {
      encryptionSupportedTypes.add(typeName);
    }
  }

  return {
    encryptionSupportedTypes,
    elementTypeMap,
    parsedFileCount: files.length,
  };
}

/**
 * スキーマキャッシュを取得する（初回のみ解析・以降はキャッシュを返す）
 */
async function getSchemaCache(): Promise<SchemaCache> {
  if (schemaCache !== null) {
    return schemaCache;
  }
  if (schemaCachePromise !== null) {
    return schemaCachePromise;
  }
  schemaCachePromise = buildSchemaCache().then((cache) => {
    schemaCache = cache;
    schemaCachePromise = null;
    return cache;
  });
  return schemaCachePromise;
}

// ---------------------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------------------

/**
 * 指定した targetPath の要素を暗号化したとき UPA 制約に違反するかを判定する。
 *
 * @remarks
 * MAIML スキーマでは、暗号化をサポートする要素の型は必ず `xs:choice` の選択肢として
 * `xs:group ref="encryptionGroup"` を持つように設計されている。
 * この設計に従っていない型の要素を暗号化すると、`<xenc:EncryptedData>` がスキーマ上
 * 不正となり UPA 制約違反となる。
 *
 * @param targetPath フロントエンドから送られる対象要素パス
 *   例: "data/property[name='temp']/value" や "stringType" など
 * @returns UPA 制約違反の場合 true、問題なし（または不明）の場合 false
 */
export async function isUpaViolation(targetPath: string): Promise<{
  isViolation: boolean;
  detectedTypeName: string | null;
  message: string | null;
}> {
  const cache = await getSchemaCache();

  // スキーマが読み込めていない場合はフォールスネガティブ（安全側）
  if (cache.parsedFileCount === 0) {
    return { isViolation: false, detectedTypeName: null, message: null };
  }

  // targetPath の末尾要素名（例: "data/property/value" → "value"）
  const leafName = extractLeafElementName(targetPath);
  if (!leafName) {
    return { isViolation: false, detectedTypeName: null, message: null };
  }

  // 要素名から型名を解決
  const typeName = cache.elementTypeMap.get(leafName) ?? null;

  if (!typeName) {
    // 型情報が不明 → スキーマ定義外の要素 → 安全側でfalse返却
    return { isViolation: false, detectedTypeName: null, message: null };
  }

  const isSupported = cache.encryptionSupportedTypes.has(typeName);

  if (!isSupported) {
    return {
      isViolation: true,
      detectedTypeName: typeName,
      message:
        `要素 <${leafName}>（型: ${typeName}）は暗号化グループ（encryptionGroup）を ` +
        `xs:choice に持たないため、暗号化すると XML スキーマの UPA 制約に違反します。` +
        ` 内容（content）スコープでの暗号化、または対象要素の変更を推奨します。`,
    };
  }

  return { isViolation: false, detectedTypeName: typeName, message: null };
}

/**
 * XSD 解析結果に基づいて「encryptionGroup を xs:choice に持つ complexType」に対応する
 * **要素名の集合**を返す。
 *
 * @remarks
 * `maimlEncryptionXmlHelper.ts` や `parseMaimlToEncryptionTree` など、
 * 要素ごとに `isEncryptable` を判定する箇所から利用することで、
 * ハードコードされたタグ名リストとの矛盾を防ぐ。
 *
 * 返却されるのは `elementTypeMap` に登録されている要素名のうち、
 * 対応型が `encryptionSupportedTypes` に含まれるものの集合。
 * トップレベル要素として XSD に宣言されていない `property` / `content` については
 * 別途 KNOWN_PROPERTY_CONTENT_TAGS で補完する。
 *
 * @returns 暗号化可能な要素名の Set（例: `{'data', 'material', 'property', ...}`）
 */
export async function getEncryptableElementNames(): Promise<Set<string>> {
  const cache = await getSchemaCache();

  const encryptable = new Set<string>();

  for (const [elemName, typeName] of cache.elementTypeMap) {
    if (cache.encryptionSupportedTypes.has(typeName)) {
      encryptable.add(elemName);
    }
  }

  // property / content は XSD 上 xs:group 参照で宣言されるため elementTypeMap に
  // 登録されないケースがある。MAIMLガイドラインに従い明示的に追加する。
  // 根拠: docs/design/maiml/encrypted_data_summary.md セクション11-B
  KNOWN_GENERIC_DATA_CONTAINER_TAGS.forEach((tag) => encryptable.add(tag));

  return encryptable;
}

/**
 * MAIMLガイドラインで「汎用データコンテナ（genericDataContainerGroup）」として
 * 秘匿化を許可されているタグ名（XSD上の `propertyBaseType` / `contentBaseType` 派生型）。
 * これらは xs:group 参照で宣言されるため elementTypeMap から自動抽出できないため明示定義する。
 *
 * 根拠: maiml-property.xsd の encryptionGroup 参照, docs/design/maiml/encrypted_data_summary.md
 */
const KNOWN_GENERIC_DATA_CONTAINER_TAGS = new Set(['property', 'content']);

/**
 * キャッシュを明示的にクリアする（テスト用）
 */
export function clearSchemaCache(): void {
  schemaCache = null;
  schemaCachePromise = null;
}

/**
 * 現在のキャッシュ統計を返す（デバッグ・ログ用）
 */
export async function getSchemaCacheStats(): Promise<{
  parsedFileCount: number;
  encryptionSupportedTypeCount: number;
  elementMappingCount: number;
}> {
  const cache = await getSchemaCache();
  return {
    parsedFileCount: cache.parsedFileCount,
    encryptionSupportedTypeCount: cache.encryptionSupportedTypes.size,
    elementMappingCount: cache.elementTypeMap.size,
  };
}

// ---------------------------------------------------------------------------
// 内部ヘルパー
// ---------------------------------------------------------------------------

/**
 * targetPath から末尾の要素名を抽出する
 *
 * @example
 * "data/property/value"  → "value"
 * "#id=someId"           → null（ID 形式は要素名が特定できない）
 * "stringType"           → "stringType"
 * "property[name='x']"  → "property"
 */
function extractLeafElementName(targetPath: string): string | null {
  if (!targetPath || targetPath.startsWith('#id=')) {
    return null;
  }

  const parts = targetPath.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last) return null;

  // 属性フィルタを除去: "property[name='x']" → "property"
  const tagName = last.replace(/\[.*\]$/, '').trim();
  return tagName || null;
}
