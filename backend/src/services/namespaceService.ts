/**
 * namespace Service
 *
 * 名前空間・用語管理のビジネスロジック層
 *
 * @remarks
 * Controller → Service → Repository の依存方向を維持する。
 * Controller は本ファイルのみを import し、Repository を直接参照しない。
 *
 * @module namespaceService
 */

import * as namespaceTermRepository from '../repositories/namespaceTermRepository';
import type { NamespaceTermRow } from '../repositories/namespaceTermRepository';
import {
  readGlobalDeclarations,
  writeGlobalDeclarations,
  parseGlobalDeclarationsCsv,
} from './globalNamespaceFileService';
import type { GlobalDeclarationEntry } from '../types/service';
import { generateNamespaceUri, resolveUriConflict } from '../utils/namespaceUriGenerator';
import { SYSTEM_NAMESPACE_PREFIX } from '../constants/systemNamespace';
import { HTTP_STATUS } from '../constants/httpStatus';
import { getMessage } from '../utils/messages';
import { getPgp } from '../database/db';

// ─── 型定義 ──────────────────────────────────────────────────────────────────

/** createNamespace の入力型 */
export interface CreateNamespaceInput {
  organizationId: string;
  prefix: string;
  uri: string;
  userId: string;
  /** JWT の organizationGroupCds[0] をコントローラーから渡す */
  scopeKey?: string;
  description?: string;
}

/** createNamespace の戻り値型 */
export interface CreateNamespaceResult {
  namespaceId: string;
  prefix: string;
  uri: string;
}

/** updateNamespace の入力型 */
export interface UpdateNamespaceInput {
  organizationId: string;
  /** 変更前の prefix（URL パラメータから取得） */
  prefix: string;
  /** 変更後の prefix（省略時は現在の prefix を維持） */
  newPrefix?: string;
  /** 説明文（省略時は null に更新） */
  description?: string;
}

/** updateNamespace の戻り値型 */
export interface UpdateNamespaceResult {
  namespaceId: string;
  prefix: string;
  uri: string;
  scopeKey: string | null;
}

/** createTerm の入力型 */
export interface CreateTermInput {
  organizationId: string;
  prefix: string;
  localName: string;
  displayName?: string;
  description?: string;
  typeHint?: string;
  unitHint?: string;
  /** true のとき SupervisorDirective{localName} の指示用語を同時登録する */
  createDirectiveTerm?: boolean;
  /** 左ツリーで選択中のスコープキー（organization_group_cd または userId）。指定時は正しい namespace_id を特定するために使用 */
  scopeKey?: string;
}

/** updateTerm の入力型 */
export interface UpdateTermInput {
  displayName?: string;
  description?: string;
  typeHint?: string;
  unitHint?: string;
}

/** getNamespaces / getNamespacesByScopeKey の各要素型 */
export interface NamespaceListItem {
  prefix: string;
  uri: string;
  scopeKey?: string;
  scopeName?: string;
}

/** getNamespacesByScopeKey の各要素型（isGlobal 付き） */
export interface NamespaceScopeListItem {
  prefix: string;
  uri: string;
  scopeKey?: string;
  scopeName?: string;
  isGlobal?: boolean;
}

/** getTermsGlobal / getTermsByScopeKey の各要素型 */
export interface TermListItem {
  qname: string;
  prefix: string;
  localName: string;
  displayName: string;
  description: string;
  type: string;
  unitHint: string;
  isActive: boolean;
}

/** getDeclarationsByProject の戻り値型 */
export interface ProjectScopeDeclaration {
  prefix: string;
  uri: string;
}

// ─── 名前空間（Prefix）操作 ───────────────────────────────────────────────────

/**
 * 名前空間（Prefix）を新規登録する
 *
 * @remarks
 * namespace テーブルへの INSERT は行わない。
 * namespace レコードはユーザー作成・チーム作成時に自動登録済みのため、
 * scopeKey で既存の namespace_id を取得して prefix テーブルのみ INSERT する。
 * scopeKey に対応する namespace が存在しない場合は 404 エラーを返す。
 *
 * @param input - 登録する名前空間データ
 * @param lang - 言語コード（'ja' | 'en'、デフォルト: 'ja'）
 * @returns 登録された namespaceId / prefix / uri
 * @throws 404 エラー（scopeKey に対応する namespace が存在しない場合）
 */
