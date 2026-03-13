/**
 * MaiML 公開 Worker
 *
 * @description
 *   maiml-publish キューからジョブを取得し、
 *   MaiML ファイルを解析して組織スキーマへ格納する。
 *
 * 処理フロー:
 *   1. maiml_publish_job を running に更新
 *   2. Swift/S3 から MaiML XML をダウンロード
 *   3. maimlIngestParserService でパース
 *   4. 組織スキーマが存在しなければ作成
 *   5. 旧アセットがあれば CASCADE DELETE
 *   6. maiml_asset INSERT → instance / element / template … INSERT
 *   7. maiml_publish_job を done に更新（asset_id 設定）
 *   エラー時: maiml_publish_job を error に更新
 *
 * @reference docs/MaiML_OpenData_Pipeline/spec.md §9.2
 */

import { Worker, Job }          from 'bullmq';
import { createBullRedisConnection } from '../config/redis';
import { MAIML_PUBLISH_QUEUE_NAME }  from '../queues/maimlPublishQueue';
import { maimlUnpublishQueue }       from '../queues/maimlUnpublishQueue';
import * as publishJobRepo           from '../repositories/maimlPublishJobRepository';
import * as assetRepo                from '../repositories/maimlAssetRepository';
import * as orgRepo                  from '../repositories/organizationRepository';
import { getStorageService }         from '../services/storageService';
import { maimlIngestParserService }  from '../services/maimlIngestParserService';
import { PublishJobData, UnpublishJobData } from '../types/maimlOpenData';

// ============================================================
// Worker インスタンス
// ============================================================

let publishWorker: Worker<PublishJobData> | null = null;

/**
 * MaiML 公開 Worker を起動する
 */
