/**
 * 名前空間管理 API Service
 *
 * namespace / namespace_term テーブルへのアクセスを提供するフロントエンドサービス。
 *
 * @module namespaceApiService
 */

import { createApiClient } from '@/utils/authUtils';
import type { NamespaceEntry } from '@/utils/namespaceInjector';
import type { ServiceApiResponse } from '@/types/api';
import type {
  OrganizationGroupRow,
  CreateOrganizationGroupRequest,
  UpdateOrganizationGroupRequest,
  GlobalNamespaceEntry,
} from '@/types/namespace';

// ============================================================================
// 型定義
// ============================================================================

/**
 * GET /api/v1/namespaces?scopeKey={userId} の各名前空間行
 */
export interface PersonalNamespaceRow {
  namespace_id: string;
  uri: string;
  scope_key: string;
  global_flg: boolean;
  user_name: string | null;
}

/**
 * GET /api/v1/namespaces?scopeKey={userId} のレスポンスボディ型
 */
export interface PersonalNamespaceListResponse {
  namespaces: PersonalNamespaceRow[];
}

/**
 * GET /api/v1/systemManagement/user の各ユーザー行
 */
export interface OrgUserRow {
  userId: string;
  userName: string;
}

/**
 * GET /api/v1/systemManagement/user のレスポンスボディ型
 */
export interface OrgUserListResponse {
  success: boolean;
  data: OrgUserRow[];
}

/**
 * GET /api/v1/namespaces/declarations のレスポンスボディ型
 */
export interface NamespaceDeclarationsResponse {
  namespaces: NamespaceEntry[];
}

/**
 * GET /api/v1/namespaces のレスポンスボディ型
 */
export interface NamespaceListResponse {
  namespaces: NamespaceEntry[];
}

/**
 * POST /api/v1/namespaces のリクエストボディ型
 */
export interface CreateNamespaceRequest {
  prefix: string;
  uri: string;
  displayName?: string;
  description?: string;
  departmentCd?: string;
  scopeKey?: string;
}

/**
 * POST /api/v1/namespaces のレスポンスボディ型
 */
export interface CreateNamespaceResponse {
  namespaceId: string;
  prefix: string;
  uri: string;
}

/**
 * PATCH /api/v1/namespaces/:prefix のリクエストボディ型
 */
export interface UpdateNamespaceRequest {
  uri?: string;
  newPrefix?: string;
  description?: string;
  /** Prefix を別スコープ（organization_group_cd など）に移動する際に指定 */
  scopeKey?: string;
}

/**
 * PATCH /api/v1/namespaces/:prefix のレスポンスボディ型
 */
export interface UpdateNamespaceResponse {
  namespaceId: string;
  prefix: string;
  uri: string;
  scopeKey: string | null;
}

/**
 * GET /api/v1/namespaces/terms の用語行型
 */
export interface NamespaceTermRow {
  /** 名前空間ID（rowKey の一部として使用） */
  namespaceId: string;
  id?: string;
  qname: string;
  prefix: string;
  localName: string;
  displayName: string;
  description: string;
  type: string;
  unitHint: string;
  isActive: boolean;
  /** 指示用語が登録されている場合 true */
  hasDirectiveTerm?: boolean;
  /**
   * prefix が属する名前空間の scope_key（organization_group_cd またはユーザーID）
   * ツリーの用語数バッジ計算（NamespaceMain.tsx toAntTree）に使用する
   * グローバル名前空間の場合は null
   * findAllByOrganization.sql の JOIN により n.scope_key が付与される
   */
  scopeKey?: string | null;
}

/**
 * POST/PUT /api/v1/namespaces/terms のリクエストボディ型
 */
export interface TermUpsertRequest {
  prefix: string;
  localName: string;
  /** 日本語表示名（バックエンドが受け付けるフィールド名） */
  displayNameJa?: string;
  displayName?: string;
  description?: string;
  typeHint?: string;
  unitHint?: string;
  /** true のとき SupervisorDirective{localName} の指示用語を同時登録する */
  createDirectiveTerm?: boolean;
  /** 左ツリーで選択中のスコープキー（organization_group_cd または userId）。指定時は正しい namespace_id を特定するために使用 */
  scopeKey?: string;
}

// ============================================================================
// API 関数 — Namespace (Prefix)
// ============================================================================