export async function createNamespace(
  input: CreateNamespaceInput,
  lang: string = 'ja'
): Promise<CreateNamespaceResult> {
  // scopeKey はコントローラーで JWT の organizationGroupCds[0] から取得済み
  const scopeKey = input.scopeKey ?? input.userId;

  // scopeKey に紐づく既存の namespace_id を取得（namespace テーブルへの INSERT は行わない）
  const namespaceId = await namespaceTermRepository.findNamespaceIdByScopeKey(
    input.organizationId,
    scopeKey
  );

  if (!namespaceId) {
    const err: Error & { statusCode?: number; code?: string } = new Error(
      getMessage(lang, 'namespace.notFound')
    );
    err.statusCode = HTTP_STATUS.NOT_FOUND;
    err.code = 'E6001';
    throw err;
  }

  // prefix テーブルのみ INSERT（namespace テーブルへの INSERT は行わない）
  const prefixData = {
    organizationId: input.organizationId,
    namespaceId,
    prefix: input.prefix,
    description: input.description,
    userId: input.userId,
  };
  await namespaceTermRepository.createPrefixOnly(prefixData);

  return { namespaceId, prefix: input.prefix, uri: input.uri };
}

/**
 * 名前空間（prefix + uri）の一覧を取得する
 *
 * @param organizationId - 組織ID
 * @returns prefix / uri / scopeKey / scopeName の配列
 */
export async function getNamespaces(
  organizationId: string
): Promise<NamespaceListItem[]> {
  return namespaceTermRepository.findNamespacesByOrganization(organizationId);
}

/**
 * scope_key（ユーザーID または organization_group_cd）に紐づく名前空間一覧を取得する
 *
 * @param organizationId - 組織ID
 * @param scopeKey - namespace.scope_key（userId または organization_group_cd）
 * @returns prefix / uri / scopeKey / scopeName の配列
 */
export async function getNamespacesByScopeKey(
  organizationId: string,
  scopeKey: string
): Promise<NamespaceScopeListItem[]> {
  return namespaceTermRepository.findNamespacesByScopeKey(organizationId, scopeKey);
}

/**
 * global_flg=TRUE の名前空間に属する用語一覧を取得する
 *
 * @param organizationId - 組織ID
 * @returns 用語一覧
 */
export async function getTermsGlobal(
  organizationId: string
): Promise<TermListItem[]> {
  return namespaceTermRepository.findAllGlobal(organizationId);
}

/**
 * scopeKey（organization_group_cd または user_id）に紐づく用語一覧を取得する
 *
 * @param organizationId - 組織ID
 * @param scopeKey - namespace.scope_key の値
 * @returns 用語一覧
 */
export async function getTermsByScopeKey(
  organizationId: string,
  scopeKey: string
): Promise<TermListItem[]> {
  return namespaceTermRepository.findAllByScopeKey(organizationId, scopeKey);
}

/**
 * scopeKey（organization_group_cd）とその祖先グループに紐づく用語一覧を取得する
 *
 * 階層ツリーでグループノードを選択した際に、そのグループ＋上位グループの
 * 用語をまとめて表示するために使用する。
 *
 * @param organizationId - 組織ID
 * @param scopeKey - 選択したグループの organization_group_cd
 * @returns 用語一覧
 */
export async function getTermsByScopeKeyWithAncestors(
  organizationId: string,
  scopeKey: string
): Promise<TermListItem[]> {
  return namespaceTermRepository.findAllByScopeKeyWithAncestors(organizationId, scopeKey);
}

/**
 * 複数の scopeKey に紐づく用語一覧を一括取得する
 *
 * company ノード選択時など、ツリーに表示されている全グループの
 * 用語をまとめて表示するために使用する。
 *
 * @param organizationId - 組織ID
 * @param scopeKeys - 選択したグループの organization_group_cd 配列
 * @returns 用語一覧
 */
