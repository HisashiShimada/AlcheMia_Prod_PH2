/**
 * MaimlWriterService
 *
 * 承認完了後にプロジェクトの MAIMLファイルへ
 * <data> 層・<eventLog> 層を書き出すサービス。
 *
 * 処理フロー:
 *   1. storageService.downloadFile() で最新 MAIMLファイルを取得
 *   2. template_data テーブルから全レコードを取得（プロジェクト単位）
 *   3. maiml_event_log テーブルから全レコードを取得（プロジェクト単位）
 *   4. buildDataXML() で <data> XML を生成
 *   5. buildEventLogXML() で <eventLog> XML を生成
 *   6. replaceDataAndEventLogInMaiml() で既存タグを置き換え
 *   7. storageService.uploadFile() で保存
 */

import { getPool, getPgp } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import { getStorageService } from './storageService';
import type { ExperimentPlan, MaimlEventLog } from '../types/database';
import { TemplateDataRepository } from '../repositories/templateDataRepository';
import type { TemplateDataRow } from '../repositories/templateDataRepository';
import type { EventLogJsonRecord } from '../utils/maimlDataWriter';
import type { EventLogRow } from '../types/eventLog';
import {
  buildDataXML,
  buildEventLogXML,
  replaceDataAndEventLogInMaiml,
  replaceEventLogInMaiml,
  updateDocumentUuidAndParent,
  injectNamespaceDeclarations,
  appendOwnerToDocument,
  extractOwnerIdsFromEventLogs,
} from '../utils/maimlDataWriter';
import { extractUuidsFromMaiml } from '../utils/maimlUuidExtractor';
import { resolveMaimlFilePath } from '../utils/maimlPathResolver';
import { findDeclarationsByProjectScope, findProjectGroupCd } from '../repositories/namespaceTermRepository';
import { readGlobalDeclarations } from './globalNamespaceFileService';
import { ExperimentUncertaintyJudgeRepository } from '../repositories/experimentUncertaintyJudgeRepository';
import { OrganizationUserRepository } from '../repositories/organizationUserRepository';

/**
 * プロジェクトスコープの名前空間（DB）とグローバル名前空間（ファイルサーバ）をマージして返す
 *
 * プロジェクトの organization_group_cd を取得し、そのグループ＋祖先グループに
 * 紐づく prefix のみを返す。同一 prefix が複数階層に存在する場合は対象グループ
 * （depth=0）を優先する（findDeclarationsByProjectScope.sql の DISTINCT ON による）。
 *
 * @param organizationId - 組織ID
 * @param projectId      - プロジェクトID（グループCDの特定に使用）
 * @returns マージされた名前空間エントリ配列（グローバル優先、プロジェクトスコープが後勝ち）
 */
async function buildMergedNamespaces(
  organizationId: string,
  projectId: string
): Promise<Array<{ prefix: string; uri: string }>> {
  // プロジェクトの organization_group_cd を取得
  const projectRow = await findProjectGroupCd(organizationId, projectId);
  const orgGroupCd: string | null = projectRow?.organization_group_cd ?? null;

  const [projectNamespaces, globalDeclarations] = await Promise.all([
    findDeclarationsByProjectScope(organizationId, orgGroupCd),
    readGlobalDeclarations(),
  ]);
  return [...globalDeclarations, ...projectNamespaces];
}

/**
 * MaimlWriterService
 *
 * プロジェクトの MAIML ファイルに data 層・eventLog 層を書き出す。
 */
