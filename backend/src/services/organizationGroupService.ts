/**
 * organizationGroup Service
 *
 * 組織階層グループ管理のビジネスロジックを提供
 *
 * @module organizationGroupService
 * @version 1.0.0
 */

import * as organizationGroupRepository from '../repositories/organizationGroupRepository';
import type { OrganizationGroupRow, OrganizationGroupFilters, OrganizationGroupMemberRow, OrgUserRow } from '../repositories/organizationGroupRepository';
import * as namespaceTermRepository from '../repositories/namespaceTermRepository';
import * as organizationManagementRepository from '../repositories/organizationManagementRepository';
import { E6001, E7001 } from '../enums/errorCodes';
import { getMessage } from '../utils/messages';
import { getPool, getPgp } from '../database/db';
import { generateNamespaceUri, resolveUriConflict } from '../utils/namespaceUriGenerator';
import type { ITask } from 'pg-promise';


/**
 * 組織グループ一覧取得
 *
 * @param organizationId - 組織ID
 * @param filters - 検索フィルタ
 * @returns 組織グループ一覧
 */
export async function getOrganizationGroups(
  organizationId: string,
  filters?: OrganizationGroupFilters
): Promise<OrganizationGroupRow[]> {
  return organizationGroupRepository.findAll(organizationId, filters);
}

/**
 * ログインユーザーが閲覧可能な組織グループ一覧を返す
 *
 * 以下のグループを返す（非アクティブチームの権限ルールを反映）：
 * - ユーザーが直接所属するチーム（active）
 * - ユーザーが直接所属するチームの子孫チーム（active・inactive 両方）
 * - ユーザーの上位チームが active で、そこから辿れる非アクティブチーム
 * - ルート（parent_group_cd = null）の非アクティブチームは除外
 *
 * @param organizationId - 組織ID
 * @param userGroupCds - ログインユーザーが直接所属する組織グループCDの配列
 * @returns 閲覧可能な組織グループ一覧（cd, name, isActive）
 */
export async function getVisibleOrganizationGroups(
  organizationId: string,
  userGroupCds: string[]
): Promise<Array<{ cd: string; name: string; isActive: boolean }>> {
  // 全グループを取得してメモリ内で解決
  const allGroups = await organizationGroupRepository.findAll(organizationId);
  const allGroupMap = new Map(allGroups.map((g) => [g.organization_group_cd, g]));

  // ─── ヘルパー: 指定グループCDの有効な祖先CD一覧を返す ───
  const findActiveAncestorCds = (groupCd: string): string[] => {
    const activeCds: string[] = [];
    let current = allGroupMap.get(groupCd);
    let depth = 0;
    const maxDepth = 20;
    while (current?.parent_group_cd && depth < maxDepth) {
      const parent = allGroupMap.get(current.parent_group_cd);
      if (!parent) break;
      if (parent.is_active) activeCds.push(parent.organization_group_cd);
      current = parent;
      depth++;
    }
    return activeCds;
  };

  // ─── ヘルパー: 指定CDが candidates のいずれかの子孫か判定 ───
  const isDescendantOfAny = (cd: string, candidates: string[]): boolean => {
    let current = allGroupMap.get(cd);
    while (current?.parent_group_cd) {
      if (candidates.includes(current.parent_group_cd)) return true;
      current = allGroupMap.get(current.parent_group_cd);
    }
    return false;
  };

  // 直接所属グループが空なら空配列を返す（非アクティブグループ経由の閲覧のみ確認）
  const inactiveGroups = allGroups.filter((g) => !g.is_active);
  const inactiveVisibleCds: string[] = [];

  for (const inactiveGroup of inactiveGroups) {
    // ルート非アクティブグループ（上位チームなし）は除外
    if (!inactiveGroup.parent_group_cd) continue;

    const activeAncestorCds = findActiveAncestorCds(inactiveGroup.organization_group_cd);
    const isVisible = activeAncestorCds.some((cd) => userGroupCds.includes(cd));
    if (isVisible) {
      inactiveVisibleCds.push(inactiveGroup.organization_group_cd);
    }
  }

  if (userGroupCds.length === 0) {
    // 直接所属グループなし: 非アクティブグループ経由の閲覧のみ
    return inactiveVisibleCds.map((cd) => {
      const g = allGroupMap.get(cd)!;
      return { cd: g.organization_group_cd, name: g.organization_group_name, isActive: g.is_active };
    });
  }

  // ルート群（他の所属グループの子孫でないもの）を算出
  const rootCds = userGroupCds.filter((cd) => !isDescendantOfAny(cd, userGroupCds));

  // ルート群の子孫（自身含む・is_active 無関係）を再帰取得
  const descendantCds = await organizationGroupRepository.findDescendantCds(organizationId, rootCds);

  // 閲覧可能なCDの集合（重複除去）
  const visibleCdSet = new Set([...descendantCds, ...inactiveVisibleCds]);

  // 結果を OrganizationGroupRow から必要なフィールドのみ抽出して返す
  const result: Array<{ cd: string; name: string; isActive: boolean }> = [];
  for (const cd of visibleCdSet) {
    const g = allGroupMap.get(cd);
    if (g) {
      result.push({ cd: g.organization_group_cd, name: g.organization_group_name, isActive: g.is_active });
    }
  }

  // グループCD昇順でソート
  result.sort((a, b) => a.cd.localeCompare(b.cd));
  return result;
}