export async function getTermsByScopeKeys(
  organizationId: string,
  scopeKeys: string[]
): Promise<TermListItem[]> {
  return namespaceTermRepository.findAllByScopeKeys(organizationId, scopeKeys);
}

/**
 * 複数の scopeKey に紐づく名前空間（Prefix）一覧を一括取得する
 *
 * company ノード選択時など、ツリーに表示されている全グループの
 * Prefix をまとめて表示するために使用する。
 *
 * @param organizationId - 組織ID
 * @param scopeKeys - 選択したグループの organization_group_cd 配列
 * @returns prefix / uri / scopeKey / scopeName の配列
 */
export async function getNamespacesByScopeKeys(
  organizationId: string,
  scopeKeys: string[]
): Promise<NamespaceScopeListItem[]> {
  return namespaceTermRepository.findNamespacesByScopeKeys(organizationId, scopeKeys);
}

/**
 * scopeKey（organization_group_cd）とその祖先グループに紐づく名前空間（Prefix）一覧を取得する
 *
 * 階層ツリーでグループノードを選択した際に、そのグループ＋上位グループの
 * Prefix をまとめて表示するために使用する。
 *
 * @param organizationId - 組織ID
 * @param scopeKey - 選択したグループの organization_group_cd
 * @returns prefix / uri / scopeKey / scopeName の配列
 */
export async function getNamespacesByScopeKeyWithAncestors(
  organizationId: string,
  scopeKey: string
): Promise<NamespaceScopeListItem[]> {
  return namespaceTermRepository.findNamespacesByScopeKeyWithAncestors(organizationId, scopeKey);
}

/**
 * 名前空間（prefix / description）を更新する
 *
 * @param input - 更新データ
 * @returns 更新後のレコード、または null（対象なし）
 */
export async function updateNamespace(
  input: UpdateNamespaceInput
): Promise<UpdateNamespaceResult | null> {
  const updateNamespaceParams: Parameters<typeof namespaceTermRepository.updateNamespace>[0] = {
    organizationId: input.organizationId,
    prefix: input.prefix,
    newPrefix: input.newPrefix,
    description: input.description,
  };
  return namespaceTermRepository.updateNamespace(updateNamespaceParams);
}

/**
 * 名前空間（Prefix）を削除する
 *
 * @param organizationId - 組織ID
 * @param prefix - 削除対象の prefix
 * @param lang - 言語コード（'ja' | 'en'、デフォルト: 'ja'）
 * @returns 削除件数（0 = 対象なし）
 * @throws 403 エラー（システム名前空間 Alchemia は削除不可）
 */
export async function deleteNamespace(
  organizationId: string,
  prefix: string,
  lang: string = 'ja'
): Promise<number> {
  // システム名前空間（Alchemia）は削除不可
  if (prefix === SYSTEM_NAMESPACE_PREFIX) {
    const err: any = new Error(getMessage(lang, 'namespace.systemProtected'));
    err.statusCode = HTTP_STATUS.FORBIDDEN;
    err.code = 'E5015';
    throw err;
  }
  return namespaceTermRepository.removeNamespace(organizationId, prefix);
}

// ─── 用語操作 ─────────────────────────────────────────────────────────────────

/**
 * 用語を新規登録する
 *
 * prefix に対応する名前空間が存在しない場合は null を返す。
 * createDirectiveTerm が true の場合、同一 prefix に SupervisorDirective{localName} の
 * 指示用語をトランザクション内で同時登録する。
 *
 * @param input - 登録する用語データ
 * @param lang - 言語コード（'ja' | 'en'、デフォルト: 'ja'）
 * @returns 登録された用語、または null（名前空間が存在しない場合）
 * @throws 403 エラー（システム名前空間 Alchemia への用語追加は不可）
 * @throws 422 エラー（SupervisorDirective + localName が 255 文字超）
 */