export class MaimlWriterService {
  /**
   * プロジェクトの MAIMLファイルに data 層・eventLog 層を書き出して保存する
   *
   * - template_data テーブルと maiml_event_log テーブルの全データを取得し、
   *   既存の MAIMLファイルの <data> / <eventLog> タグを置き換える（上書き方式）。
   * - MAIMLファイルが存在しない場合は処理をスキップする（エラーにしない）。
   * - data / eventLog のいずれかが空でも処理を継続し、空要素として出力する。
   *
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId      - プロジェクトID
   * @param projectName    - プロジェクト名（S3 パス生成に使用）
   * @throws Error         - ファイル取得・保存に失敗した場合
   */
  async writeDataAndEventLog(
    organizationId: string,
    projectId: string,
    projectName: string
  ): Promise<void> {
    const storageService = getStorageService();
    const pool = getPool();

    // --- 1. MAIMLファイルの存在確認 ---
    // project_uuid → file_metadata → file_key の順で解決し、未設定の場合は project_name でフォールバック
    const filePath = await resolveMaimlFilePath(organizationId, projectId, projectName);
    const fileExists = await storageService.fileExists(organizationId, filePath);

    if (!fileExists) {
      console.warn(
        `[MaimlWriterService] MAIMLファイルが存在しないためスキップします: ${filePath}`
      );
      return;
    }

    // --- 2. MAIMLファイルをダウンロード ---
    const fileBuffer = await storageService.downloadFile(organizationId, filePath);
    const maimlContent = fileBuffer.toString('utf-8');

    // --- 3. template_data を全件取得（プロジェクト単位）---
    // 単純な全件取得クエリのため inline SQL を使用（database.md 例外ケース準拠）
    const templateDataResult = await pool.query<TemplateDataRow>(
      `SELECT
         organization_id,
         project_id,
         method_id,
         task_no,
         place_id,
         property_set,
         create_user_id,
         update_user_id,
         create_at,
         update_at
       FROM template_data
       WHERE organization_id = $1
         AND project_id = $2
       ORDER BY method_id, task_no, place_id`,
      [organizationId, projectId]
    );
    const templateDataRows: TemplateDataRow[] = templateDataResult.rows;

    // --- 3-b. experiment_uncertainty_judge から判定結果を全件取得・集約して
    //          templateDataRows の property_set.properties[].uncertainties に注入 ---
    // 各プロパティの定量評価結果（良好/不良）を MAIML <uncertainty> の <value> として書き込む。
    // 集約ルール: (placeId, propertyKey) ごとに全件「良好」なら「良好」、1件でも「不良」なら「不良」。
    try {
      const methodIds = [...new Set(templateDataRows.map((r) => r.method_id))];
      const judgeRepo = new ExperimentUncertaintyJudgeRepository();

      for (const methodId of methodIds) {
        const judgeRows = await judgeRepo.findAllByProject(organizationId, projectId, methodId);
        if (judgeRows.length === 0) continue;

        // (templateId, propertyKey) ごとに集約
        const judgeMap = new Map<string, '良好' | '不良'>();
        for (const jr of judgeRows) {
          const mapKey = `${jr.templateId}__${jr.propertyKey}`;
          const current = judgeMap.get(mapKey);
          if (current === '不良') continue;
          judgeMap.set(mapKey, jr.judgeResult === '不良' ? '不良' : '良好');
        }

        // templateDataRows の property_set.properties に判定結果を注入
        for (const row of templateDataRows) {
          if (row.method_id !== methodId) continue;
          const ps = row.property_set as Record<string, unknown> | null;
          if (!ps || !Array.isArray(ps['properties'])) continue;

          const templateId = ps['templateId'] as string | undefined;
          if (!templateId) continue;

          const properties = ps['properties'] as Array<Record<string, unknown>>;
          for (const prop of properties) {
            const propKey = prop['key'] as string | undefined;
            if (!propKey) continue;
            const aggregatedResult = judgeMap.get(`${templateId}__${propKey}`);
            if (!aggregatedResult) continue;

            // uncertainties 配列の最初の定量評価 uncertainty に集約結果を設定
            const uncertainties = prop['uncertainties'];
            if (Array.isArray(uncertainties) && uncertainties.length > 0) {
              for (const uc of uncertainties as Array<Record<string, unknown>>) {
                if (uc && typeof uc === 'object') {
                  uc['value'] = aggregatedResult;
                  break;
                }
              }
            }
          }
        }
      }
    } catch (judgeInjectError) {
      console.warn(
        '[MaimlWriterService] uncertainty judge 結果の注入に失敗しました（処理は継続）:',
        judgeInjectError
      );
    }


    // --- 4. maiml_event_log を全件取得（プロジェクト単位）---
    // sequence_no 昇順で取得してイベントの発生順序を保持する
    const findAllEventLogSql = await loadSqlFile('event_log/findAllByProject.sql');
    const eventLogResult = await pool.query<EventLogRow>(
      findAllEventLogSql,
      [organizationId, projectId]
    );
    const eventLogRows: EventLogRow[] = eventLogResult.rows;

    // log カラムの JSONB オブジェクトのみを抽出（null/undefinedを除外）
    const logJsonArray: EventLogJsonRecord[] = eventLogRows
      .map((row) => row.log)
      .filter((log): log is EventLogJsonRecord => log != null);

    // --- 5. <data> ID と <eventLog> ID を既存 XML から抽出 ---
    const dataIdMatch = maimlContent.match(/<data[^>]*\sid="([^"]+)"/);
    const dataId = dataIdMatch ? dataIdMatch[1] : 'dataID';