/**
 * 組織グループ単件取得
 *
 * @param organizationId - 組織ID
 * @param groupCd - 組織グループCD
 * @returns 組織グループ
 * @throws 存在しない場合は E6001（リソース不存在）エラー
 */
export async function getOrganizationGroupById(
  organizationId: string,
  groupCd: string,
  lang: string = 'ja'
): Promise<OrganizationGroupRow> {
  const group = await organizationGroupRepository.findById(organizationId, groupCd);
  if (!group) {
    const error = new Error(getMessage(lang, 'organizationGroup.notFound')) as Error & { code: string; statusCode: number };
    error.code = E6001;
    error.statusCode = 404;
    throw error;
  }
  return group;
}

// ──────────────────────────────────────────────────────────────────────────
// namespace 自動登録（内部ユーティリティ）
// ──────────────────────────────────────────────────────────────────────────

/**
 * グループスコープの namespace URI を登録する（共通処理）
 *
 * トランザクション内でもスクリプト単独でも呼び出せるよう分離。
 * 既に同じ scope_key の namespace が存在する場合はスキップする（冪等）。
 *
 * @param t - pg-promise トランザクションオブジェクト
 * @param params - 登録パラメータ
 */
export async function ensureGroupNamespace(
  t: ITask<unknown>,
  params: {
    organizationId: string;
    organizationCd: string;
    groupCd: string;
    parentGroupCd: string | null;
    userId: string;
  }
): Promise<void> {
  // 既存チェック（冪等: 既に登録済みならスキップ）
  const alreadyRegistered = await namespaceTermRepository.existsByScopeKey(
    params.organizationId,
    params.groupCd,
    t
  );
  if (alreadyRegistered) return;

  // 祖先チェーン取得（トランザクション外でよいが、ここでは t を流用せず直接 Repository を呼ぶ）
  // ※ findAncestorChain は読み取りのみかつ pg-promise を使用するため問題なし
  const ancestorCds = await organizationGroupRepository.findAncestorChain(
    params.organizationId,
    params.parentGroupCd
  );

  // URI 組み立て
  const basePart = generateNamespaceUri(params.organizationCd);
  const groupPath = [...ancestorCds, params.groupCd].join('/');
  const candidateUri = `${basePart}/${groupPath}`;

  // 既存 URI 一覧取得（重複解消用）
  const existingUris = await namespaceTermRepository.findUrisByOrganization(params.organizationId, t);
  const uri = resolveUriConflict(candidateUri, existingUris);

  // namespace テーブルに INSERT（scope_key = organization_group_cd）
  await namespaceTermRepository.createNamespaceUri(
    {
      organizationId: params.organizationId,
      uri,
      userId: params.userId,
      scopeKey: params.groupCd,
    },
    t
  );
}