/**
 * プロジェクトに紐づく名前空間宣言一覧を取得する（XMLビュー・保存時の xmlns 注入用）
 *
 * @remarks
 * プロジェクトの所属グループ + その上位グループすべての Prefix を取得し、
 * グローバル宣言とマージして返す。
 *
 * - organizationGroupCd（プロジェクトの所属グループ）が渡された場合はそのグループを起点に
 *   WITH RECURSIVE で祖先グループを辿る。
 * - 渡されない場合は localStorage の userInfo.organizationGroupCds[0] をフォールバックとして使用。
 * - 同一 prefix が対象グループと祖先グループの両方に存在する場合、
 *   バックエンドの SQL（ORDER BY depth ASC）により対象グループのものが先頭に来るため
 *   アプリ側の先勝ちフィルタ（seen Set）で対象グループが優先される。
 * - 各 prefix のURIは entry.scopeKey（属するグループCD）ごとに fetchSuggestedUri を呼んで
 *   正規URIを取得し割り当てる。同一 scopeKey への API コールは Map でキャッシュして重複排除する。
 *
 * 変換ルール:
 * - prefix が 'maiml' かつ uri が 'http://www.maiml.org/schemas' の場合は prefix を '' に変換
 *   → xmlns="http://www.maiml.org/schemas" としてデフォルト名前空間として注入される
 *
 * @param organizationGroupCd - プロジェクトが属するグループの organization_group_cd（任意）
 * @returns 名前空間エントリ一覧（{prefix, uri}[]）
 */