    const eventLogIdMatch = maimlContent.match(/<eventLog[^>]*\sid="([^"]+)"/);
    const eventLogId = eventLogIdMatch ? eventLogIdMatch[1] : 'eventLogID';

    // --- 6. 既存 MAIMLから UUID マッピングを抽出（改竄防止: UUID 再利用のため）---
    // 既存の <data> / <eventLog> ブロックにある <uuid> 要素の値を識別キーで管理し、
    // 同じ要素（同じ id 属性を持つ要素）に同じ UUID を再利用する。
    // 新規要素・新規ファイルの場合は randomUUID() で生成する。
    const existingUuids = extractUuidsFromMaiml(maimlContent);

    // --- 7. XML を生成（data: 既存UUID再利用 / eventLog: 変化があった要素のみ新規UUID払い出し）---
    const dataXml = buildDataXML(templateDataRows, dataId, existingUuids);
    const eventLogXml = buildEventLogXML(logJsonArray, eventLogId, existingUuids);

    // --- 8. 既存 MAIML の <data> / <eventLog> タグを置き換え ---
    let updatedMaiml = replaceDataAndEventLogInMaiml(maimlContent, dataXml, eventLogXml);

    // ★ <maiml> タグに名前空間宣言（xmlns:prefix="uri"）を注入
    // プロジェクトスコープ（グループ＋祖先）とファイルサーバ（グローバル）の2ソースをマージして完全上書き
    const allNamespaces = await buildMergedNamespaces(organizationId, projectId);
    updatedMaiml = injectNamespaceDeclarations(updatedMaiml, allNamespaces);

    // ★ document の uuid を新規発行し、旧 uuid を <parent> に記録
    updatedMaiml = updateDocumentUuidAndParent(updatedMaiml);

    // ★ maiml_event_log の ownerRef から作業者を抽出して <document> の <owner> に追記
    // organization_user テーブルから userName を取得し、存在しない id のみ追記する
    try {
      const ownerIds = extractOwnerIdsFromEventLogs(logJsonArray);
      if (ownerIds.size > 0) {
        const orgUserRepo = new OrganizationUserRepository();
        for (const ownerId of ownerIds) {
          // ownerId は @→_ 変換済み。DB検索は元のユーザーID形式（_→@ 逆変換）が必要なため
          // organization_user.user_id と照合する際は変換前の値を試みる
          const rawUserId = ownerId.replace(/_/g, '@');
          const userResult = await pool.query<{ user_name: string }>(
            `SELECT user_name FROM organization_user
             WHERE organization_id = $1 AND (user_id = $2 OR user_id = $3)
             LIMIT 1`,
            [organizationId, rawUserId, ownerId]
          );
          const userName = userResult.rows[0]?.user_name ?? ownerId;
          updatedMaiml = appendOwnerToDocument(updatedMaiml, ownerId, userName);
        }
      }
    } catch (ownerAppendErr) {
      console.warn(
        '[MaimlWriterService.writeDataAndEventLog] Owner追記に失敗しました（処理継続）:',
        ownerAppendErr
      );
    }

    // --- 9. 上書き保存前にアーカイブ処理 ---
    // 既存ファイルを archive/{projectName}_v{n}.maiml として保存する。
    // 命名規則: {baseName}_v{n}.maiml （s3_structure.md 規約準拠）
    // アーカイブ失敗は警告ログのみに留め、本体の書き込み処理は継続する。
    try {
      const pathParts = filePath.split('/');
      const fileName = pathParts[pathParts.length - 1]; // {projectName}.maiml
      const dirPath = pathParts.slice(0, -1).join('/'); // projects/{projectName}
      const baseName = fileName.replace(/\.maiml$/i, ''); // {projectName}
      const archivePath = `${dirPath}/archive`;

      // archive 内の既存バックアップを取得して最大バージョン番号を算出
      let maxVersion = 0;
      try {
        const archiveFiles = await storageService.listFiles(organizationId, archivePath);
        const pattern = new RegExp(
          `^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_v(\\d+)\\.maiml$`
        );
        archiveFiles.forEach((file: any) => {
          const name: string = (file.key || '').split('/').pop() ?? '';
          const match = name.match(pattern);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxVersion) maxVersion = num;
          }
        });
      } catch (_listErr) {
        // archiveフォルダが存在しない場合は v1 から開始
      }

      const newVersion = maxVersion + 1;
      const backupFileName = `${baseName}_v${newVersion}.maiml`;
      const backupPath = `${archivePath}/${backupFileName}`;

      // uploadedBy: 'system' を渡して file_metadata を自動登録
      await storageService.uploadFile(
        organizationId,
        backupPath,
        fileBuffer, // ダウンロード済みの既存ファイル内容をそのまま使用
        { contentType: 'application/xml', uploadedBy: 'system' }
      );

      console.log(
        `[MaimlWriterService] アーカイブ作成: ${backupPath} ` +
          `(organizationId=${organizationId}, projectId=${projectId})`
      );
    } catch (archiveError) {
      console.warn(
        '[MaimlWriterService] アーカイブ作成に失敗しました（処理は継続）:',
        archiveError
      );
    }

    // --- 9. 上書き保存（uploadedBy: 'system' を渡して file_metadata を自動登録）---
    await storageService.uploadFile(
      organizationId,
      filePath,
      updatedMaiml,
      { contentType: 'application/xml', uploadedBy: 'system' }
    );

    console.log(
      `[MaimlWriterService] MAIMLファイルを更新しました: ` +
        `organizationId=${organizationId}, projectId=${projectId}, ` +
        `templateData=${templateDataRows.length}件, eventLog=${logJsonArray.length}件`
    );
  }

  /**
   * プロジェクトの MAIMLファイルの <eventLog> セクションのみを書き出して保存する
   *
   * <data> セクションは変更しない。
   * チェックアウト時点では template_data が空のため、
   * writeDataAndEventLog() を使うと <data> が空で上書きされる問題を回避するために使用する。
   *
   * - maiml_event_log テーブルの全データを取得し、
   *   既存の MAIMLファイルの <eventLog> タグのみを置き換える（上書き方式）。
   * - MAIMLファイルが存在しない場合は処理をスキップする（エラーにしない）。
   *
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId      - プロジェクトID
   * @param projectName    - プロジェクト名（S3 パス生成に使用）
   * @throws Error         - ファイル取得・保存に失敗した場合
   */
  async writeEventLogOnly(
    organizationId: string,
    projectId: string,
    projectName: string
  ): Promise<void> {
    const storageService = getStorageService();
    const pool = getPool();

    // --- 1. MAIMLファイルの存在確認 ---
    const filePath = await resolveMaimlFilePath(organizationId, projectId, projectName);
    const fileExists = await storageService.fileExists(organizationId, filePath);

    if (!fileExists) {
      console.warn(
        `[MaimlWriterService.writeEventLogOnly] MAIMLファイルが存在しないためスキップします: ${filePath}`
      );
      return;
    }

    // --- 2. MAIMLファイルをダウンロード ---
    const fileBuffer = await storageService.downloadFile(organizationId, filePath);
    const maimlContent = fileBuffer.toString('utf-8');

    // --- 3. maiml_event_log を全件取得（プロジェクト単位）---
    // sequence_no 昇順で取得してイベントの発生順序を保持する
    const findAllEventLogSql = await loadSqlFile('event_log/findAllByProject.sql');
    const eventLogResult = await pool.query<EventLogRow>(
      findAllEventLogSql,
      [organizationId, projectId]
    );
    const eventLogRows: EventLogRow[] = eventLogResult.rows;

    // log カラムの JSONB オブジェクトのみを抽出（null/undefinedを除外）
    const logJsonArray: EventLogJsonRecord[] = eventLogRows
      .map((row) => row.log)
      .filter((log): log is EventLogJsonRecord => log != null);

    // --- 4. <eventLog> ID を既存 XML から抽出 ---
    const eventLogIdMatch = maimlContent.match(/<eventLog[^>]*\sid="([^"]+)"/);
    const eventLogId = eventLogIdMatch ? eventLogIdMatch[1] : 'eventLogID';

    // --- 5. 既存 MAIMLから UUID マッピングを抽出（改竄防止: UUID 再利用のため）---
    const existingUuids = extractUuidsFromMaiml(maimlContent);

    // --- 6. <eventLog> XML を生成（変化があった要素のみ新規UUID払い出し）---
    const eventLogXml = buildEventLogXML(logJsonArray, eventLogId, existingUuids);

    // --- 7. 既存 MAIML の <eventLog> タグのみを置き換え（<data> は変更しない）---
    let updatedMaiml = replaceEventLogInMaiml(maimlContent, eventLogXml);

    // ★ <maiml> タグに名前空間宣言（xmlns:prefix="uri"）を注入
    // プロジェクトスコープ（グループ＋祖先）とファイルサーバ（グローバル）の2ソースをマージして完全上書き
    const allNamespaces = await buildMergedNamespaces(organizationId, projectId);
    updatedMaiml = injectNamespaceDeclarations(updatedMaiml, allNamespaces);

    // ★ document の uuid を新規発行し、旧 uuid を <parent> に記録
    updatedMaiml = updateDocumentUuidAndParent(updatedMaiml);

    // ★ maiml_event_log の ownerRef から作業者を抽出して <document> の <owner> に追記
    // organization_user テーブルから userName を取得し、存在しない id のみ追記する
    try {
      const ownerIds = extractOwnerIdsFromEventLogs(logJsonArray);
      if (ownerIds.size > 0) {
        for (const ownerId of ownerIds) {
          const rawUserId = ownerId.replace(/_/g, '@');
          const userResult = await pool.query<{ user_name: string }>(
            `SELECT user_name FROM organization_user
             WHERE organization_id = $1 AND (user_id = $2 OR user_id = $3)
             LIMIT 1`,
            [organizationId, rawUserId, ownerId]
          );
          const userName = userResult.rows[0]?.user_name ?? ownerId;
          updatedMaiml = appendOwnerToDocument(updatedMaiml, ownerId, userName);
        }
      }
    } catch (ownerAppendErr) {
      console.warn(
        '[MaimlWriterService.writeEventLogOnly] Owner追記に失敗しました（処理継続）:',
        ownerAppendErr
      );
    }

    // --- 8. 上書き保存前にアーカイブ処理 ---
    try {
      const pathParts = filePath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const dirPath = pathParts.slice(0, -1).join('/');
      const baseName = fileName.replace(/\.maiml$/i, '');
      const archivePath = `${dirPath}/archive`;

      let maxVersion = 0;
      try {
        const archiveFiles = await storageService.listFiles(organizationId, archivePath);
        const pattern = new RegExp(
          `^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_v(\\d+)\\.maiml$`
        );
        archiveFiles.forEach((file: any) => {
          const name: string = (file.key || '').split('/').pop() ?? '';
          const match = name.match(pattern);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxVersion) maxVersion = num;
          }
        });
      } catch (_listErr) {
        // archiveフォルダが存在しない場合は v1 から開始
      }

      const newVersion = maxVersion + 1;
      const backupFileName = `${baseName}_v${newVersion}.maiml`;
      const backupPath = `${archivePath}/${backupFileName}`;

      await storageService.uploadFile(
        organizationId,
        backupPath,
        fileBuffer,
        { contentType: 'application/xml', uploadedBy: 'system' }
      );

      console.log(
        `[MaimlWriterService.writeEventLogOnly] アーカイブ作成: ${backupPath} ` +
          `(organizationId=${organizationId}, projectId=${projectId})`
      );
    } catch (archiveError) {
      console.warn(
        '[MaimlWriterService.writeEventLogOnly] アーカイブ作成に失敗しました（処理は継続）:',
        archiveError
      );
    }

    // --- 9. 上書き保存 ---
    await storageService.uploadFile(
      organizationId,
      filePath,
      updatedMaiml,
      { contentType: 'application/xml', uploadedBy: 'system' }
    );

    console.log(
      `[MaimlWriterService.writeEventLogOnly] MAIMLファイルを更新しました(<eventLog>のみ): ` +
        `organizationId=${organizationId}, projectId=${projectId}, ` +
        `eventLog=${logJsonArray.length}件`
    );
  }

  /**
   * チェックアウト時に実験計画データを MAIML の <results> 配下（<data> 層）に書き込む
   *
   * 処理フロー:
   *   1. experiment_plan.planned_values の値を template_data.property_set に反映（DB 更新）
   *   2. 更新後の template_data を全件取得して buildDataXML() で <data> XML を生成
   *   3. MAIML の <data> セクションを置き換えて S3 に保存
   *
   * planned_values の構造:
   *   { [transitionId]: { [fieldKey]: value }, "__meta__": { ... } }
   *   ※ transitionId は任意の文字列。"__meta__" キーはシステム用メタデータなのでスキップ。
   *   ※ value はスカラー文字列（string[]の場合もあるが template_data への反映対象は文字列のみ）
   *
   * MAIMLファイルが存在しない場合はスキップ（non-fatal）。
   *
   * @param organizationId  - 組織ID
   * @param projectId       - プロジェクトID
   * @param projectName     - プロジェクト名
   * @param experimentPlans - DB から取得した実験計画レコード一覧
   */
  async writeExperimentPlanProperties(
    organizationId: string,
    projectId: string,
    projectName: string,
    experimentPlans: ExperimentPlan[]
  ): Promise<void> {
    const storageService = getStorageService();
    const pool = getPool();
    const templateDataRepo = new TemplateDataRepository();

    // --- 1. MAIMLファイルの存在確認 ---
    const filePath = await resolveMaimlFilePath(organizationId, projectId, projectName);
    const fileExists = await storageService.fileExists(organizationId, filePath);

    if (!fileExists) {
      console.warn(
        `[MaimlWriterService.writeExperimentPlanProperties] MAIMLファイルが存在しないためスキップします: ${filePath}`
      );
      return;
    }

    // --- 2. MAIMLファイルをダウンロード ---
    const fileBuffer = await storageService.downloadFile(organizationId, filePath);
    let maimlContent = fileBuffer.toString('utf-8');

    // --- 3. planned_values → template_data.property_set に反映（トランザクション）---
    // planned_values 構造: { [transitionId]: { [fieldKey]: value }, "__meta__": {...} }
    // "__meta__" キーはシステム用メタデータなのでスキップする。
    // 全トランジションの fieldKey: value を1つのフラットマップに集約して
    // updatePropertySetByPlan に渡す。
    let updatedCount = 0;
    // mgr-instruction 注入用: planId(method_id + task_no) → mgrInstructionValues マップ
    const mgrInstructionValuesMap = new Map<string, Record<string, unknown>>();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const plan of experimentPlans) {
        if (!plan.planned_values) continue;

        const plannedValues = plan.planned_values as Record<string, unknown>;

        // 全トランジション分の fieldKey → value をフラットに集約
        // { [fieldKey]: value } 形式（文字列スカラーのみ対象）
        const planFlatValues: Record<string, string> = {};
        // mgr-instruction:* 値（文字列・配列問わず収集）
        const planMgrInstructionValues: Record<string, unknown> = {};

        for (const [transitionId, fieldMap] of Object.entries(plannedValues)) {
          // "__meta__" キー（システム用メタデータ）はスキップ
          if (transitionId === '__meta__') continue;
          if (!fieldMap || typeof fieldMap !== 'object') continue;

          for (const [fieldKey, value] of Object.entries(
            fieldMap as Record<string, unknown>
          )) {
          if (fieldKey === '__uncertainty__') {
              // __uncertainty__ キーは旧方式（ExperimentPlanDialog での不確かさ割り当て）のデータ。
              // 新方式（WorkRecordPanel での手入力）では使用しないためスキップ。
              continue;
            } else if (fieldKey.startsWith('mgr-instruction:')) {
              // mgr-instruction:* 値は文字列・配列問わず収集（_injectExperimentPlanProps で MAIML に書き込む）
              if (value !== null && value !== undefined) {
                planMgrInstructionValues[fieldKey] = value;
              }
            } else {
              // 文字列・数値スカラーを反映（string[] や object はスキップ）
              // intType / floatType のフィールドは数値として保存されるため typeof number も許容する
              if (value !== null && value !== undefined && (typeof value === 'string' || typeof value === 'number')) {
                planFlatValues[fieldKey] = String(value);
              }
            }
          }
        }

        const hasFlatValues = Object.keys(planFlatValues).length > 0;
        const hasMgrInstruction = Object.keys(planMgrInstructionValues).length > 0;

        console.log(
          `[MaimlWriterService.writeExperimentPlanProperties] method_id=${plan.method_id} task_no=${plan.task_no}: ` +
            `planFlatValues=${JSON.stringify(planFlatValues)}, ` +
            `planMgrInstructionValues=${JSON.stringify(planMgrInstructionValues)}`
        );

        // mgr-instruction 値を後で MAIML に注入するためにマップに保持
        if (hasMgrInstruction) {
          const planKey = `${plan.method_id}__${plan.task_no}`;
          mgrInstructionValuesMap.set(planKey, planMgrInstructionValues);
        }

        if (!hasFlatValues) continue;

        // template_data.property_set に想定値を反映
        if (hasFlatValues) {
          await templateDataRepo.updatePropertySetByPlan(
            organizationId,
            projectId,
            plan.method_id,
            plan.task_no,
            planFlatValues,
            'system', // チェックアウト処理はシステム操作
            client
          );
        }

        updatedCount++;
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // updatedCount === 0（planned_values が全て null）でも template_data のレコードは存在するため
    // XML 生成・MAIML 保存を必ず実行する（スキップしない）
    if (updatedCount > 0) {
      console.log(
        `[MaimlWriterService.writeExperimentPlanProperties] planned_values 反映完了: ${updatedCount}件`
      );
    } else {
      console.log(
        '[MaimlWriterService.writeExperimentPlanProperties] planned_values は全て null のため DB 更新なし。template_data のデータをそのまま XML に反映します。'
      );
    }

    // --- 4. 更新後の template_data を全件取得して <data> XML を再生成 ---
    const templateDataResult = await pool.query<TemplateDataRow>(
      `SELECT
         organization_id,
         project_id,
         method_id,
         task_no,
         place_id,
         property_set,
         create_user_id,
         update_user_id,
         create_at,
         update_at
       FROM template_data
       WHERE organization_id = $1
         AND project_id = $2
       ORDER BY method_id, task_no, place_id`,
      [organizationId, projectId]
    );
    const templateDataRows: TemplateDataRow[] = templateDataResult.rows;

    // --- 5. <data> ID を既存 XML から抽出 ---
    const dataIdMatch = maimlContent.match(/<data[^>]*\sid="([^"]+)"/);
    const dataId = dataIdMatch ? dataIdMatch[1] : 'dataID';

    // --- 6. 既存 MAIML から UUID マッピングを抽出（改竄防止: UUID 再利用）---
    const existingUuids = extractUuidsFromMaiml(maimlContent);

    // --- 7. <data> XML を生成して MAIML に埋め込む ---
    const dataXml = buildDataXML(templateDataRows, dataId, existingUuids);

    // <data> タグだけを置き換え（<eventLog> はそのまま保持）
    // replaceDataAndEventLogInMaiml は両方置き換えるため、<data> だけを手動で置換
    maimlContent = this._replaceDataSection(maimlContent, dataXml);

    // --- 7b. mgr-instruction:* 値を MAIML の <task><properties> セクションに注入 ---
    // experiment_plan.planned_values に含まれる mgr-instruction: プレフィックス付き値は
    // template_data.property_set には存在しないため buildDataXML() では書き込まれない。
    // _injectExperimentPlanProps() を使って各タスクの <properties> セクションに直接書き込む。
    if (mgrInstructionValuesMap.size > 0) {
      for (const plan of experimentPlans) {
        const planKey = `${plan.method_id}__${plan.task_no}`;
        const mgrValues = mgrInstructionValuesMap.get(planKey);
        if (!mgrValues || Object.keys(mgrValues).length === 0) continue;

        // task_no をゼロ埋め3桁文字列に変換（MAIML の taskNo 属性は "001" 形式）
        const taskNoStr = String(plan.task_no).padStart(3, '0');

        // 配列値は JSON 文字列化して <property value="..."> に格納する
        const serializedValues: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(mgrValues)) {
          // mgr-instruction: プレフィックスはキーに含まれているため、
          // _injectExperimentPlanProps 内でさらにプレフィックスが付かないよう
          // キーから mgr-instruction: を除去して渡す
          const bareKey = key.startsWith('mgr-instruction:') ? key.slice('mgr-instruction:'.length) : key;
          serializedValues[bareKey] = Array.isArray(val) ? JSON.stringify(val) : val;
        }

        maimlContent = this._injectExperimentPlanProps(
          maimlContent,
          plan.method_id,
          taskNoStr,
          serializedValues
        );
      }

      console.log(
        `[MaimlWriterService.writeExperimentPlanProperties] mgr-instruction 注入完了: ${mgrInstructionValuesMap.size}タスク`
      );
    }

    // ★ document の uuid を新規発行し、旧 uuid を <parent> に記録
    maimlContent = updateDocumentUuidAndParent(maimlContent);

    // --- 8. アーカイブ処理 ---
    try {
      const pathParts = filePath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const dirPath = pathParts.slice(0, -1).join('/');
      const baseName = fileName.replace(/\.maiml$/i, '');
      const archivePath = `${dirPath}/archive`;

      let maxVersion = 0;
      try {
        const archiveFiles = await storageService.listFiles(organizationId, archivePath);
        const pattern = new RegExp(
          `^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_v(\\d+)\\.maiml$`
        );
        archiveFiles.forEach((file: any) => {
          const name: string = (file.key || '').split('/').pop() ?? '';
          const match = name.match(pattern);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxVersion) maxVersion = num;
          }
        });
      } catch (_listErr) {
        // archiveフォルダが存在しない場合は v1 から開始
      }

      const newVersion = maxVersion + 1;
      const backupPath = `${archivePath}/${baseName}_v${newVersion}.maiml`;

      await storageService.uploadFile(
        organizationId,
        backupPath,
        fileBuffer,
        { contentType: 'application/xml', uploadedBy: 'system' }
      );

      console.log(
        `[MaimlWriterService.writeExperimentPlanProperties] アーカイブ作成: ${backupPath}`
      );
    } catch (archiveError) {
      console.warn(
        '[MaimlWriterService.writeExperimentPlanProperties] アーカイブ作成失敗（処理継続）:',
        archiveError
      );
    }

    // --- 9. 上書き保存 ---
    await storageService.uploadFile(
      organizationId,
      filePath,
      maimlContent,
      { contentType: 'application/xml', uploadedBy: 'system' }
    );

    console.log(
      `[MaimlWriterService.writeExperimentPlanProperties] MAIMLファイル更新完了（<results>層）: ` +
        `organizationId=${organizationId}, projectId=${projectId}, ` +
        `updatedTasks=${updatedCount}件, templateDataRows=${templateDataRows.length}件`
    );
  }

  /**
   * MAIML XML の <data> セクションのみを置き換える（内部メソッド）
   *
   * <eventLog> セクションは変更せず、<data> タグとその内容だけを新しい XML で置き換える。
   * <data> タグが存在しない場合は末尾（</maiml> 直前）に追加する。
   *
   * @param maimlContent - 元の MAIML XML 文字列
   * @param dataXml      - 新しい <data>...</data> XML 文字列
   * @returns 更新後の MAIML XML 文字列
   */
  private _replaceDataSection(maimlContent: string, dataXml: string): string {
    // <data ...>...</data> を正規表現で検索・置換
    const dataPattern = /<data[\s\S]*?<\/data>/i;
    if (dataPattern.test(maimlContent)) {
      return maimlContent.replace(dataPattern, dataXml);
    }
    // <data> タグが存在しない場合は </maiml> 直前に追加
    return maimlContent.replace(/<\/maiml>/i, `${dataXml}\n</maiml>`);
  }

  /**
   * MAIML XML 文字列内の指定メソッド・タスク番号に対応する <transition> ブロック内の
   * <properties> 要素に mgr-instruction: プレフィックス付き <property> を注入する（内部メソッド）
   *
   * @param maimlContent - 元の MAIML XML 文字列
   * @param methodId     - メソッドID（<method id="..."> の id 属性値）
   * @param taskNoStr    - タスク番号（3桁ゼロ埋め文字列）
   * @param values       - planned_values オブジェクト（キー → 値）
   * @returns 更新後の MAIML XML 文字列
   */
  private _injectExperimentPlanProps(
    maimlContent: string,
    methodId: string,
    taskNoStr: string,
    values: Record<string, unknown>
  ): string {
    // <properties> 内の既存 mgr-instruction: プロパティをすべて除去してから再挿入する
    // （冪等性を保つため）

    // planned_values のキー・値ペアを <property> XML に変換
    const propLines = Object.entries(values)
      .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
      .map(([key, value]) => {
        const escapedKey = key.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const escapedVal = String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
        return `        <property key="${escapedKey}" value="${escapedVal}"/>`;
      });

    if (propLines.length === 0) return maimlContent;

    const propsXml = propLines.join('\n');

    // task_no に対応する <task> の taskNo 属性で特定し、その中の <properties> に挿入
    // MAIML 構造: <method id="..."> → <program> → <task taskNo="001"> → <properties>
    // taskNo 属性の値を検索（ゼロ埋め3桁形式）
    const taskNoPattern = new RegExp(
      `(<task[^>]+taskNo="${taskNoStr}"[^>]*>(?:[\\s\\S]*?))(<\\/task>)`,
      'i'
    );

    const taskMatch = maimlContent.match(taskNoPattern);
    if (!taskMatch) {
      // task 要素が見つからない場合はスキップ（MAIML 構造が異なる可能性）
      console.warn(
        `[MaimlWriterService._injectExperimentPlanProps] taskNo="${taskNoStr}" の <task> 要素が見つかりません（methodId=${methodId}）`
      );
      return maimlContent;
    }

    // <properties> タグが存在する場合は既存 mgr-instruction: を除去後に挿入
    // 存在しない場合は </task> 直前に <properties>...</properties> を追加
    const propertiesPattern = /(<properties[^>]*>)([\s\S]*?)(<\/properties>)/i;

    maimlContent = maimlContent.replace(taskNoPattern, (fullMatch, taskBody, closeTag) => {
      const propertiesMatch = taskBody.match(propertiesPattern);

      if (propertiesMatch) {
        // 既存 <properties> 内の mgr-instruction: / Alchemia:SupervisorDirective プロパティを除去
        const cleanedBody = taskBody.replace(
          /[ \t]*<property[^>]+key="(?:mgr-instruction:|Alchemia:SupervisorDirective)[^"]*"[^>]*\/>[ \t]*\n?/gi,
          ''
        );
        // </properties> 直前に挿入
        const updatedBody = cleanedBody.replace(
          propertiesPattern,
          (_pm: string, openTag: string, innerContent: string, closePropsTag: string) =>
            `${openTag}${innerContent}\n${propsXml}\n      ${closePropsTag}`
        );
        return `${updatedBody}${closeTag}`;
      } else {
        // <properties> が存在しない → </task> 直前に新規追加
        const newProps = `\n      <properties>\n${propsXml}\n      </properties>\n    `;
        return `${taskBody}${newProps}${closeTag}`;
      }
    });

    return maimlContent;
  }

  /**
   * MAIML の `<document>` タグ内に作業者の `<owner>` タグを追記して保存する。
   *
   * 同一 id の `<owner>` が既に存在する場合はスキップ（重複防止）。
   * MAIML ファイルが存在しない場合は処理をスキップする（エラーにしない）。
   *
   * @param organizationId - 組織ID（マルチテナント分離）
   * @param projectId      - プロジェクトID
   * @param projectName    - プロジェクト名（S3 パス生成に使用）
   * @param userId         - 追記するユーザーID（元の形式: `@` 含む可）
   * @param userName       - 追記するユーザー名
   */
  async appendOwnerToDocument(
    organizationId: string,
    projectId: string,
    projectName: string,
    userId: string,
    userName: string
  ): Promise<void> {
    const storageService = getStorageService();

    // userId を MAIML owner id 仕様に合わせて @ → _ 変換
    const ownerId = userId.replace(/@/g, '_');

    try {
      // MAIML ファイルパスを解決
      const filePath = await resolveMaimlFilePath(organizationId, projectId, projectName);

      // MAIML ファイルをダウンロード
      let maimlBuffer: Buffer;
      try {
        maimlBuffer = await storageService.downloadFile(organizationId, filePath);
      } catch {
        console.log(
          `[MaimlWriterService.appendOwnerToDocument] MAIMLファイルが存在しないためスキップ: ${filePath}`
        );
        return;
      }

      const maimlContent = maimlBuffer.toString('utf-8');

      // <owner> を追記（同一 id 存在時はスキップ）
      const updatedMaiml = appendOwnerToDocument(maimlContent, ownerId, userName);

      // 変更がなければアップロードスキップ
      if (updatedMaiml === maimlContent) {
        console.log(
          `[MaimlWriterService.appendOwnerToDocument] Owner(id=${ownerId}) は既に存在するためスキップ`
        );
        return;
      }

      // MAIML ファイルを上書き保存
      const uploadBuffer = Buffer.from(updatedMaiml, 'utf-8');
      await storageService.uploadFile(organizationId, filePath, uploadBuffer, { contentType: 'application/xml' });

      console.log(
        `[MaimlWriterService.appendOwnerToDocument] Owner(id=${ownerId}) を追記しました: ${filePath}`
      );
    } catch (error) {
      // エラーはメイン処理に影響させず警告ログのみ
      console.warn(
        `[MaimlWriterService.appendOwnerToDocument] Owner追記に失敗しました（処理継続）:`,
        error
      );
    }
  }
}