export async function createTerm(
  input: CreateTermInput,
  lang: string = 'ja'
): Promise<NamespaceTermRow | null> {
  // システム名前空間（Alchemia）への用語追加は不可
  if (input.prefix === SYSTEM_NAMESPACE_PREFIX) {
    const err: any = new Error(getMessage(lang, 'namespace.systemProtected'));
    err.statusCode = HTTP_STATUS.FORBIDDEN;
    err.code = 'E5015';
    throw err;
  }

  const exists = await namespaceTermRepository.existsNamespace(
    input.organizationId,
    input.prefix
  );
  if (!exists) return null;

  // 指示用語同時登録なし（従来通り）
  if (!input.createDirectiveTerm) {
    return namespaceTermRepository.create({
      organizationId: input.organizationId,
      prefix: input.prefix,
      localName: input.localName,
      displayName: input.displayName,
      description: input.description,
      typeHint: input.typeHint,
      unitHint: input.unitHint,
      hasDirectiveTerm: false,
      scopeKey: input.scopeKey,
    });
  }

  // 指示用語同時登録あり
  // SupervisorDirective（17文字）+ localName が 255 文字を超える場合は 422 エラー
  const SUPERVISOR_DIRECTIVE_PREFIX = 'SupervisorDirective';

  // localName が既に 'SupervisorDirective' で始まる場合は二重プレフィックスを防ぐため
  // 指示用語の同時登録をスキップして通常の1件のみ登録する
  if (input.localName.startsWith(SUPERVISOR_DIRECTIVE_PREFIX)) {
    return namespaceTermRepository.create({
      organizationId: input.organizationId,
      prefix: input.prefix,
      localName: input.localName,
      displayName: input.displayName,
      description: input.description,
      typeHint: input.typeHint,
      unitHint: input.unitHint,
      hasDirectiveTerm: false,
      scopeKey: input.scopeKey,
    });
  }

  const directiveLocalName = `${SUPERVISOR_DIRECTIVE_PREFIX}${input.localName}`;
  if (directiveLocalName.length > 255) {
    const err: any = new Error(getMessage(lang, 'namespace.directiveLocalNameTooLong'));
    err.statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    err.code = 'E6006';
    throw err;
  }

  // トランザクション内で元の用語と指示用語を同時INSERT
  const pgp = getPgp();
  return pgp.tx(async (t) => {
    // 1. 元の用語を hasDirectiveTerm: true で INSERT
    const termRow = await namespaceTermRepository.createInTx(t, {
      organizationId: input.organizationId,
      prefix: input.prefix,
      localName: input.localName,
      displayName: input.displayName,
      description: input.description,
      typeHint: input.typeHint,
      unitHint: input.unitHint,
      hasDirectiveTerm: true,
      scopeKey: input.scopeKey,
    });

    // 2. SupervisorDirective{localName} を同一 prefix で INSERT（hasDirectiveTerm: false）
    await namespaceTermRepository.createInTx(t, {
      organizationId: input.organizationId,
      prefix: input.prefix,
      localName: directiveLocalName,
      displayName: input.displayName,
      description: input.description,
      typeHint: input.typeHint,
      unitHint: input.unitHint,
      hasDirectiveTerm: false,
      scopeKey: input.scopeKey,
    });

    return termRow;
  });
}

/**
 * 用語を更新する
 *
 * @param organizationId - 組織ID
 * @param prefix - 名前空間の接頭辞
 * @param localName - ローカル名
 * @param input - 更新するフィールド
 * @param lang - 言語コード（'ja' | 'en'、デフォルト: 'ja'）
 * @returns 更新後の用語、または null（対象なし）
 * @throws 403 エラー（システム名前空間 Alchemia の用語更新は不可）
 */
export async function updateTerm(
  organizationId: string,
  prefix: string,
  localName: string,
  input: UpdateTermInput,
  lang: string = 'ja'
): Promise<NamespaceTermRow | null> {
  // システム名前空間（Alchemia）の用語更新は不可
  if (prefix === SYSTEM_NAMESPACE_PREFIX) {
    const err: any = new Error(getMessage(lang, 'namespace.systemProtected'));
    err.statusCode = HTTP_STATUS.FORBIDDEN;
    err.code = 'E5015';
    throw err;
  }
  return namespaceTermRepository.update(organizationId, prefix, localName, {
    displayName: input.displayName,
    description: input.description,
    typeHint: input.typeHint,
    unitHint: input.unitHint,
  });
}