/**
 * 組織グループ新規作成
 *
 * グループ本体の INSERT と namespace URI の自動登録を同一トランザクションで実行する。
 *
 * @param organizationId - 組織ID
 * @param data - 作成データ
 * @param userId - 作成者ユーザーID
 * @returns 作成された組織グループ
 * @throws グループCDが重複している場合は E7001（重複）エラー
 */
export async function createOrganizationGroup(
  organizationId: string,
  data: {
    organization_group_cd: string;
    organization_group_name: string;
    chief_user_id: string;
    parent_group_cd?: string | null;
  },
  userId?: string | null,
  lang: string = 'ja'
): Promise<OrganizationGroupRow> {
  // 重複チェック（トランザクション外で実施）
  const alreadyExists = await organizationGroupRepository.existsById(
    organizationId,
    data.organization_group_cd
  );
  if (alreadyExists) {
    const error = new Error(getMessage(lang, 'organizationGroup.duplicateCd')) as Error & { code: string; statusCode: number };
    error.code = E7001;
    error.statusCode = 409;
    throw error;
  }

  // layer を親子関係から自動算出
  // - parent_group_cd が null → ルートグループ → layer = '1'
  // - parent_group_cd が指定あり → findAncestorChain の結果件数 + 1
  let layer: string;
  if (!data.parent_group_cd) {
    layer = '1';
  } else {
    const ancestorCds = await organizationGroupRepository.findAncestorChain(
      organizationId,
      data.parent_group_cd
    );
    layer = String(ancestorCds.length + 1);
  }

  // 組織 CD 取得（namespace URI 生成に必要）
  const orgRow = await organizationManagementRepository.findById(organizationId);
  const organizationCd = orgRow?.organization_cd ?? organizationId;

  const pgp = getPgp();

  return pgp.tx(async (t) => {
    // 1. グループ本体 INSERT
    const created = await organizationGroupRepository.create(
      {
        organization_id: organizationId,
        organization_group_cd: data.organization_group_cd,
        organization_group_name: data.organization_group_name,
        chief_user_id: data.chief_user_id,
        parent_group_cd: data.parent_group_cd ?? null,
        layer,
        create_user_id: userId ?? null,
      },
      t
    );

    // 2. 代表者（chief_user_id）をメンバーとして自動登録
    // グループ作成者は必ずメンバーとして登録する（ON CONFLICT DO NOTHING のため冪等）
    await organizationGroupRepository.insertMemberInTransaction(
      organizationId,
      data.organization_group_cd,
      data.chief_user_id,
      t
    );

    // 3. namespace URI 自動登録
    await ensureGroupNamespace(t, {
      organizationId,
      organizationCd,
      groupCd: data.organization_group_cd,
      parentGroupCd: data.parent_group_cd ?? null,
      userId: userId ?? organizationId,
    });

    return created;
  });
}

/**
 * 組織グループ更新
 *
 * @param organizationId - 組織ID
 * @param groupCd - 組織グループCD
 * @param data - 更新データ（未指定フィールドは既存値を維持）
 * @param userId - 更新者ユーザーID
 * @returns 更新された組織グループ
 * @throws 存在しない場合は E6001（リソース不存在）エラー
 *
 * @remarks
 * chief_user_id はフロントエンドから送信されない。
 * 既存レコードの chief_user_id を自動維持する。
 */
