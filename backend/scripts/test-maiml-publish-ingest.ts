/**
 * MaiML 公開 DB 登録処理テストスクリプト
 *
 * @description
 *   画面・キュー・Swift/S3 を使わずに、公開処理のコア（パース → DB登録）を
 *   直接テストするためのスクリプト。
 *
 *   処理フロー（maimlPublishWorker と同等の登録処理を再現）:
 *     1. 仮スキーマ（TEST_ORG_ID）のスキーマ・テーブルを作成（なければ）
 *     2. 同一プロジェクトの旧アセットがあれば CASCADE DELETE
 *     3. docs/MaiML_OpenData_Pipeline/sample/XRF.maiml を読み込みパース
 *     4. maiml_asset INSERT
 *     5. instance / element / element_value / insertion INSERT
 *     6. template / template_element / template_element_value / template_insertion INSERT
 *     7. event / event_element / event_element_value INSERT
 *     8. 各テーブルの登録件数を表示して結果確認
 *
 * @usage
 *   npx ts-node backend/scripts/test-maiml-publish-ingest.ts [organization_id]
 *
 * @example
 *   # デフォルト仮 org_id で実行
 *   npx ts-node backend/scripts/test-maiml-publish-ingest.ts
 *
 *   # 実際の org_id を指定して実行
 *   npx ts-node backend/scripts/test-maiml-publish-ingest.ts 2068841e-8014-4fed-8a2a-f83aef26b71e
 *
 * @note
 *   - デフォルトの TEST_ORG_ID は本番組織と衝突しない仮の UUID を使用
 *   - スクリプト実行後はスキーマが残り続けるため、不要になったら手動で DROP SCHEMA ～ CASCADE
 *   - 再実行時は旧アセットを自動削除してから再挿入する（冪等）
 */

import * as dotenv from 'dotenv';
import * as path   from 'path';
import * as fs     from 'fs';

// .env 読み込み（backend/.env）
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { initializePool, closePool, getPgp } from '../src/database/db';
import { maimlIngestParserService }           from '../src/services/maimlIngestParserService';
import * as assetRepo                         from '../src/repositories/maimlAssetRepository';

// ============================================================
// 設定
// ============================================================

/**
 * テスト用仮組織 ID
 * 本番データと衝突しないよう専用の UUID を使用する
 * コマンドライン引数で上書き可能
 */
const DEFAULT_TEST_ORG_ID = '00000000-0000-4fed-8a2a-000000000001';

const ORG_ID       = process.argv[2] || DEFAULT_TEST_ORG_ID;
const PROJECT_NAME = 'XRF_test_project';
const FILE_URI     = `projects/${PROJECT_NAME}/XRF.maiml`;

/** 保持期間: テスト用に 365 日 */
const RETENTION_DAYS = 365;

/** サンプル MAIML ファイルパス */
const SAMPLE_MAIML_PATH = path.resolve(
  __dirname,
  '../../docs/MaiML_OpenData_Pipeline/sample/XRF.maiml'
);

// ============================================================
// ユーティリティ
// ============================================================

function hr(label = '') {
  const line = '─'.repeat(60);
  console.log(label ? `\n${line}\n  ${label}\n${line}` : `\n${line}`);
}

function ok(msg: string) {
  console.log(`  ✅ ${msg}`);
}

function info(msg: string) {
  console.log(`  ℹ️  ${msg}`);
}

// ============================================================
// 登録件数確認ヘルパー
// ============================================================