/**
 * 用語を削除する
 *
 * @param organizationId - 組織ID
 * @param prefix - 名前空間の接頭辞
 * @param localName - ローカル名
 * @param lang - 言語コード（'ja' | 'en'、デフォルト: 'ja'）
 * @returns 削除件数（0 = 対象なし）
 * @throws 403 エラー（システム名前空間 Alchemia の用語削除は不可）
 */
export async function deleteTerm(
  organizationId: string,
  prefix: string,
  localName: string,
  lang: string = 'ja'
): Promise<number> {
  // システム名前空間（Alchemia）の用語削除は不可
  if (prefix === SYSTEM_NAMESPACE_PREFIX) {
    const err: any = new Error(getMessage(lang, 'namespace.systemProtected'));
    err.statusCode = HTTP_STATUS.FORBIDDEN;
    err.code = 'E5015';
    throw err;
  }
  return namespaceTermRepository.remove(organizationId, prefix, localName);
}

/**
 * 組織の全用語を取得する
 *
 * @param organizationId - 組織ID（指定なしの場合は全件取得）
 * @returns 用語一覧
 */
export async function getTerms(
  organizationId?: string
): Promise<NamespaceTermRow[]> {
  if (organizationId) {
    return namespaceTermRepository.findAllByOrganization(organizationId);
  }
  return namespaceTermRepository.findAll();
}

/**
 * 用語のアクティブ/非アクティブを切り替える
 *
 * @param organizationId - 組織ID
 * @param prefix - 名前空間の接頭辞
 * @param localName - ローカル名
 * @param isActive - 設定するアクティブ状態
 * @param lang - 言語コード（'ja' | 'en'、デフォルト: 'ja'）
 * @returns 更新後の用語、または null（対象なし）
 * @throws 403 エラー（システム名前空間 Alchemia の用語アクティブ切替は不可）
 */
export async function toggleTermActive(
  organizationId: string,
  prefix: string,
  localName: string,
  isActive: boolean,
  lang: string = 'ja'
): Promise<NamespaceTermRow | null> {
  // システム名前空間（Alchemia）の用語アクティブ切替は不可
  if (prefix === SYSTEM_NAMESPACE_PREFIX) {
    const err: any = new Error(getMessage(lang, 'namespace.systemProtected'));
    err.statusCode = HTTP_STATUS.FORBIDDEN;
    err.code = 'E5015';
    throw err;
  }
  return namespaceTermRepository.toggleActive(organizationId, prefix, localName, isActive);
}

// ─── 個人・組織 URI 自動登録 ─────────────────────────────────────────────────

/** registerPersonalNamespaceUri の入力型 */
export interface RegisterNamespaceUriInput {
  organizationId: string;
  /** URI 候補（重複時は末尾に "1" を付与） */
  candidateUri: string;
  /** 登録者ユーザーID（scope_key にも使用） */
  userId: string;
}

/** registerPersonalNamespaceUri の戻り値型 */
export interface RegisterNamespaceUriResult {
  /** 実際に登録された URI */
  uri: string;
  /** 登録された namespace_id */
  namespaceId: string;
}

/**
 * 個人・組織 URI を namespace テーブルに自動登録する
 *
 * @remarks
 * - 既存 URI 一覧を取得して重複チェックを行う
 * - 重複する場合は candidateUri の末尾に "1" を付与した URI を使用する
 * - userService / organizationService から呼び出す（Repository を直接参照させない）
 *
 * @param input - 登録データ
 * @returns 登録された uri と namespace_id
 */