export async function updateOrganizationGroup(
  organizationId: string,
  groupCd: string,
  data: {
    organization_group_name?: string;
    parent_group_cd?: string | null;
    layer?: string | null;
  },
  userId?: string | null,
  lang: string = 'ja'
): Promise<OrganizationGroupRow> {
  // 既存レコード取得（chief_user_id の維持＋存在確認を兼ねる）
  const existing = await organizationGroupRepository.findById(organizationId, groupCd);
  if (!existing) {
    const error = new Error(getMessage(lang, 'organizationGroup.notFound')) as Error & { code: string; statusCode: number };
    error.code = E6001;
    error.statusCode = 404;
    throw error;
  }

  const updated = await organizationGroupRepository.update({
    organization_id: organizationId,
    organization_group_cd: groupCd,
    organization_group_name: data.organization_group_name ?? existing.organization_group_name,
    chief_user_id: existing.chief_user_id,  // 既存値を維持
    parent_group_cd: data.parent_group_cd !== undefined ? data.parent_group_cd : existing.parent_group_cd,
    layer: data.layer !== undefined ? data.layer : existing.layer,
    update_user_id: userId ?? null,
  });

  if (!updated) {
    const error = new Error(getMessage(lang, 'organizationGroup.notFound')) as Error & { code: string; statusCode: number };
    error.code = E6001;
    error.statusCode = 404;
    throw error;
  }

  return updated;
}

/**
 * 組織グループ アクティブ状態更新（論理削除 / 有効化 共用）
 *
 * @param organizationId - 組織ID
 * @param groupCd - 組織グループCD
 * @param isActive - 設定するアクティブ状態（false で無効化＝論理削除、true で有効化）
 * @param updaterId - 更新者ユーザーID
 * @returns 更新された組織グループ
 * @throws 存在しない場合は E6001（リソース不存在）エラー
 *
 * @remarks
 * isActive = false（無効化）の場合、organization_group_user のメンバーを物理削除する。
 * isActive = true（有効化）の場合、代表者（chief_user_id）を organization_group_user に再登録する。
 * 代表者が既にメンバーとして存在する場合はスキップされる（ON CONFLICT DO NOTHING）。
 */
