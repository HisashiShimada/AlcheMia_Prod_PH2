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

import { getPool } from '../database/db';
import { loadSqlFile } from '../sql/loader';
import { getStorageService } from './storageService';
import type { ExperimentPlan } from '../types/database';
import type { TemplateDataRow } from '../repositories/templateDataRepository';
import type { EventLogJsonRecord } from '../utils/maimlDataWriter';
import {
  buildDataXML,
  buildEventLogXML,
  replaceDataAndEventLogInMaiml,
  replaceEventLogInMaiml,
  updateDocumentUuidAndParent,
  injectNamespaceDeclarations,
} from '../utils/maimlDataWriter';
import { extractUuidsFromMaiml } from '../utils/maimlUuidExtractor';
import { resolveMaimlFilePath } from '../utils/maimlPathResolver';
import { findNamespacesByOrganization } from '../repositories/namespaceTermRepository';
import { readGlobalDeclarations } from './globalNamespaceFileService';

/**
 * 組織固有名前空間（DB）とグローバル名前空間（ファイルサーバ）をマージして返す
 *
 * @param organizationId - 組織ID
 * @returns マージされた名前空間エントリ配列（グローバル優先、組織固有が後勝ち）
 */
async function buildMergedNamespaces(
  organizationId: string
): Promise<Array<{ prefix: string; uri: string }>> {
  const [orgNamespaces, globalDeclarations] = await Promise.all([
    findNamespacesByOrganization(organizationId),
    readGlobalDeclarations(),
  ]);
  return [...globalDeclarations, ...orgNamespaces];
}

/**
 * maiml_event_log テーブルの1行
 * (log カラムのみ使用するため最小限の型定義)
 */
interface EventLogRow {
  sequence_no: number;
  log: EventLogJsonRecord;
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

    // --- 4. maiml_event_log を全件取得（プロジェクト単位）---
    // sequence_no 昇順で取得してイベントの発生順序を保持する
    const findAllEventLogSql = await loadSqlFile('event_log/findAllByProject.sql');
    const eventLogResult = await pool.query<EventLogRow>(
      findAllEventLogSql,
      [organizationId, projectId]
    );
    const eventLogRows: EventLogRow[] = eventLogResult.rows;

    // log カラムの JSONB オブジェクトのみを抽出
    const logJsonArray: EventLogJsonRecord[] = eventLogRows.map((row) => row.log);

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
    // DB（組織固有）とファイルサーバ（グローバル）の2ソースをマージして完全上書き
    const allNamespaces = await buildMergedNamespaces(organizationId);
    updatedMaiml = injectNamespaceDeclarations(updatedMaiml, allNamespaces);

    // ★ document の uuid を新規発行し、旧 uuid を <parent> に記録
    updatedMaiml = updateDocumentUuidAndParent(updatedMaiml);

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

    // log カラムの JSONB オブジェクトのみを抽出
    const logJsonArray: EventLogJsonRecord[] = eventLogRows.map((row) => row.log);

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
    // DB（組織固有）とファイルサーバ（グローバル）の2ソースをマージして完全上書き
    const allNamespaces = await buildMergedNamespaces(organizationId);
    updatedMaiml = injectNamespaceDeclarations(updatedMaiml, allNamespaces);

    // ★ document の uuid を新規発行し、旧 uuid を <parent> に記録
    updatedMaiml = updateDocumentUuidAndParent(updatedMaiml);

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
   * チェックアウト時に実験計画データを MAIML の <properties> 要素として書き込む
   *
   * experiment_plan テーブルの planned_values を
   * `mgr-instruction:` プレフィックス付きの <property> 要素として
   * 各タスクの <transition> ブロック内に挿入する。
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

    // --- 3. 各実験計画レコードを MAIML に書き込み ---
    // planned_values が null の場合はスキップ
    let updatedCount = 0;
    for (const plan of experimentPlans) {
      if (!plan.planned_values) continue;

      // <transition id="{method_id}_{task_no:0埋め3桁}"> を検索してプロパティを挿入
      // task_no を3桁ゼロ埋めした形式（例: task_no=1 → "001"）
      const taskNoStr = String(plan.task_no).padStart(3, '0');
      // transition id パターン: "{methodId}_{taskNoStr}" もしくは任意の形式
      // MAIMLの <transition> 要素を task_no で特定するため、
      // <properties> 要素内に mgr-instruction: プレフィックスのプロパティを挿入する
      maimlContent = this._injectExperimentPlanProps(
        maimlContent,
        plan.method_id,
        taskNoStr,
        plan.planned_values as Record<string, unknown>
      );
      updatedCount++;
    }

    if (updatedCount === 0) {
      console.log(
        '[MaimlWriterService.writeExperimentPlanProperties] 書き込み対象の計画値なし、スキップ'
      );
      return;
    }

    // ★ document の uuid を新規発行し、旧 uuid を <parent> に記録
    maimlContent = updateDocumentUuidAndParent(maimlContent);

    // --- 4. アーカイブ処理 ---
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

    // --- 5. 上書き保存 ---
    await storageService.uploadFile(
      organizationId,
      filePath,
      maimlContent,
      { contentType: 'application/xml', uploadedBy: 'system' }
    );

    console.log(
      `[MaimlWriterService.writeExperimentPlanProperties] MAIMLファイル更新完了: ` +
        `organizationId=${organizationId}, projectId=${projectId}, ` +
        `updatedTasks=${updatedCount}件`
    );
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
        return `        <property key="mgr-instruction:${escapedKey}" value="${escapedVal}"/>`;
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
        // 既存 <properties> 内の mgr-instruction: プロパティを除去
        const cleanedBody = taskBody.replace(
          /[ \t]*<property[^>]+key="mgr-instruction:[^"]*"[^>]*\/>[ \t]*\n?/gi,
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
}