export function startMaimlPublishWorker(): Worker<PublishJobData> {
  publishWorker = new Worker<PublishJobData>(
    MAIML_PUBLISH_QUEUE_NAME,
    async (job: Job<PublishJobData>) => {
      const { jobId, organizationId, projectName, fileUri } = job.data;

      console.info(`[maimlPublishWorker] 開始 job_id=${jobId}`, {
        organizationId,
        projectName,
        fileUri,
      });

      // ── 1. ジョブ状態を running に更新 ──────────────────
      await publishJobRepo.updateStatus(jobId, 'running', {
        started_at: new Date(),
      });

      try {
        // ── 2. MaiML XML をダウンロード ───────────────────
        const storage = getStorageService();
        const xmlBuffer = await storage.downloadFile(organizationId, fileUri);
        const xmlString = xmlBuffer.toString('utf-8');

        // ── 3. パース ──────────────────────────────────────
        const parsed = await maimlIngestParserService.parseForIngest(xmlString);

        // ── 4. 組織スキーマ初期化（冪等）──────────────────
        const org = await orgRepo.findById(organizationId);
        if (!org) {
          throw new Error(`Organization not found: ${organizationId}`);
        }
        const schemaExists = await assetRepo.schemaExists(organizationId);
        if (!schemaExists) {
          await assetRepo.createSchemaIfNotExists(organizationId, org.organization_cd);
          await assetRepo.createSchemaTables(organizationId);
        }

        // ── 5. 旧アセットがあれば削除 ─────────────────────
        const oldAsset = await assetRepo.findByProject(organizationId, projectName);
        if (oldAsset?.asset_id !== undefined) {
          await assetRepo.deleteAsset(organizationId, oldAsset.asset_id);
        }

        // ── 6. 新アセット INSERT ───────────────────────────
        // retention_until: 組織設定の default_retention_days 日後（デフォルト 30 日）
        const retentionDays = org.default_retention_days ?? 30;
        const retentionUntil = new Date();
        retentionUntil.setDate(retentionUntil.getDate() + retentionDays);

        const asset = await assetRepo.insertAsset(organizationId, {
          file_uri:        fileUri,
          doc_name:        parsed.docName ?? null,
          retention_until: retentionUntil,
        });
        const assetId = asset.asset_id!;

        // ── 6a. instance → element → element_value → insertion ──
        // instance_key → instance_id マップ（parent element_id 解決用）
        const instanceIdMap = new Map<string, bigint>();
        for (const inst of parsed.instances) {
          const row = await assetRepo.insertInstance(organizationId, {
            asset_id:          assetId,
            instance_type:     inst.instance_type,
            instance_key:      inst.instance_key,
            template_ref:      inst.template_ref ?? null,
            instance_uuid:     inst.instance_uuid ?? null,
            instance_name:     inst.instance_name ?? null,
            instance_line_no:  inst.instance_line_no ?? null,
          });
          instanceIdMap.set(inst.instance_key, row.instance_id!);
        }

        // _tempId → 実 element_id マップ
        const elementIdMap = new Map<number, bigint>();
        for (const elem of parsed.elements) {
          const instanceId = instanceIdMap.get(elem._instanceKey);
          if (!instanceId) continue;

          const parentId = elem._tempParentId != null
            ? (elementIdMap.get(elem._tempParentId) ?? null)
            : null;

          const row = await assetRepo.insertElement(organizationId, {
            instance_id:        instanceId,
            parent_element_id:  parentId,
            hierarchy:          elem.hierarchy,
            element_type:       elem.element_type,
            description:        elem.description ?? null,
            element_data:       elem.element_data ?? null,
            hash_method:        elem.hash_method ?? null,
            xsi_type:           elem.xsi_type ?? null,
            key:                elem.key ?? null,
            format_string:      elem.format_string ?? null,
            units:              elem.units ?? null,
            scale_factor:       elem.scale_factor ?? null,
            axis:               elem.axis ?? null,
            size_value:         elem.size_value ?? null,
            element_id_attr:    elem.element_id_attr ?? null,
            element_ref:        elem.element_ref ?? null,
            maiml_line_no:      elem.maiml_line_no ?? null,
          });
          elementIdMap.set(elem._tempId, row.element_id!);
        }

        // element_value
        for (const val of parsed.elementValues) {
          const elementId = elementIdMap.get(val._tempElementId);
          if (!elementId) continue;
          await assetRepo.insertElementValue(organizationId, {
            element_id:  elementId,
            value_idx:   val.value_idx,
            value:       val.value ?? null,
            value_array: val.value_array ?? null,
          });
        }

        // insertion
        for (const ins of parsed.insertions) {
          const instanceId = instanceIdMap.get(ins._instanceKey);
          if (!instanceId) continue;
          await assetRepo.insertInsertion(organizationId, {
            instance_id:  instanceId,
            uri:          ins.uri,
            hash_value:   ins.hash_value ?? null,
            hash_method:  ins.hash_method ?? null,
            file_uuid:    ins.file_uuid ?? null,
            mime_format:  ins.mime_format ?? null,
            maiml_line_no: ins.maiml_line_no ?? null,
          });
        }

        // ── 6b. template → template_element → value → insertion ──
        const templateIdMap = new Map<string, bigint>();
        for (const tmpl of parsed.templates) {
          const row = await assetRepo.insertTemplate(organizationId, {
            asset_id:          assetId,
            template_type:     tmpl.template_type,
            template_key:      tmpl.template_key,
            template_uuid:     tmpl.template_uuid ?? null,
            template_name:     tmpl.template_name ?? null,
            template_line_no:  tmpl.template_line_no ?? null,
          });
          templateIdMap.set(tmpl.template_key, row.template_id!);
        }

        const tmplElementIdMap = new Map<number, bigint>();
        for (const elem of parsed.templateElements) {
          const templateId = templateIdMap.get(elem._templateKey);
          if (!templateId) continue;

          const parentId = elem._tempParentId != null
            ? (tmplElementIdMap.get(elem._tempParentId) ?? null)
            : null;

          const row = await assetRepo.insertTemplateElement(organizationId, {
            template_id:        templateId,
            parent_element_id:  parentId,
            hierarchy:          elem.hierarchy,
            element_type:       elem.element_type,
            description:        elem.description ?? null,
            element_data:       elem.element_data ?? null,
            hash_method:        elem.hash_method ?? null,
            xsi_type:           elem.xsi_type ?? null,
            key:                elem.key ?? null,
            format_string:      elem.format_string ?? null,
            units:              elem.units ?? null,
            scale_factor:       elem.scale_factor ?? null,
            axis:               elem.axis ?? null,
            size_value:         elem.size_value ?? null,
            element_id_attr:    elem.element_id_attr ?? null,
            element_ref:        elem.element_ref ?? null,
            maiml_line_no:      elem.maiml_line_no ?? null,
          });
          tmplElementIdMap.set(elem._tempId, row.element_id!);
        }

        for (const val of parsed.templateElementValues) {
          const elementId = tmplElementIdMap.get(val._tempElementId);
          if (!elementId) continue;
          await assetRepo.insertTemplateElementValue(organizationId, {
            element_id:  elementId,
            value_idx:   val.value_idx,
            value:       val.value ?? null,
            value_array: val.value_array ?? null,
          });
        }

        for (const ins of parsed.templateInsertions) {
          const templateId = templateIdMap.get(ins._templateKey);
          if (!templateId) continue;
          await assetRepo.insertTemplateInsertion(organizationId, {
            template_id:  templateId,
            uri:          ins.uri,
            hash_value:   ins.hash_value ?? null,
            hash_method:  ins.hash_method ?? null,
            file_uuid:    ins.file_uuid ?? null,
            mime_format:  ins.mime_format ?? null,
            maiml_line_no: ins.maiml_line_no ?? null,
          });
        }

        // ── 6c. retention_until 時刻に自動非公開 delayed Job を登録 ──
        const delayMs = retentionUntil.getTime() - Date.now();
        await maimlUnpublishQueue.add(
          'auto-unpublish',
          {
            jobId:          `auto-unpublish-${assetId}`,
            organizationId,
            projectName,
            assetId,
            triggerType:    'schedule',
          } satisfies UnpublishJobData,
          {
            jobId:  `unpublish-${assetId}`,  // 重複登録防止（bullmq の jobId 重複チェック）
            delay:  Math.max(delayMs, 0),
          }
        );
        console.info(
          `[maimlPublishWorker] delayed Job 登録完了 asset_id=${assetId} delay=${Math.max(delayMs, 0)}ms`
        );

        // ── 7. ジョブを done に更新 ────────────────────────
        await publishJobRepo.updateStatus(jobId, 'done', {
          finished_at: new Date(),
          asset_id:    assetId,
        });

        console.info(`[maimlPublishWorker] 完了 job_id=${jobId} asset_id=${assetId}`);

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[maimlPublishWorker] エラー job_id=${jobId}`, message);

        await publishJobRepo.updateStatus(jobId, 'error', {
          finished_at:   new Date(),
          error_message: message,
        });

        throw err; // bullmq にリトライさせる
      }
    },
    {
      connection:  createBullRedisConnection(),
      concurrency: 2,
    },
  );

  publishWorker.on('completed', (job) => {
    console.info(`[maimlPublishWorker] ジョブ完了 job_id=${job.id}`);
  });

  publishWorker.on('failed', (job, err) => {
    console.error(`[maimlPublishWorker] ジョブ失敗 job_id=${job?.id}`, err.message);
  });

  publishWorker.on('error', (err) => {
    console.error('[maimlPublishWorker] Worker エラー:', err.message);
  });

  console.info('[maimlPublishWorker] 起動完了');
  return publishWorker;
}

/**
 * MaiML 公開 Worker を停止する
 */
export async function stopMaimlPublishWorker(): Promise<void> {
  if (publishWorker) {
    await publishWorker.close();
    publishWorker = null;
    console.info('[maimlPublishWorker] 停止完了');
  }
}