export async function updateOrganizationGroupActiveStatus(
  organizationId: string,
  groupCd: string,
  isActive: boolean,
  updaterId?: string | null,
  lang: string = 'ja'
): Promise<OrganizationGroupRow> {
  // 存在確認 + chief_user_id 取得（有効化時の代表者再登録に使用）
  const existing = await organizationGroupRepository.findById(organizationId, groupCd);
  if (!existing) {
    const error = new Error(getMessage(lang, 'organizationGroup.notFound')) as Error & { code: string; statusCode: number };
    error.code = E6001;
    error.statusCode = 404;
    throw error;
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (!isActive) {
      // 無効化時: メンバーを物理削除してから is_active を false に更新
      await organizationGroupRepository.setMembers(organizationId, groupCd, [], client);
      await organizationGroupRepository.updateActiveStatus(organizationId, groupCd, false, updaterId);
    } else {
      // 有効化時: is_active を true に更新してから代表者（chief_user_id）を再登録
      await organizationGroupRepository.updateActiveStatus(organizationId, groupCd, true, updaterId);
      await organizationGroupRepository.insertMember(organizationId, groupCd, existing.chief_user_id, client);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // 更新後のレコードを返す
  const updated = await organizationGroupRepository.findById(organizationId, groupCd);
  if (!updated) {
    const error = new Error('Organization group not found after update') as Error & { code: string; statusCode: number };
    error.code = E6001;
    error.statusCode = 404;
    throw error;
  }
  return updated;
}

// ──────────────────────────────────────────────────────────────────────────
// 組織ユーザー一覧取得（グループメンバー選択用）
// ──────────────────────────────────────────────────────────────────────────

/**
 * 組織内のアクティブなユーザー一覧を取得（グループメンバー追加・編集ダイアログ用）
 *
 * @param organizationId - 組織ID
 * @returns ユーザー一覧（user_id, user_name, email）
 */
export async function getOrgUsersForGroups(
  organizationId: string
): Promise<OrgUserRow[]> {
  return organizationGroupRepository.findAllOrgUsers(organizationId);
}

// ──────────────────────────────────────────────────────────────────────────
// メンバー管理
// ──────────────────────────────────────────────────────────────────────────

/**
 * グループメンバー一覧取得
 *
 * @param organizationId - 組織ID
 * @param groupCd - 組織グループCD
 * @returns メンバー一覧
 * @throws 存在しない場合は E6001（リソース不存在）エラー
 */
export async function getOrganizationGroupMembers(
  organizationId: string,
  groupCd: string,
  lang: string = 'ja'
): Promise<OrganizationGroupMemberRow[]> {
  const exists = await organizationGroupRepository.existsById(organizationId, groupCd);
  if (!exists) {
    const error = new Error(getMessage(lang, 'organizationGroup.notFound')) as Error & { code: string; statusCode: number };
    error.code = E6001;
    error.statusCode = 404;
    throw error;
  }
  return organizationGroupRepository.findMembersByGroupCd(organizationId, groupCd);
}

/**
 * グループメンバー一括更新（トランザクション）
 *
 * @param organizationId - 組織ID
 * @param groupCd - 組織グループCD
 * @param userIds - 設定するユーザーIDの配列
 * @throws 存在しない場合は E6001（リソース不存在）エラー
 *
 * @remarks
 * 代表者（chief_user_id）は常にメンバーとして保持する。
 * userIds に代表者が含まれていない場合も、代表者を自動的に追加して保存する。
 */
export async function setOrganizationGroupMembers(
  organizationId: string,
  groupCd: string,
  userIds: string[],
  lang: string = 'ja'
): Promise<void> {
  // グループ存在確認 + 代表者ID取得
  const group = await organizationGroupRepository.findById(organizationId, groupCd);
  if (!group) {
    const error = new Error(getMessage(lang, 'organizationGroup.notFound')) as Error & { code: string; statusCode: number };
    error.code = E6001;
    error.statusCode = 404;
    throw error;
  }

  // 代表者（chief_user_id）がメンバー一覧に含まれることを保証
  const chiefUserId = group.chief_user_id;
  const effectiveUserIds = chiefUserId && !userIds.includes(chiefUserId)
    ? [...userIds, chiefUserId]
    : userIds;

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await organizationGroupRepository.setMembers(organizationId, groupCd, effectiveUserIds, client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * グループ代表者変更
 *
 * @param organizationId - 組織ID
 * @param groupCd - 組織グループCD
 * @param chiefUserId - 新しい代表者ユーザーID
 * @param updaterId - 更新者ユーザーID
 * @returns 更新された組織グループ
 * @throws 存在しない場合は E6001（リソース不存在）エラー
 */
export async function updateOrganizationGroupChief(
  organizationId: string,
  groupCd: string,
  chiefUserId: string,
  updaterId?: string | null,
  lang: string = 'ja'
): Promise<OrganizationGroupRow> {
  const existing = await organizationGroupRepository.findById(organizationId, groupCd);
  if (!existing) {
    const error = new Error(getMessage(lang, 'organizationGroup.notFound')) as Error & { code: string; statusCode: number };
    error.code = E6001;
    error.statusCode = 404;
    throw error;
  }

  const updated = await organizationGroupRepository.update({
    organization_id: organizationId,
    organization_group_cd: groupCd,
    organization_group_name: existing.organization_group_name,
    chief_user_id: chiefUserId,
    parent_group_cd: existing.parent_group_cd,
    layer: existing.layer,
    update_user_id: updaterId ?? null,
  });

  if (!updated) {
    const error = new Error(getMessage(lang, 'organizationGroup.notFound')) as Error & { code: string; statusCode: number };
    error.code = E6001;
    error.statusCode = 404;
    throw error;
  }

  return updated;
}