async function countRows(schemaName: string, tableName: string): Promise<number> {
  const pgp = getPgp();
  // schemaName は validateSchemaName() を通した安全な値のみ想定
  const row = await pgp.one<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM "${schemaName}"."${tableName}"`
  );
  return parseInt(row.cnt, 10);
}

// ============================================================
// メイン
// ============================================================

async function main() {
  hr('MaiML 公開 DB 登録テストスクリプト');
  console.log(`  organization_id : ${ORG_ID}`);
  console.log(`  project_name    : ${PROJECT_NAME}`);
  console.log(`  file_uri        : ${FILE_URI}`);
  console.log(`  sample file     : ${SAMPLE_MAIML_PATH}`);

  // ── DB 接続 ──────────────────────────────────────────
  hr('Step 0: DB 接続確認');
  initializePool();
  const pgp = getPgp();
  await pgp.one('SELECT 1 AS ok');
  ok('DB 接続成功');

  const schemaName = assetRepo.toSchemaName(ORG_ID);
  info(`スキーマ名: "${schemaName}"`);

  // ── Step 1: スキーマ・テーブル作成 ────────────────────
  hr('Step 1: 仮スキーマ・テーブル初期化');

  const schemaAlreadyExists = await assetRepo.schemaExists(ORG_ID);
  if (schemaAlreadyExists) {
    // DDL 変更を反映するため、テスト用スキーマは毎回 DROP して再作成する
    info(`スキーマ "${schemaName}" が既に存在します → DROP CASCADE して再作成します`);
    await getPgp().none(`DROP SCHEMA "${schemaName}" CASCADE`);
    ok(`スキーマ "${schemaName}" を DROP しました`);
  }

  // テスト用なので org_id 文字列をそのまま organization_cd に渡す
  await assetRepo.createSchemaIfNotExists(ORG_ID, `test_org_${ORG_ID}`);
  ok(`スキーマ "${schemaName}" を作成しました`);

  await assetRepo.createSchemaTables(ORG_ID);
  ok('テーブル作成完了');

  // ── Step 2: 旧アセット削除（冪等実行のため） ──────────
  hr('Step 2: 旧アセット削除（冪等化）');

  const oldAsset = await assetRepo.findByProject(ORG_ID, PROJECT_NAME);
  if (oldAsset?.asset_id !== undefined) {
    await assetRepo.deleteAsset(ORG_ID, oldAsset.asset_id);
    ok(`旧アセット asset_id=${oldAsset.asset_id} を削除しました`);
  } else {
    info('旧アセットなし（スキップ）');
  }

  // ── Step 3: MAIML ファイル読み込み ──────────────────
  hr('Step 3: MAIML ファイル読み込み & パース');

  if (!fs.existsSync(SAMPLE_MAIML_PATH)) {
    throw new Error(`サンプルファイルが見つかりません: ${SAMPLE_MAIML_PATH}`);
  }

  const xmlString = fs.readFileSync(SAMPLE_MAIML_PATH, 'utf-8');
  ok(`ファイル読み込み完了 (${xmlString.length.toLocaleString()} bytes)`);

  const parsed = maimlIngestParserService.parseForIngest(xmlString);
  ok('パース完了');
  console.log(`     doc_name           : ${parsed.docName ?? '(null)'}`);
  console.log(`     instances          : ${parsed.instances.length}`);
  console.log(`     elements           : ${parsed.elements.length}`);
  console.log(`     elementValues      : ${parsed.elementValues.length}`);
  console.log(`     insertions         : ${parsed.insertions.length}`);
  console.log(`     templates          : ${parsed.templates.length}`);
  console.log(`     templateElements   : ${parsed.templateElements.length}`);
  console.log(`     templateElementValues : ${parsed.templateElementValues.length}`);
  console.log(`     templateInsertions : ${parsed.templateInsertions.length}`);
  console.log(`     events             : ${parsed.events.length}`);
  console.log(`     eventElements      : ${parsed.eventElements.length}`);
  console.log(`     eventElementValues : ${parsed.eventElementValues.length}`);

  // ── Step 4: maiml_asset INSERT ──────────────────────
  hr('Step 4: maiml_asset INSERT');

  const retentionUntil = new Date();
  retentionUntil.setDate(retentionUntil.getDate() + RETENTION_DAYS);

  const asset = await assetRepo.insertAsset(ORG_ID, {
    file_uri:        FILE_URI,
    doc_name:        parsed.docName ?? null,
    retention_until: retentionUntil,
  });
  const assetId = asset.asset_id!;
  ok(`maiml_asset INSERT 完了  asset_id=${assetId}`);
  info(`  file_uri       : ${asset.file_uri}`);
  info(`  doc_name       : ${asset.doc_name ?? '(null)'}`);
  info(`  retention_until: ${retentionUntil.toISOString()}`);

  // ── Step 5a: instance → element → element_value → insertion ──
  hr('Step 5: instance / element / element_value / insertion INSERT');

  const instanceIdMap = new Map<string, bigint>();
  for (const inst of parsed.instances) {
    const row = await assetRepo.insertInstance(ORG_ID, {
      asset_id:          assetId,
      instance_type:     inst.instance_type,
      instance_key:      inst.instance_key,
      template_ref:      inst.template_ref      ?? null,
      instance_uuid:     inst.instance_uuid     ?? null,
      instance_name:     inst.instance_name     ?? null,
      instance_line_no:  inst.instance_line_no  ?? null,
    });
    instanceIdMap.set(inst.instance_key, row.instance_id!);
  }
  ok(`maiml_instance INSERT: ${instanceIdMap.size} 件`);

  const elementIdMap = new Map<number, bigint>();
  for (const elem of parsed.elements) {
    const instanceId = instanceIdMap.get(elem._instanceKey);
    if (!instanceId) {
      console.warn(`  ⚠️  instance_key "${elem._instanceKey}" が見つかりません（スキップ）`);
      continue;
    }
    const parentId = elem._tempParentId != null
      ? (elementIdMap.get(elem._tempParentId) ?? null)
      : null;

    const row = await assetRepo.insertElement(ORG_ID, {
      instance_id:        instanceId,
      parent_element_id:  parentId,
      hierarchy:          elem.hierarchy,
      element_type:       elem.element_type,
      description:        elem.description       ?? null,
      element_data:       elem.element_data      ?? null,
      hash_method:        elem.hash_method       ?? null,
      xsi_type:           elem.xsi_type          ?? null,
      key:                elem.key               ?? null,
      format_string:      elem.format_string     ?? null,
      units:              elem.units             ?? null,
      scale_factor:       elem.scale_factor      ?? null,
      axis:               elem.axis              ?? null,
      size_value:         elem.size_value        ?? null,
      element_id_attr:    elem.element_id_attr   ?? null,
      element_ref:        elem.element_ref       ?? null,
      maiml_line_no:      elem.maiml_line_no     ?? null,
    });
    elementIdMap.set(elem._tempId, row.element_id!);
  }
  ok(`maiml_element INSERT: ${elementIdMap.size} 件`);

  let elementValueCount = 0;
  for (const val of parsed.elementValues) {
    const elementId = elementIdMap.get(val._tempElementId);
    if (!elementId) continue;
    await assetRepo.insertElementValue(ORG_ID, {
      element_id:  elementId,
      value_idx:   val.value_idx,
      value:       val.value       ?? null,
      value_array: val.value_array ?? null,
    });
    elementValueCount++;
  }
  ok(`maiml_element_value INSERT: ${elementValueCount} 件`);

  let insertionCount = 0;
  for (const ins of parsed.insertions) {
    const instanceId = instanceIdMap.get(ins._instanceKey);
    if (!instanceId) continue;
    await assetRepo.insertInsertion(ORG_ID, {
      instance_id:  instanceId,
      uri:          ins.uri,
      hash_value:   ins.hash_value   ?? null,
      hash_method:  ins.hash_method  ?? null,
      file_uuid:    ins.file_uuid    ?? null,
      mime_format:  ins.mime_format  ?? null,
      maiml_line_no: ins.maiml_line_no ?? null,
    });
    insertionCount++;
  }
  ok(`maiml_insertion INSERT: ${insertionCount} 件`);

  // ── Step 6: template → template_element → template_element_value → template_insertion ──
  hr('Step 6: template / template_element / ... INSERT');

  const templateIdMap = new Map<string, bigint>();
  for (const tmpl of parsed.templates) {
    const row = await assetRepo.insertTemplate(ORG_ID, {
      asset_id:          assetId,
      template_type:     tmpl.template_type,
      template_key:      tmpl.template_key,
      template_uuid:     tmpl.template_uuid     ?? null,
      template_name:     tmpl.template_name     ?? null,
      template_line_no:  tmpl.template_line_no  ?? null,
    });
    templateIdMap.set(tmpl.template_key, row.template_id!);
  }
  ok(`maiml_template INSERT: ${templateIdMap.size} 件`);

  const tmplElementIdMap = new Map<number, bigint>();
  for (const elem of parsed.templateElements) {
    const templateId = templateIdMap.get(elem._templateKey);
    if (!templateId) continue;
    const parentId = elem._tempParentId != null
      ? (tmplElementIdMap.get(elem._tempParentId) ?? null)
      : null;

    const row = await assetRepo.insertTemplateElement(ORG_ID, {
      template_id:        templateId,
      parent_element_id:  parentId,
      hierarchy:          elem.hierarchy,
      element_type:       elem.element_type,
      description:        elem.description       ?? null,
      element_data:       elem.element_data      ?? null,
      hash_method:        elem.hash_method       ?? null,
      xsi_type:           elem.xsi_type          ?? null,
      key:                elem.key               ?? null,
      format_string:      elem.format_string     ?? null,
      units:              elem.units             ?? null,
      scale_factor:       elem.scale_factor      ?? null,
      axis:               elem.axis              ?? null,
      size_value:         elem.size_value        ?? null,
      element_id_attr:    elem.element_id_attr   ?? null,
      element_ref:        elem.element_ref       ?? null,
      maiml_line_no:      elem.maiml_line_no     ?? null,
    });
    tmplElementIdMap.set(elem._tempId, row.element_id!);
  }
  ok(`maiml_template_element INSERT: ${tmplElementIdMap.size} 件`);

  let tmplValueCount = 0;
  for (const val of parsed.templateElementValues) {
    const elementId = tmplElementIdMap.get(val._tempElementId);
    if (!elementId) continue;
    await assetRepo.insertTemplateElementValue(ORG_ID, {
      element_id:  elementId,
      value_idx:   val.value_idx,
      value:       val.value       ?? null,
      value_array: val.value_array ?? null,
    });
    tmplValueCount++;
  }
  ok(`maiml_template_element_value INSERT: ${tmplValueCount} 件`);

  let tmplInsertionCount = 0;
  for (const ins of parsed.templateInsertions) {
    const templateId = templateIdMap.get(ins._templateKey);
    if (!templateId) continue;
    await assetRepo.insertTemplateInsertion(ORG_ID, {
      template_id:  templateId,
      uri:          ins.uri,
      hash_value:   ins.hash_value   ?? null,
      hash_method:  ins.hash_method  ?? null,
      file_uuid:    ins.file_uuid    ?? null,
      mime_format:  ins.mime_format  ?? null,
      maiml_line_no: ins.maiml_line_no ?? null,
    });
    tmplInsertionCount++;
  }
  ok(`maiml_template_insertion INSERT: ${tmplInsertionCount} 件`);

  // ── Step 7: event → event_element → event_element_value ──
  hr('Step 7: event / event_element / event_element_value INSERT');

  const eventIdByIndex = new Map<number, bigint>();
  for (let i = 0; i < parsed.events.length; i++) {
    const ev = parsed.events[i];
    const row = await assetRepo.insertEvent(ORG_ID, {
      asset_id:        assetId,
      event_key:       ev.event_key       ?? null,
      results_ref:     ev.results_ref     ?? null,
      instruction_ref: ev.instruction_ref ?? null,
      event_uuid:      ev.event_uuid      ?? null,
      event_name:      ev.event_name      ?? null,
      description:     ev.description     ?? null,
      annotation:      ev.annotation      ?? null,
      maiml_line_no:   ev.maiml_line_no   ?? null,
    });
    eventIdByIndex.set(i, row.event_id!);
  }
  ok(`maiml_event INSERT: ${eventIdByIndex.size} 件`);

  const eventElementIdByIndex = new Map<number, bigint>();
  for (let j = 0; j < parsed.eventElements.length; j++) {
    const ee = parsed.eventElements[j];
    const eventId = eventIdByIndex.get(ee._eventIndex);
    if (!eventId) continue;
    const row = await assetRepo.insertEventElement(ORG_ID, {
      event_id:      eventId,
      hierarchy:     ee.hierarchy,
      element_type:  ee.element_type,
      key:           ee.key           ?? null,
      description:   ee.description   ?? null,
      maiml_line_no: ee.maiml_line_no ?? null,
    });
    eventElementIdByIndex.set(j, row.event_element_id!);
  }
  ok(`maiml_event_element INSERT: ${eventElementIdByIndex.size} 件`);

  let eventValueCount = 0;
  for (const ev of parsed.eventElementValues) {
    const eventElementId = eventElementIdByIndex.get(ev._eventElementIndex);
    if (!eventElementId) continue;
    await assetRepo.insertEventElementValue(ORG_ID, {
      event_element_id: eventElementId,
      value_idx:        ev.value_idx,
      value:            ev.value       ?? null,
      value_array:      ev.value_array ?? null,
    });
    eventValueCount++;
  }
  ok(`maiml_event_element_value INSERT: ${eventValueCount} 件`);

  // ── Step 8: 結果確認（各テーブルの件数） ─────────────
  hr('Step 8: DB 登録結果確認');

  const tables = [
    'maiml_asset',
    'maiml_instance',
    'maiml_element',
    'maiml_element_value',
    'maiml_insertion',
    'maiml_template',
    'maiml_template_element',
    'maiml_template_element_value',
    'maiml_template_insertion',
    'maiml_event',
    'maiml_event_element',
    'maiml_event_element_value',
  ];

  console.log('');
  console.log('  テーブル名                          件数');
  console.log('  ' + '─'.repeat(50));
  for (const tbl of tables) {
    const cnt = await countRows(schemaName, tbl);
    const padded = tbl.padEnd(36);
    console.log(`  ${padded} ${cnt.toLocaleString().padStart(6)} 件`);
  }

  // ── asset 詳細確認 ───────────────────────────────────
  hr('登録済みアセット詳細');
  const registeredAsset = await assetRepo.findByProject(ORG_ID, PROJECT_NAME);
  if (registeredAsset) {
    console.log(`  asset_id       : ${registeredAsset.asset_id}`);
    console.log(`  file_uri       : ${registeredAsset.file_uri}`);
    console.log(`  doc_name       : ${registeredAsset.doc_name ?? '(null)'}`);
    console.log(`  retention_until: ${registeredAsset.retention_until}`);
    console.log(`  created_at     : ${registeredAsset.created_at}`);
  }

  hr('✅ テスト完了');
  console.log(`  スキーマ: "${schemaName}"`);
  console.log('');
  console.log('  ▶ 再実行（冪等）:');
  console.log(`     npx ts-node backend/scripts/test-maiml-publish-ingest.ts ${ORG_ID}`);
  console.log('');
  console.log('  ▶ テスト用スキーマの削除（不要になった場合）:');
  console.log(`     DROP SCHEMA "${schemaName}" CASCADE;`);
  console.log('');
}

main()
  .catch((err) => {
    console.error('\n❌ エラーが発生しました:', err);
    process.exit(1);
  })
  .finally(async () => {
    await closePool();
  });