export async function registerPersonalNamespaceUri(
  input: RegisterNamespaceUriInput
): Promise<RegisterNamespaceUriResult> {
  const existingUris = await namespaceTermRepository.findUrisByOrganization(input.organizationId);
  const uniqueUri = existingUris.includes(input.candidateUri)
    ? `${input.candidateUri}1`
    : input.candidateUri;

  const namespaceId = await namespaceTermRepository.createNamespaceUri({
    organizationId: input.organizationId,
    uri: uniqueUri,
    userId: input.userId,
  });

  return { uri: uniqueUri, namespaceId };
}

// ─── 名前空間宣言 ─────────────────────────────────────────────────────────────

/**
 * 組織の名前空間宣言（URI）を1件取得する
 *
 * XML ビューの xmlns 注入用。
 *
 * @param organizationId - 組織ID
 * @returns URI、または null（存在しない場合）
 */
export async function getDeclarations(
  organizationId: string
): Promise<string | null> {
  return namespaceTermRepository.findDeclarationsByOrganization(organizationId);
}

/**
 * グローバル名前空間宣言一覧をファイルサーバから取得する
 *
 * @remarks ファイルが存在しない場合は空配列を返す。
 * @returns グローバル名前空間宣言エントリ配列
 */
export async function getGlobalDeclarationEntries(): Promise<GlobalDeclarationEntry[]> {
  return readGlobalDeclarations();
}

/**
 * グローバル名前空間宣言 CSV をパースしてファイルサーバへ書き込む
 *
 * @param csvContent - CSV 文字列（ヘッダー行 "prefix,uri" 付き）
 * @returns パースされた宣言エントリ数
 * @throws パース結果が0件の場合はエラー
 */
export async function importGlobalDeclarationsCsv(
  csvContent: string
): Promise<{ count: number }> {
  const declarations = parseGlobalDeclarationsCsv(csvContent);
  if (declarations.length === 0) {
    throw new Error('CSVファイルに有効なデータが含まれていません');
  }
  await writeGlobalDeclarations(declarations);
  return { count: declarations.length };
}

/**
 * グローバル名前空間宣言一覧をファイルサーバから取得し CSV 文字列として返す
 *
 * @returns CSV 文字列（ヘッダー行付き）
 */
export async function exportGlobalDeclarationsCsv(): Promise<string> {
  const declarations = await readGlobalDeclarations();
  const lines = ['prefix,uri'];
  for (const { prefix, uri } of declarations) {
    lines.push(`${prefix},${uri}`);
  }
  return lines.join('\n');
}

/**
 * プロジェクトスコープで絞り込んだ名前空間宣言一覧を取得する
 *
 * @remarks
 * - project テーブルから organization_group_cd を取得
 * - organization_group_cd が指定されている場合は scope_key が一致する名前空間も含める
 * - organization_group_cd が NULL の場合は全件返す
 * - グローバル名前空間（ファイルサーバ）の宣言をマージして返す
 *
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @returns prefix / uri の配列、または null（プロジェクトが見つからない場合）
 */
/**
 * URI自動生成候補を返す
 *
 * URI生成ルール:
 *   組織ベース  : https://{organization_cd}.Alchemia.co.jp/{groupCd1}/{groupCd2}/...
 *   個人ベース  : https://{organization_cd}.Alchemia.co.jp/{loginName}
 *   重複時      : {uri}1, {uri}2, ... と連番付与
 *
 * @param organizationId - 組織ID
 * @param userId - ログインユーザーID（メールアドレスの @ 前部分をパスに使用）
 * @param scopeKey - 選択中ノードの scopeKey（organization_group_cd または userId）
 * @returns 生成した URI（重複解消済み）
 */