export const getOrganizationNamespaces = async (
  organizationGroupCd?: string
): Promise<NamespaceEntry[]> => {
  try {
    console.log('🔖 [namespaceApiService] 名前空間宣言一覧取得（グローバル宣言 + グループスコープ含む）', { organizationGroupCd });

    // グローバル宣言を取得（組織ベースURIは XMLへの注入対象外のため declarations エンドポイントは使用しない）
    const globalDeclarations = await getGlobalDeclarations();

    // グローバル宣言に変換ルールを適用
    const convertedGlobals: NamespaceEntry[] = globalDeclarations
      .map((entry) => {
        // maiml prefix + 正規 URI → デフォルト名前空間（prefix 空文字）に変換
        if (entry.prefix === 'maiml' && entry.uri === 'http://www.maiml.org/schemas') {
          return { prefix: '', uri: entry.uri };
        }
        return { prefix: entry.prefix, uri: entry.uri };
      });

    // 注意: declarations エンドポイントが返す orgUri は組織のベースURI（prefix なし）。
    // これを prefix='' のデフォルト名前空間として注入すると xmlns="" が2重になりXMLパースエラーになるため注入しない。
    // XML への注入は prefix テーブルに登録された prefix+uri ペア（グローバル宣言 + 個人スコープ + グループスコープ）とする。

    // --- localStorage の userInfo からユーザーID・フォールバック用グループCDを読み取る ---
    const userInfo = (() => {
      try {
        if (typeof window === 'undefined') return null;
        const raw = localStorage.getItem('userInfo');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

    // --- 個人スコープ（userId）の Prefix を取得 ---
    // 個人スコープ固有の用語が存在しうるため、グループスコープと同一 prefix がある場合は個人を優先する
    const personalNamespaces: NamespaceEntry[] = [];

    if (userInfo?.id) {
      const personal = await getNamespaceList({ scopeKey: userInfo.id as string });
      if (personal.length > 0) {
        // DB に登録済みの entry.uri をそのまま使用する
        // 非アクティブ Prefix は XML 注入対象外とするためフィルタする
        const activePersonal = personal
          .filter((entry) => (entry as any).isActive !== false);
        personalNamespaces.push(...activePersonal);
        console.log(
          `🔖 [namespaceApiService] 個人スコープ Prefix 取得: ${activePersonal.length} 件 (userId=${userInfo.id})`
        );
      }
    }

    // --- グループスコープの Prefix を取得（対象グループ + 祖先グループを含む） ---
    // organizationGroupCd が渡された場合はそれを優先、なければ userInfo のフォールバックを使用
    const fallbackGroupCds: string[] = Array.isArray(userInfo?.organizationGroupCds)
      ? (userInfo.organizationGroupCds as string[])
      : [];
    const targetGroupCd: string | undefined = organizationGroupCd ?? fallbackGroupCds[0];

    const allScopedNamespaces: NamespaceEntry[] = [];

    if (targetGroupCd) {
      // withAncestors=true で対象グループ + 全祖先グループの Prefix を取得
      // SQL（findNamespacesByScopeKeyWithAncestors.sql）は ORDER BY p.prefix ASC, depth ASC で
      // 対象グループ（depth=0）が同一 prefix の先頭に来るよう保証されている
      const group = await getNamespaceList({ scopeKey: targetGroupCd, withAncestors: true });
      if (group.length > 0) {
        // DB に登録済みの entry.uri をそのまま使用する
        // 非アクティブ Prefix は XML 注入対象外とするためフィルタする
        const activeGroup = group.filter((entry) => (entry as any).isActive !== false);
        allScopedNamespaces.push(...activeGroup);
        console.log(
          `🔖 [namespaceApiService] グループスコープ Prefix 取得: ${activeGroup.length} 件 (targetGroupCd=${targetGroupCd}, withAncestors=true)`
        );
      }
    }

    // --- 結合: グローバル（1位） > 個人スコープ（2位） > グループスコープ（3位）---
    // 先勝ちフィルタにより前に置いたスコープが優先される
    // 個人スコープとグループスコープに同一 prefix がある場合は個人を優先する
    //   理由: 個人スコープ固有の用語（個人スコープにのみ登録された用語）が存在しうるため
    // グループスコープ内では SQL の depth ASC ソートにより対象グループ（depth=0）が祖先グループより先に来る
    const allEntries: NamespaceEntry[] = [...convertedGlobals, ...personalNamespaces, ...allScopedNamespaces];

    // --- 防御処理 ---
    // 1. URI バリデーション: 絶対 URI でないエントリをスキップ
    //    prefix 付きの場合は http://, https://, urn: 等で始まる必要がある
    //    prefix なし（デフォルト名前空間）も同様
    // 2. 同一 prefix の重複除去（先勝ち）:
    //    グローバル > 個人スコープ > グループスコープ の順で採用される
    //    グループスコープ内では対象グループ（depth=0）が祖先グループより先に採用される
    const seen = new Set<string>();
    const filtered: NamespaceEntry[] = [];
    for (const entry of allEntries) {
      // 絶対 URI かどうかチェック（RFC 3986 準拠の簡易判定）
      const isAbsoluteUri = /^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(entry.uri);
      if (!isAbsoluteUri) {
        console.warn(
          `⚠️ [namespaceApiService] 絶対URIでない名前空間エントリをスキップ: prefix="${entry.prefix}" uri="${entry.uri}"`
        );
        continue;
      }
      // 同一 prefix の重複除去（先勝ち）
      const prefixKey = entry.prefix === '' ? '__default__' : entry.prefix;
      if (seen.has(prefixKey)) {
        console.warn(
          `⚠️ [namespaceApiService] prefix の重複エントリをスキップ: prefix="${entry.prefix}" uri="${entry.uri}"`
        );
        continue;
      }
      seen.add(prefixKey);
      filtered.push(entry);
    }

    return filtered;
  } catch (error) {
    // 名前空間取得失敗はエディタの操作を止めない（空配列を返して継続）
    console.warn('⚠️ [namespaceApiService] 名前空間宣言の取得に失敗しました:', error);
    return [];
  }
};

/**
 * 組織に紐づく名前空間（Prefix）一覧を取得する
 *
 * @remarks
 * バックエンドの GET /api/v1/namespaces を呼び出す。
 * 名前空間管理画面のPrefix一覧表示に使用する。
 *
 * @param options.scopeKeys     - フィルタリングする scopeKey 配列（省略時は全件取得）
 * @param options.withAncestors - true の場合、scopeKey とその祖先グループのデータも取得
 *                                （組織グループノード選択時に使用）
 * @returns 名前空間エントリ一覧（{prefix, uri, scopeKey?}[]）
 */
export const getNamespaceList = async (options?: {
  scopeKey?: string;
  scopeKeys?: string[];
  withAncestors?: boolean;
}): Promise<NamespaceEntry[]> => {
  const client = createApiClient();

  try {
    console.log('🔖 [namespaceApiService] Prefix一覧取得', options);

    const params: Record<string, string> = {};
    // scopeKey（単数）が指定されている場合はそちらを優先
    if (options?.scopeKey) {
      params.scopeKey = options.scopeKey;
    } else if (options?.scopeKeys && options.scopeKeys.length > 0) {
      params.scopeKeys = options.scopeKeys.join(',');
    }
    if (options?.withAncestors) {
      params.withAncestors = 'true';
    }

    const response = await client.get<NamespaceListResponse>('/namespaces', { params });

    return response.data?.namespaces ?? [];
  } catch (error) {
    console.warn('⚠️ [namespaceApiService] Prefix一覧の取得に失敗しました:', error);
    return [];
  }
};

/**
 * ログインユーザーの個人名前空間一覧を取得する（Personal ノード表示用）
 *
 * @remarks
 * バックエンドの GET /api/v1/namespaces?scopeKey={userId} を呼び出す。
 * レスポンスに user_name が含まれる。
 *
 * @param userId - ログインユーザーのユーザーID（namespace.scope_key と一致する値）
 * @returns 個人名前空間一覧（{namespace_id, uri, scope_key, user_name}[]）
 */
export const getPersonalNamespaces = async (
  userId: string
): Promise<PersonalNamespaceRow[]> => {
  const client = createApiClient();

  try {
    console.log('👤 [namespaceApiService] 個人名前空間一覧取得:', userId);

    const response = await client.get<PersonalNamespaceListResponse>(
      '/namespaces',
      { params: { scopeKey: userId } }
    );

    return response.data?.namespaces ?? [];
  } catch (error) {
    console.warn('⚠️ [namespaceApiService] 個人名前空間一覧の取得に失敗しました:', error);
    return [];
  }
};

/**
 * 名前空間（Prefix）を新規登録する
 *
 * @remarks
 * バックエンドの POST /api/v1/namespaces を呼び出す。
 *
 * @param data - 登録する名前空間データ
 * @returns 登録結果（namespaceId, prefix, uri）
 */
export const createNamespace = async (
  data: CreateNamespaceRequest
): Promise<CreateNamespaceResponse> => {
  const client = createApiClient();

  console.log('🔖 [namespaceApiService] Prefix新規登録:', data.prefix);

  const response = await client.post<CreateNamespaceResponse>('/namespaces', data);

  return response.data;
};

/**
 * 名前空間（Prefix の URI）を更新する
 *
 * @remarks
 * バックエンドの PATCH /api/v1/namespaces/:prefix を呼び出す。
 *
 * @param prefix - 更新対象の Prefix
 * @param data - 更新データ
 * @returns 更新後の名前空間レコード
 */
export const updateNamespace = async (
  prefix: string,
  data: UpdateNamespaceRequest
): Promise<UpdateNamespaceResponse> => {
  const client = createApiClient();

  console.log('🔖 [namespaceApiService] Prefix URI更新:', prefix);

  const response = await client.patch<UpdateNamespaceResponse>(
    `/namespaces/${encodeURIComponent(prefix)}`,
    data
  );

  return response.data;
};

/**
 * 名前空間（Prefix）を削除する
 *
 * @remarks
 * バックエンドの DELETE /api/v1/namespaces/:prefix を呼び出す。
 *
 * @param prefix - 削除するPrefix
 */
export const deleteNamespace = async (prefix: string): Promise<void> => {
  const client = createApiClient();

  console.log('🔖 [namespaceApiService] Prefix削除:', prefix);

  await client.delete(`/namespaces/${encodeURIComponent(prefix)}`);
};

// ============================================================================
// API 関数 — 用語 (Term)
// ============================================================================

/**
 * 組織に紐づく用語一覧を取得する
 *
 * @remarks
 * バックエンドの GET /api/v1/namespaces/terms を呼び出す。
 *
 * @param options.scopeKey      - フィルタリングする scopeKey（単数）。指定時はそのスコープの用語を返す
 * @param options.scopeKeys     - フィルタリングする scopeKey 配列（後方互換用・省略時は全件取得）
 * @param options.withAncestors - true の場合、scopeKey とその祖先グループの用語も取得
 *                                （組織グループノード選択時に使用）
 * @returns 用語一覧
 */
export const getTerms = async (options?: {
  scopeKey?: string;
  scopeKeys?: string[];
  withAncestors?: boolean;
}): Promise<NamespaceTermRow[]> => {
  const client = createApiClient();

  try {
    console.log('🔖 [namespaceApiService] 用語一覧取得', options);

    const params: Record<string, string> = {};
    // scopeKey（単数）が指定されている場合はそちらを優先
    if (options?.scopeKey) {
      params.scopeKey = options.scopeKey;
    } else if (options?.scopeKeys && options.scopeKeys.length > 0) {
      params.scopeKeys = options.scopeKeys.join(',');
    }
    if (options?.withAncestors) {
      params.withAncestors = 'true';
    }

    const response = await client.get<NamespaceTermRow[]>('/namespaces/terms', { params });

    return response.data ?? [];
  } catch (error) {
    console.warn('⚠️ [namespaceApiService] 用語一覧の取得に失敗しました:', error);
    return [];
  }
};

/**
 * 全用語を取得して qname → NamespaceTermRow の Map に変換する
 *
 * @remarks
 * 既存の getTerms() をラップし、Map<qname, NamespaceTermRow> 形式で返す。
 * TemplateEditorDialog のダイアログ open 時に全件キャッシュし、
 * キー入力時の補完・プレビューに使用する。
 * バックエンドへの追加実装は不要。
 *
 * @returns Map<qname, NamespaceTermRow>（例: "chem:SampleTemperature" → TermRow）
 */
export const getAllTermsAsMap = async (): Promise<Map<string, NamespaceTermRow>> => {
  const terms = await getTerms();
  const map = new Map<string, NamespaceTermRow>();
  for (const term of terms) {
    const qname = `${term.prefix}:${term.localName}`;
    map.set(qname, term);
  }
  return map;
};

/**
 * プロパティ追加ダイアログ用の用語マップを取得する
 *
 * @remarks
 * 以下の2スコープの用語を取得してマージし、Map<qname, NamespaceTermRow> 形式で返す。
 * 1. プロジェクトが属するグループ＋その上位グループスコープ（organizationGroupCd 指定時）
 * 2. ログインユーザの個人スコープ（localStorage.userInfo.id）
 *
 * organizationGroupCd が未指定の場合は個人スコープのみを返す（フォールバック）。
 * qname が重複する場合はグループスコープの用語を優先し、個人スコープで上書きする。
 *
 * @param organizationGroupCd - プロジェクトが属するグループの organization_group_cd（任意）
 * @returns Map<qname, NamespaceTermRow>
 */
export const getTermsForPropertyDialog = async (
  organizationGroupCd?: string
): Promise<Map<string, NamespaceTermRow>> => {
  // localStorage から userId を取得
  const userInfo = (() => {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem('userInfo');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const userId: string | undefined = userInfo?.id ?? undefined;

  // グループ＋上位グループの用語と個人スコープの用語を並列取得
  const groupTermsOptions = organizationGroupCd
    ? { scopeKey: organizationGroupCd, withAncestors: true as const }
    : undefined;

  const [groupTerms, personalTerms] = await Promise.all([
    groupTermsOptions ? getTerms(groupTermsOptions) : Promise.resolve([] as NamespaceTermRow[]),
    userId ? getTerms({ scopeKey: userId }) : Promise.resolve([] as NamespaceTermRow[]),
  ]);

  // マージ: グループスコープを先に登録し、個人スコープで上書き（個人スコープ優先）
  const map = new Map<string, NamespaceTermRow>();
  for (const term of [...groupTerms, ...personalTerms]) {
    const qname = `${term.prefix}:${term.localName}`;
    map.set(qname, term);
  }

  console.log(
    `🔖 [namespaceApiService] getTermsForPropertyDialog: グループ=${groupTerms.length}件, 個人=${personalTerms.length}件, マージ後=${map.size}件`
  );

  return map;
};

/**
 * 用語を新規登録する
 *
 * @remarks
 * バックエンドの POST /api/v1/namespaces/terms を呼び出す。
 *
 * @param data - 登録する用語データ
 * @returns 登録された用語
 */
export const createTerm = async (data: TermUpsertRequest): Promise<NamespaceTermRow> => {
  const client = createApiClient();

  console.log('🔖 [namespaceApiService] 用語新規登録:', `${data.prefix}:${data.localName}`);

  const response = await client.post<NamespaceTermRow>('/namespaces/terms', data);

  return response.data;
};

/**
 * 用語を更新する
 *
 * @remarks
 * バックエンドの PUT /api/v1/namespaces/terms/:prefix/:localName を呼び出す。
 *
 * @param prefix - 名前空間の接頭辞
 * @param localName - ローカル名
 * @param data - 更新するフィールド
 * @returns 更新された用語
 */
export const updateTerm = async (
  prefix: string,
  localName: string,
  data: Partial<TermUpsertRequest>
): Promise<NamespaceTermRow> => {
  const client = createApiClient();

  console.log('🔖 [namespaceApiService] 用語更新:', `${prefix}:${localName}`);

  const response = await client.put<NamespaceTermRow>(
    `/namespaces/terms/${encodeURIComponent(prefix)}/${encodeURIComponent(localName)}`,
    data
  );

  return response.data;
};

/**
 * 用語を削除する
 *
 * @remarks
 * バックエンドの DELETE /api/v1/namespaces/terms/:prefix/:localName を呼び出す。
 *
 * @param prefix - 名前空間の接頭辞
 * @param localName - ローカル名
 */
export const deleteTerm = async (prefix: string, localName: string): Promise<void> => {
  const client = createApiClient();

  console.log('🔖 [namespaceApiService] 用語削除:', `${prefix}:${localName}`);

  await client.delete(
    `/namespaces/terms/${encodeURIComponent(prefix)}/${encodeURIComponent(localName)}`
  );
};

/**
 * 用語のアクティブ/非アクティブを切り替える
 *
 * @remarks
 * バックエンドの PATCH /api/v1/namespaces/terms/:prefix/:localName/active を呼び出す。
 *
 * @param prefix - 名前空間の接頭辞
 * @param localName - ローカル名
 * @param isActive - 設定するアクティブ状態
 * @returns 更新された用語
 */
export const toggleTermActive = async (
  prefix: string,
  localName: string,
  isActive: boolean
): Promise<NamespaceTermRow> => {
  const client = createApiClient();

  console.log('🔖 [namespaceApiService] 用語アクティブ切替:', `${prefix}:${localName}`, isActive);

  const toggleTermActiveBody = { isActive };
  const response = await client.patch<NamespaceTermRow>(
    `/namespaces/terms/${encodeURIComponent(prefix)}/${encodeURIComponent(localName)}/active`,
    toggleTermActiveBody
  );

  return response.data;
};

// ============================================================================
// API 関数 — 組織ユーザー（Personal ツリーノード用）
// ============================================================================

/**
 * 組織に所属するユーザー一覧を取得する（Personal ノード表示用）
 *
 * @remarks
 * バックエンドの GET /api/v1/systemManagement/user を呼び出す。
 * Personal ツリーノードの children にユーザーを一覧表示するために使用する。
 *
 * @returns ユーザー一覧（{userId, userName}[]）
 */
export interface OrgUserSimple {
  userId: string;
  userName: string;
}

export const getOrganizationUsers = async (): Promise<OrgUserSimple[]> => {
  const client = createApiClient();

  try {
    console.log('👤 [namespaceApiService] 組織ユーザー一覧取得（Personal ノード用）');

    const response = await client.get<OrgUserListResponse>('/systemManagement/user');

    return (response.data?.data ?? []).map((u) => ({
      userId: u.userId,
      userName: u.userName,
    }));
  } catch (error) {
    console.warn('⚠️ [namespaceApiService] 組織ユーザー一覧の取得に失敗しました:', error);
    return [];
  }
};

// ============================================================================
// API 関数 — organization_group（部署管理タブ）
// ============================================================================

/**
 * 組織階層グループ一覧を取得する
 *
 * @remarks
 * バックエンドの GET /api/v1/organization-groups を呼び出す。
 *
 * @param search - 検索キーワード（グループ名の部分一致）
 * @returns 組織階層グループ行の配列
 */
export const getOrganizationGroups = async (
  search?: string,
  options?: { visibleOnly?: boolean; memberOf?: boolean; all?: boolean; memberOfUser?: string }
): Promise<OrganizationGroupRow[]> => {
  const client = createApiClient();

  try {
    console.log('🏢 [namespaceApiService] 組織階層グループ一覧取得', options);

    const params: Record<string, string> = {};
    if (search) params.search = search;
    // visibleOnly=true を渡すと「閲覧可能な全グループ」を返す（代表者フィルタなし）
    if (options?.visibleOnly) params.visibleOnly = 'true';
    // memberOf=true を渡すとログインユーザーが所属するグループ＋全祖先グループを返す（ツリー構築用）
    if (options?.memberOf) params.memberOf = 'true';
    // all=true を渡すと全グループを返す（system_admin 専用: バックエンドで権限チェック実施）
    if (options?.all) params.all = 'true';
    // memberOfUser={userId} を渡すと指定ユーザーの所属グループ＋祖先を返す（代表者/system_admin 専用）
    if (options?.memberOfUser) params.memberOfUser = options.memberOfUser;

    const response = await client.get<{ success: boolean; data: OrganizationGroupRow[] }>(
      '/organization-groups',
      { params }
    );

    return response.data?.data ?? [];
  } catch (error) {
    console.warn('⚠️ [namespaceApiService] 組織階層グループ一覧の取得に失敗しました:', error);
    return [];
  }
};

/**
 * 組織階層グループを新規作成する
 *
 * @remarks
 * バックエンドの POST /api/v1/organization-groups を呼び出す。
 *
 * @param data - 作成するグループデータ
 * @returns 作成された組織階層グループ行
 */
export const createOrganizationGroup = async (
  data: CreateOrganizationGroupRequest
): Promise<OrganizationGroupRow> => {
  const client = createApiClient();

  console.log('🏢 [namespaceApiService] 組織階層グループ作成:', data.organization_group_cd);

  const response = await client.post<{ success: boolean; data: OrganizationGroupRow }>('/organization-groups', data);

  return response.data.data;
};

/**
 * 組織階層グループを更新する
 *
 * @remarks
 * バックエンドの PUT /api/v1/organization-groups/:groupCd を呼び出す。
 *
 * @param groupCd - 更新対象の組織階層グループCD
 * @param data - 更新するフィールド
 * @returns 更新された組織階層グループ行
 */
export const updateOrganizationGroup = async (
  groupCd: string,
  data: UpdateOrganizationGroupRequest
): Promise<OrganizationGroupRow> => {
  const client = createApiClient();

  console.log('🏢 [namespaceApiService] 組織階層グループ更新:', groupCd);

  const response = await client.put<{ success: boolean; data: OrganizationGroupRow }>(
    `/organization-groups/${encodeURIComponent(groupCd)}`,
    data
  );

  return response.data.data;
};

/**
 * 組織階層グループを削除する
 *
 * @remarks
 * バックエンドの DELETE /api/v1/organization-groups/:groupCd を呼び出す。
 *
 * @param groupCd - 削除対象の組織階層グループCD
 */
export const deleteOrganizationGroup = async (groupCd: string): Promise<void> => {
  const client = createApiClient();

  console.log('🏢 [namespaceApiService] 組織階層グループ削除:', groupCd);

  await client.delete(`/organization-groups/${encodeURIComponent(groupCd)}`);
};

// ============================================================================
// API 関数 — 属性マスター
// ============================================================================

/**
 * 属性マスター行の型定義
 */
export interface AttributeMaster {
  attributeValue: string;
  isActive: boolean;
}

/**
 * 属性マスター一覧を取得する（単位フィルター用）
 *
 * @remarks
 * バックエンドの GET /api/v1/master/attribute を呼び出す。
 * 用語管理画面の単位フィルタープルダウンに使用する。
 *
 * @returns アクティブな属性マスター一覧
 */
export const getAttributeMaster = async (): Promise<AttributeMaster[]> => {
  const client = createApiClient();

  try {
    console.log('🔖 [namespaceApiService] 属性マスター一覧取得');

    const response = await client.get<{ success: boolean; data: AttributeMaster[] }>(
      '/master/attribute',
      { params: { attribute_name: 'units', is_active: 'true' } }
    );

    return response.data?.data ?? [];
  } catch (error) {
    console.warn('⚠️ [namespaceApiService] 属性マスター一覧の取得に失敗しました:', error);
    return [];
  }
};

/**
 * ログインユーザーの所属グループ＋全祖先グループの CD 一覧を取得する
 *
 * @remarks
 * バックエンドの GET /api/v1/organization-groups/ancestors を呼び出す。
 * WITH RECURSIVE クエリで直接所属グループから parent_group_cd を辿り、
 * 全祖先グループの CD を返す。
 * 用語重複チェックで「上位層グループに登録された同一 prefix の名前空間」を
 * 警告対象として特定するために使用する。
 *
 * @returns 所属グループ + 全祖先グループの organization_group_cd 配列
 */
export const getAncestorGroupCds = async (): Promise<string[]> => {
  const client = createApiClient();

  console.log('🏢 [namespaceApiService] 所属グループ＋祖先グループ CD 一覧取得');

  const response = await client.get<{ success: boolean; data: string[] }>(
    '/organization-groups/ancestors'
  );

  return response.data.data;
};

/**
 * 組織の表示名を取得する
 *
 * @remarks
 * GET /api/v1/provider/organization/:organizationId を呼び出し、
 * organizationDisplayName を返す。名前空間ツリーの company ノードラベルに使用。
 *
 * @param organizationId - 取得対象の組織 ID（UUID）
 * @returns 組織表示名。取得できない場合は空文字列
 */
export const getOrganizationDisplayName = async (organizationId: string): Promise<string> => {
  const client = createApiClient();

  const response = await client.get<{ organizationDisplayName: string }>(
    `/provider/organization/${organizationId}`
  );

  return response.data.organizationDisplayName ?? '';
};

// ─── グローバル名前空間宣言（ファイルサーバ管理）────────────────────────────────

/**
 * グローバル名前空間宣言一覧を取得する
 *
 * @remarks
 * GET /api/v1/namespaces/global-declarations を呼び出す。
 * ファイルサーバ（system/namespaces/global-declarations.csv）から読み込まれる。
 *
 * @returns グローバル名前空間宣言エントリ一覧
 */
export const getGlobalDeclarations = async (): Promise<GlobalNamespaceEntry[]> => {
  const client = createApiClient();

  try {
    console.log('🌐 [namespaceApiService] グローバル名前空間宣言一覧取得');
    const response = await client.get<{ declarations: GlobalNamespaceEntry[] }>(
      '/namespaces/global-declarations'
    );
    return response.data?.declarations ?? [];
  } catch (error) {
    console.warn('⚠️ [namespaceApiService] グローバル名前空間宣言の取得に失敗しました:', error);
    return [];
  }
};

/**
 * グローバル名前空間宣言 CSV をインポートする（ファイルサーバへ上書き）
 *
 * @remarks
 * POST /api/v1/namespaces/global-declarations/import を呼び出す。
 * multipart/form-data で CSV ファイルを送信する。
 *
 * @param file - アップロードする CSV ファイル
 */
export const importGlobalDeclarations = async (file: File): Promise<void> => {
  const client = createApiClient();

  console.log('🌐 [namespaceApiService] グローバル名前空間宣言インポート:', file.name);

  const formData = new FormData();
  formData.append('file', file);

  await client.post('/namespaces/global-declarations/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/**
 * グローバル名前空間宣言 CSV をエクスポートする（ブラウザでダウンロード）
 *
 * @remarks
 * GET /api/v1/namespaces/global-declarations/export を呼び出し、
 * レスポンスを CSV ファイルとしてブラウザでダウンロードする。
 */
export const exportGlobalDeclarations = async (): Promise<void> => {
  const client = createApiClient();

  console.log('🌐 [namespaceApiService] グローバル名前空間宣言エクスポート');

  const response = await client.get('/namespaces/global-declarations/export', {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'global-declarations.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// ============================================================================
// API 関数 — URI自動生成
// ============================================================================

/**
 * URI自動生成候補を取得する
 *
 * GET /api/v1/namespaces/suggested-uri
 *
 * @param scopeKey - 選択中ノードの scopeKey（organization_group_cd または userId）。
 *                   未指定時は個人スコープ（ログインユーザーのメールアドレスから生成）。
 * @returns 生成されたURI文字列（既存URIと重複しない値が返る）
 */
export const fetchSuggestedUri = async (scopeKey?: string): Promise<string> => {
  const client = createApiClient();

  console.log('🔗 [namespaceApiService] URI自動生成候補取得:', scopeKey);

  const params: Record<string, string> = {};
  if (scopeKey) params.scopeKey = scopeKey;

  const response = await client.get<{ uri: string }>('/namespaces/suggested-uri', { params });

  return response.data.uri;
};

/**
 * Prefix の非アクティブ化（or アクティブ化）
 *
 * PATCH /api/v1/namespaces/:prefix/active
 *
 * @param prefix - 対象の Prefix 文字列
 * @param isActive - true: アクティブ化、false: 非アクティブ化
 */
export const toggleNamespaceActive = async (
  prefix: string,
  isActive: boolean
): Promise<void> => {
  const client = createApiClient();
  const encodedPrefix = encodeURIComponent(prefix);

  console.log('🔗 [namespaceApiService] Prefix アクティブ切替:', prefix, isActive);

  const toggleNamespaceActiveBody = { isActive };
  await client.patch(`/namespaces/${encodedPrefix}/active`, toggleNamespaceActiveBody);
};

// ============================================================================
// Prefix 共有
// ============================================================================

/**
 * POST /api/v1/namespaces/prefixes/share のレスポンス型
 */
export interface SharePrefixesResponse {
  /** コピーに成功した Prefix 数 */
  copiedCount: number;
  /** 既に存在していてスキップされた Prefix 数 */
  skippedCount: number;
}

/**
 * 選択した Prefix を指定スコープへ共有（コピー）する
 *
 * POST /api/v1/namespaces/prefixes/share
 *
 * @param prefixKeys - コピー対象の Prefix 名の配列
 * @param targetScopeKey - コピー先スコープキー（organization_group_cd または userId）
 * @returns コピー件数とスキップ件数
 */
export const sharePrefixes = async (
  prefixKeys: string[],
  targetScopeKey: string
): Promise<SharePrefixesResponse> => {
  const client = createApiClient();

  console.log('🔗 [namespaceApiService] Prefix 共有:', prefixKeys, '->', targetScopeKey);

  const requestBody = {
    prefixes: prefixKeys,
    targetScopeKey,
  };
  const response = await client.post<SharePrefixesResponse>('/namespaces/prefixes/share', requestBody);
  return response.data;
};

// ============================================================================
// 用語共有
// ============================================================================

/**
 * POST /api/v1/namespaces/terms/share のレスポンス型
 */
export interface ShareTermsResponse {
  /** 共有に成功した用語数 */
  copiedCount: number;
  /** 共有先に既に存在してスキップされた用語数 */
  skippedCount: number;
}

/**
 * 選択した用語を指定スコープへ共有（コピー → 共有元から削除）する
 *
 * POST /api/v1/namespaces/terms/share
 *
 * @param termIds - コピー対象の用語 qname 配列（"prefix:localName" 形式）
 * @param sourceScopeKey - 共有元スコープキー（organization_group_cd または userId）
 * @param targetScopeKey - 共有先スコープキー（organization_group_cd または userId）
 * @returns コピー件数とスキップ件数
 */
export const shareTerms = async (
  termIds: string[],
  sourceScopeKey: string,
  targetScopeKey: string
): Promise<ShareTermsResponse> => {
  const client = createApiClient();

  console.log('🔗 [namespaceApiService] 用語共有:', termIds, sourceScopeKey, '->', targetScopeKey);

  const requestBody = {
    termIds,
    sourceScopeKey,
    targetScopeKey,
  };
  const response = await client.post<ShareTermsResponse>('/namespaces/terms/share', requestBody);
  return response.data;
};