export async function getSuggestedUri(
  organizationId: string,
  userId: string,
  scopeKey?: string
): Promise<string> {
  // 1. 組織CD取得
  const organizationCd = await namespaceTermRepository.findOrganizationCd(organizationId);
  if (!organizationCd) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  // 2. ベースURIの構築
  let candidateUri: string;

  if (scopeKey && scopeKey !== userId) {
    // チーム/グループスコープ: 先祖グループCDのパスを生成
    // ancestors[0] をドメイン部、ancestors.slice(1) をパス部に使用
    const ancestors = await namespaceTermRepository.findOrgGroupAncestors(organizationId, scopeKey);
    const domainPart = ancestors[0] ?? organizationCd;
    const pathParts = ancestors.slice(1);
    candidateUri = pathParts.length > 0
      ? `https://${domainPart}.Alchemia.co.jp/${pathParts.join('/')}`
      : `https://${domainPart}.Alchemia.co.jp`;
  } else {
    // 個人スコープ: organization_cd をドメイン部に使用
    // userService.ts の registerUserNamespace() と同一ロジックで URI を生成する
    // （ユーザー作成時に DB 登録される URI と一致させるため）
    const mailAddress = await namespaceTermRepository.findUserMailAddress(organizationId, userId);
    const loginName = mailAddress ? mailAddress.split('@')[0] : userId;
    candidateUri = `https://${organizationCd}.Alchemia.co.jp/${loginName}`;
  }

  // 3. 既存URI一覧を取得して重複解消
  const existingUris = await namespaceTermRepository.findUrisByOrganization(organizationId);
  const resolvedUri = resolveUriConflict(candidateUri, existingUris);

  return resolvedUri;
}

/**
 * Prefix の is_active を切り替える
 *
 * @param organizationId - 組織ID
 * @param prefix - 対象の prefix 文字列
 * @param isActive - 設定するアクティブ状態
 * @returns void
 * @throws E6001 対象 prefix が存在しない場合
 */
export async function toggleNamespaceActive(
  organizationId: string,
  prefix: string,
  isActive: boolean
): Promise<void> {
  const updated = await namespaceTermRepository.toggleActivePrefix(organizationId, prefix, isActive);
  if (updated === 0) {
    const err: Error & { statusCode?: number; code?: string } = new Error(
      `Prefix "${prefix}" not found`
    );
    err.statusCode = 404;
    err.code = 'E6001';
    throw err;
  }
}

export async function getDeclarationsByProject(
  organizationId: string,
  projectId: string
): Promise<ProjectScopeDeclaration[] | null> {
  // project テーブルから organization_group_cd を取得
  const projectRow = await namespaceTermRepository.findProjectGroupCd(organizationId, projectId);

  if (!projectRow) return null;

  const orgGroupCd: string | null = projectRow.organization_group_cd ?? null;

  // DB（組織固有）とファイルサーバ（グローバル）を並列取得してマージ
  const [orgDeclarations, globalDeclarations] = await Promise.all([
    namespaceTermRepository.findDeclarationsByProjectScope(organizationId, orgGroupCd),
    readGlobalDeclarations(),
  ]);

  // グローバル宣言を先に並べ、組織固有宣言を後に追加（重複 prefix は後勝ち）
  return [...globalDeclarations, ...orgDeclarations];
}

/**
 * 選択した Prefix を指定スコープへ共有（コピー）する
 *
 * @param organizationId  - 組織ID
 * @param targetScopeKey  - コピー先スコープキー（organization_group_cd または userId）
 * @param userId          - 操作ユーザーID
 * @param prefixes        - コピー対象の prefix 名の配列
 * @returns コピーされた prefix 名の配列（重複スキップ分は含まれない）
 * @throws コピー先スコープに対応する namespace が存在しない場合はエラー
 */
export async function sharePrefixesToScope(
  organizationId: string,
  targetScopeKey: string,
  userId: string,
  prefixes: string[]
): Promise<string[]> {
  if (prefixes.length === 0) return [];

  // コピー先スコープの namespace が存在するか確認
  const targetNamespaceId = await namespaceTermRepository.findNamespaceIdByScopeKey(
    organizationId,
    targetScopeKey
  );
  if (!targetNamespaceId) {
    const err: Error & { statusCode?: number; code?: string } = new Error(
      `コピー先スコープ "${targetScopeKey}" の namespace が見つかりません`
    );
    err.statusCode = HTTP_STATUS.NOT_FOUND;
    err.code = 'E6001';
    throw err;
  }

  return namespaceTermRepository.copyPrefixesToScope(
    organizationId,
    targetScopeKey,
    userId,
    prefixes
  );
}
