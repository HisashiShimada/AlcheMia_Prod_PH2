/**
 * MAIMLファイル data層・eventLog層 書き出しユーティリティ
 *
 * 実験作業者が記録した template_data / maiml_event_log テーブルのデータを
 * MAIMLファイルの <data> 層と <eventLog> 層に書き出す関数群を提供します。
 *
 * 参考実装:
 *   frontend/src/reference/components/PetriNetEditorV2/utils/converters/reactFlowToMaiml.js
 *   の buildDataXML() 関数を TypeScript 移植
 */

import { randomUUID } from 'crypto';
import type { TemplateDataRow } from '../repositories/templateDataRepository';
import { resolveUuid } from './maimlUuidExtractor';
import type { ExperimentPlan } from '../types/database';


// ============================================================
// 型定義
// ============================================================

/**
 * maiml_event_log テーブルの log カラム（JSONB）の型
 *
 * PLAN 6-2 に記載の2パターンに対応:
 *   - パターンA: insertTransitionProgressLog() 生成JSON
 *     → eventLog > log > trace > event > property[]
 *   - パターンB: insertInstructionConfirmLog() 生成JSON
 *     → eventLog > log > trace > evnet > property[]
 *     → instruction_target=1 の場合: eventLog > log + evnet（log外）
 *
 * DB上の JSON キーには "@id", "@ref", "#text" のような記号が含まれるが、
 * TypeScript インターフェースの変数名には記号を使用できないため
 * Record<string, unknown> で表現する。
 */
export type EventLogJsonRecord = Record<string, unknown>;

// ============================================================
// XML エスケープユーティリティ
// ============================================================

/**
 * XML特殊文字をエスケープ
 * reference JS版 escapeXml() の移植
 */
export function escapeXml(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================================
// buildDataXML
// ============================================================

/**
 * template_data レコードから MAIML <data> XML 文字列を生成
 *
 * reference JS版 buildDataXML() の TypeScript 移植。
 * TemplateDataRow[] を受け取り、propertySet.templateType ごとに
 * <material> / <condition> / <result> 要素を出力する。
 *
 * @param rows          - template_data テーブルの全レコード（プロジェクト単位）
 * @param dataId        - data 要素の id 属性値（デフォルト: 'dataID'）
 * @param existingUuids - 既存 MAIMLから抽出した UUID マップ（extractUuidsFromMaiml() の戻り値）
 *                        指定した場合、同じ識別キーを持つ要素には既存 UUID を再利用する。
 *                        省略した場合は毎回 randomUUID() で生成する。
 * @returns `<data id="...">...</data>` の XML 文字列（末尾改行あり）
 */
export function buildDataXML(
  rows: TemplateDataRow[],
  dataId: string = 'dataID',
  existingUuids?: Map<string, string>,
  resultsIdSuffix: string = '_actual'
): string {
  // property_set が null のレコードは除外
  const validRows = rows.filter(
    (row) => row.property_set !== null && row.property_set !== undefined
  );

  if (validRows.length === 0) {
    const emptyResultsId = `results_${dataId}`;
    return [
      `<data id="${escapeXml(dataId)}">`,
      `    <uuid>${resolveUuid('data', existingUuids, randomUUID)}</uuid>`,
      `    <results id="${escapeXml(emptyResultsId)}">`,
      `      <uuid>${resolveUuid(`results:${emptyResultsId}`, existingUuids, randomUUID)}</uuid>`,
      `    </results>`,
      `  </data>`,
      '',
    ].join('\n');
  }

  // ── method_id × task_no ごとにグルーピング ─────────────────────────────
  // maimlWriterService.ts が ORDER BY method_id, task_no, place_id で取得するため
  // Map のキー挿入順がそのままグループの出力順になる
  const groupMap = new Map<string, TemplateDataRow[]>();
  for (const row of validRows) {
    const key = `${row.method_id}\x00${row.task_no}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(row);
  }

  let dataXml = `<data id="${escapeXml(dataId)}">\n`;
  dataXml += `    <uuid>${resolveUuid('data', existingUuids, randomUUID)}</uuid>\n`;

  // グループごとに <results> タグを1つ生成
  for (const [, groupRows] of groupMap) {
    // グループ内の最初のレコードから method_id / task_no を取得
    const { method_id, task_no } = groupRows[0];

    // results タグの id: "results_{method_id}_{task_no}{suffix}"
    // suffix を付与することで planned_values 由来の <results> と区別できる
    const resultsId = `results_${escapeXml(method_id)}_${task_no}${resultsIdSuffix}`;

    dataXml += `    <results id="${resultsId}">\n`;
    dataXml += `      <uuid>${resolveUuid(`results:${resultsId}`, existingUuids, randomUUID)}</uuid>\n`;

    // グループ内レコードを templateType 別に分類
    const materialRows: TemplateDataRow[] = [];
    const conditionRows: TemplateDataRow[] = [];
    const resultRows: TemplateDataRow[] = [];

    for (const row of groupRows) {
      const ps = row.property_set!;
      if (ps.templateType === 'material') {
        materialRows.push(row);
      } else if (ps.templateType === 'condition') {
        conditionRows.push(row);
      } else if (ps.templateType === 'result') {
        resultRows.push(row);
      }
    }

    // material → condition → result の順に出力（reference JS版と同順）
    const categoryPairs: Array<{ category: string; categoryRows: TemplateDataRow[] }> = [
      { category: 'material', categoryRows: materialRows },
      { category: 'condition', categoryRows: conditionRows },
      { category: 'result', categoryRows: resultRows },
    ];

    for (const { category, categoryRows } of categoryPairs) {
      categoryRows.forEach((row, index) => {
        const ps = row.property_set!;

        // インスタンスID: place_id に "data-" プレフィックスを付与して pnml <place> ID との重複を回避
        // <protocol>/<pnml> 内の <place id="material-xxx"> と同一 ID になると
        // Duplicate ID バリデーションエラーが発生するため、data セクションは常に "data-" を付ける。
        const instanceId = row.place_id
          ? `data-${row.place_id}`
          : `data-${category}_instance_${index}`;
        // ref: templateId をテンプレート参照として使用
        const templateRef = ps.templateId || '';

        dataXml += `      <${category} id="${escapeXml(instanceId)}" ref="${escapeXml(templateRef)}">\n`;
        dataXml += `        <uuid>${resolveUuid(`${category}:${instanceId}`, existingUuids, randomUUID)}</uuid>\n`;

        // プロパティを出力（propertyListType のネスト子要素に対応した再帰関数を使用）
        if (ps.properties && Array.isArray(ps.properties)) {
          for (const prop of ps.properties) {
            dataXml += buildPropertyXML(prop as unknown as Record<string, unknown>, 4);
          }
        }

        // ps.insertions を <insertion> タグとして出力（カスタムプロパティの insertion コンテナ）
        // MAIML仕様: <insertion xsi:type="insertion"> <uri/> [<hash/>] <format/> </insertion>
        // ※ insertion タグに key 属性はない
        if (ps.insertions && Array.isArray(ps.insertions)) {
          for (const ins of ps.insertions) {
            if (!ins) continue;
            const uri = String(ins.uri ?? '');
            if (!uri) continue; // uri が空の場合はスキップ
            dataXml += `        <insertion>\n`;
            dataXml += `          <uri>${escapeXml(uri)}</uri>\n`;
            // hash は { method?, value? } オブジェクト または 文字列（後方互換）
            if (ins.hash) {
              const hashVal = typeof ins.hash === 'object' ? ins.hash.value : ins.hash;
              if (hashVal) dataXml += `          <hash>${escapeXml(hashVal)}</hash>\n`;
            }
            dataXml += `          <format>${escapeXml(String(ins.format ?? 'application/octet-stream'))}</format>\n`;
            dataXml += `        </insertion>\n`;
          }
        }

        // ps.contents を <content> タグとして出力（カスタムプロパティの content コンテナ）
        // xsi:type: contentStringListType / contentDoubleListType / contentIntListType
        // buildContentXML() を使用して子 property / 子 content も再帰的に出力する
        if (ps.contents && Array.isArray(ps.contents)) {
          for (const c of ps.contents) {
            dataXml += buildContentXML(c as unknown as Record<string, unknown>, 4);
          }
        }

  // operatorId は data 層から出力しない（案C: 削除）
  // 作成者情報は eventLog 層（trace/event）で管理する

        dataXml += `      </${category}>\n`;
      });
    }

    dataXml += `    </results>\n`;
  }

  dataXml += `  </data>\n`;
  return dataXml;
}


// ============================================================
// buildEventLogXML
// ============================================================

/**
 * maiml_event_log テーブルの全レコード log カラム（JSONB）から
 * MAIML <eventLog> XML 文字列を生成
 *
 * 各レコードの log カラム（JSONB）を読み取り、
 * "@" プレフィックスを属性に、"#text" をテキストノードに変換して XML 化する。
 *
 * PLAN 6-2 記載の2パターンに対応:
 *   - パターンA: insertTransitionProgressLog() 生成 JSON（event 要素）
 *   - パターンB: insertInstructionConfirmLog() 生成 JSON（evnet 要素）
 *
 * @param logJsonArray  - maiml_event_log.log カラムの JSON オブジェクト配列
 * @param eventLogId    - eventLog 要素の id 属性値（デフォルト: 'eventLogID'）
 * @param existingUuids - 既存 MAIMLから抽出した UUID マップ（extractUuidsFromMaiml() の戻り値）
 *                        指定した場合、同じ識別キーを持つ要素には既存 UUID を再利用する。
 *                        省略した場合は毎回 randomUUID() で生成する。
 * @returns `<eventLog id="...">...</eventLog>` の XML 文字列（末尾改行あり）
 */
export function buildEventLogXML(
  logJsonArray: EventLogJsonRecord[],
  eventLogId: string = 'eventLogID',
  existingUuids?: Map<string, string>
): string {
  // ── eventLog UUID の変化検出 ────────────────────────────────────────────
  // logJsonArray 内の log @id セットと、existingUuids 内の log:* セットを比較し
  // 差分があれば新規UUID払い出し、差分なしなら既存UUID再利用する。
  const newLogIds = new Set(
    logJsonArray.flatMap((logJson) => {
      const eventLogObj = logJson['eventLog'] as Record<string, unknown> | undefined;
      if (!eventLogObj) return [];
      const rawLog = eventLogObj['log'];
      const entries: Record<string, unknown>[] = Array.isArray(rawLog)
        ? (rawLog as Record<string, unknown>[])
        : rawLog
        ? [rawLog as Record<string, unknown>]
        : [];
      return entries.map((e) => e['@id'] as string).filter(Boolean);
    })
  );

  const existingLogIds = new Set(
    [...(existingUuids?.keys() ?? [])]
      .filter((k) => k.startsWith('log:'))
      .map((k) => k.slice(4))
  );

  const hasChanges =
    [...newLogIds].some((id) => !existingLogIds.has(id)) ||
    [...existingLogIds].some((id) => !newLogIds.has(id));

  // 変化ありなら新規UUID、変化なしなら既存UUID再利用
  const eventLogUuidValue = hasChanges
    ? randomUUID()
    : resolveUuid('eventLog', existingUuids, randomUUID);

  if (!logJsonArray || logJsonArray.length === 0) {
    // XSD準拠: eventLogType は log が必須（minOccurs=1）のため最小構造を返す
    const emptyLogId = `log_${eventLogId}_empty`;
    return [
      `  <eventLog id="${escapeXml(eventLogId)}">`,
      `    <uuid>${eventLogUuidValue}</uuid>`,
      `    <log id="${escapeXml(emptyLogId)}" ref="${escapeXml(emptyLogId)}">`,
      `      <uuid>${resolveUuid(`log:${emptyLogId}`, existingUuids, randomUUID)}</uuid>`,
      `      <trace id="${escapeXml(emptyLogId)}_trace" ref="${escapeXml(emptyLogId)}_trace">`,
      `        <uuid>${resolveUuid(`trace:${emptyLogId}_trace`, existingUuids, randomUUID)}</uuid>`,
      `        <event id="${escapeXml(emptyLogId)}_event" ref="${escapeXml(emptyLogId)}_event">`,
      `          <uuid>${resolveUuid(`event:${emptyLogId}_event`, existingUuids, randomUUID)}</uuid>`,
      `        </event>`,
      `      </trace>`,
      `    </log>`,
      `  </eventLog>`,
      '',
    ].join('\n');
  }

  // XSD準拠: eventLogType の globalObjectContentGroup に uuid が必須
  let xml = `  <eventLog id="${escapeXml(eventLogId)}">\n`;
  xml += `    <uuid>${eventLogUuidValue}</uuid>\n`;
  // name / description は eventLog タグには付与しない
  // （MAIML上1つしか存在できないため、特定処理に紐づいた値を設定することができない）

  for (const logJson of logJsonArray) {
    const eventLogObj = logJson['eventLog'] as Record<string, unknown> | undefined;
    if (!eventLogObj) continue;

    // log エントリ（単体または配列）
    const rawLog = eventLogObj['log'];
    const logEntries: Record<string, unknown>[] = rawLog
      ? Array.isArray(rawLog)
        ? (rawLog as Record<string, unknown>[])
        : [rawLog as Record<string, unknown>]
      : [];

    // eventLog 直下の property（全体評価など eventLog 層に直接記載するケース）
    // globalObjectContentGroup 順序: uuid → property → log の順で出力する
    const eventLogRawProperty = eventLogObj['property'];
    if (eventLogRawProperty) {
      const eventLogProperties: Record<string, unknown>[] = Array.isArray(eventLogRawProperty)
        ? (eventLogRawProperty as Record<string, unknown>[])
        : [eventLogRawProperty as Record<string, unknown>];
      xml += buildPropertiesXML(eventLogProperties, 2);
    }

    for (const logEntry of logEntries) {
      xml += buildLogEntryXML(logEntry, existingUuids);
    }

    // instruction_target=1 のパターンB: log 外の evnet
    const topLevelEvnet = eventLogObj['evnet'] as Record<string, unknown> | undefined;
    if (topLevelEvnet) {
      xml += buildEvnetXML(topLevelEvnet, 2, existingUuids);
    }

    // eventLog 直下の ownerRef（XSD 外だが全体評価で使用）
    const eventLogOwnerRef = eventLogObj['ownerRef'];
    if (eventLogOwnerRef) {
      xml += buildOwnerRefXML(eventLogOwnerRef, 2);
    }
  }

  xml += `  </eventLog>\n`;
  return xml;
}

/**
 * <log> 要素の XML を生成
 */
function buildLogEntryXML(
  logEntry: Record<string, unknown>,
  existingUuids?: Map<string, string>
): string {
  const id = logEntry['@id'] as string | undefined;
  // ref は XSD 上必須（ref: string）のため常に出力する。
  // '@ref' キーが存在しない場合（target=1: ファイル全体指示）は空文字を使用する。
  const ref = (logEntry['@ref'] as string | undefined) ?? '';

  let attrs = '';
  if (id) attrs += ` id="${escapeXml(id)}"`;
  attrs += ` ref="${escapeXml(ref)}"`;

  let xml = `    <log${attrs}>\n`;
  // XSD準拠: logType の globalObjectContentGroup に uuid が必須
  xml += `      <uuid>${resolveUuid(id ? `log:${id}` : 'log', existingUuids, randomUUID)}</uuid>\n`;

  // name / description（lifecycle:transition 系 eventLog 共通ルール: eventlog_structure.md 2-2）
  const logName = logEntry['name'] as string | undefined;
  const logDesc = logEntry['description'] as string | undefined;
  if (logName) xml += `      <name>${escapeXml(logName)}</name>\n`;
  if (logDesc) xml += `      <description>${escapeXml(logDesc)}</description>\n`;

  // trace（単体または配列）
  const rawTrace = logEntry['trace'];
  const traces: Record<string, unknown>[] = rawTrace
    ? Array.isArray(rawTrace)
      ? (rawTrace as Record<string, unknown>[])
      : [rawTrace as Record<string, unknown>]
    : [];

  for (const trace of traces) {
    xml += buildTraceXML(trace, existingUuids);
  }

  // log 直下の property（METHOD 評価など log 層に直接記載するケース）
  const logRawProperty = logEntry['property'];
  if (logRawProperty) {
    const logProperties: Record<string, unknown>[] = Array.isArray(logRawProperty)
      ? (logRawProperty as Record<string, unknown>[])
      : [logRawProperty as Record<string, unknown>];
    xml += buildPropertiesXML(logProperties, 3);
  }

  // log 直下の ownerRef（XSD 準拠: logType は ownerRef を持てる）
  const logOwnerRef = logEntry['ownerRef'];
  if (logOwnerRef) {
    xml += buildOwnerRefXML(logOwnerRef, 3);
  }

  xml += `    </log>\n`;
  return xml;
}

/**
 * <trace> 要素の XML を生成
 */
function buildTraceXML(
  trace: Record<string, unknown>,
  existingUuids?: Map<string, string>
): string {
  const id = trace['@id'] as string | undefined;
  // XSD準拠: traceType の ref は use="required" → 必須出力（なければ id を代用）
  const ref = (trace['@ref'] as string | undefined)
    ?? (trace['@id'] as string | undefined)
    ?? '';
  const taskno = trace['@taskno'] as string | undefined;

  let attrs = '';
  if (id) attrs += ` id="${escapeXml(id)}"`;
  attrs += ` ref="${escapeXml(ref)}"`;
  // taskno は XSD 外属性だが互換性のために維持
  if (taskno) attrs += ` taskno="${escapeXml(taskno)}"`;

  let xml = `      <trace${attrs}>\n`;
  // XSD準拠: traceType の globalObjectContentGroup に uuid が必須
  xml += `        <uuid>${resolveUuid(id ? `trace:${id}` : 'trace', existingUuids, randomUUID)}</uuid>\n`;

  // name / description（lifecycle:transition 系 eventLog 共通ルール: eventlog_structure.md 2-2）
  const traceName = trace['name'] as string | undefined;
  const traceDesc = trace['description'] as string | undefined;
  if (traceName) xml += `        <name>${escapeXml(traceName)}</name>\n`;
  if (traceDesc) xml += `        <description>${escapeXml(traceDesc)}</description>\n`;

  // パターンA: event 要素
  const eventObj = trace['event'] as Record<string, unknown> | undefined;
  if (eventObj) {
    xml += buildEventXML(eventObj, existingUuids);
  }

  // パターンB: evnet 要素（MAIMLスキーマのスペルミスをそのまま使用）
  // 注意: traceType の XSD は event を必須（minOccurs=1）とするが、
  //       MAIMLスキーマ本体のtypoを踏襲する設計のため XSD バリデーションはスキップ
  const evnetObj = trace['evnet'] as Record<string, unknown> | undefined;
  if (evnetObj) {
    xml += buildEvnetXML(evnetObj, 4, existingUuids);
  }

  // trace 直下の property（TASK 評価など trace 層に直接記載するケース）
  const traceRawProperty = trace['property'];
  if (traceRawProperty) {
    const traceProperties: Record<string, unknown>[] = Array.isArray(traceRawProperty)
      ? (traceRawProperty as Record<string, unknown>[])
      : [traceRawProperty as Record<string, unknown>];
    xml += buildPropertiesXML(traceProperties, 4);
  }

  // trace 直下の ownerRef（XSD 準拠: traceType は ownerRef を持てる）
  const traceOwnerRef = trace['ownerRef'];
  if (traceOwnerRef) {
    xml += buildOwnerRefXML(traceOwnerRef, 4);
  }

  xml += `      </trace>\n`;
  return xml;
}

/**
 * <event> 要素の XML を生成（パターンA: 作業進捗）
 */
function buildEventXML(
  eventObj: Record<string, unknown>,
  existingUuids?: Map<string, string>
): string {
  const id = eventObj['@id'] as string | undefined;
  // XSD準拠: eventType の ref は use="required" → 必須出力（なければ id を代用）
  const ref = (eventObj['@ref'] as string | undefined)
    ?? (eventObj['@id'] as string | undefined)
    ?? '';

  let attrs = '';
  if (id) attrs += ` id="${escapeXml(id)}"`;
  attrs += ` ref="${escapeXml(ref)}"`;

  const rawProperty = eventObj['property'];
  const properties: Record<string, unknown>[] = rawProperty
    ? Array.isArray(rawProperty)
      ? (rawProperty as Record<string, unknown>[])
      : [rawProperty as Record<string, unknown>]
    : [];

  // resultsRef: data層の result-type place ID を参照する要素
  // DB JSON では { '@ref': placeId } 形式（単体 or 配列）
  const rawResultsRef = eventObj['resultsRef'];
  const resultsRefList: Record<string, unknown>[] = rawResultsRef
    ? Array.isArray(rawResultsRef)
      ? (rawResultsRef as Record<string, unknown>[])
      : [rawResultsRef as Record<string, unknown>]
    : [];

  let xml = `        <event${attrs}>\n`;
  // XSD準拠: eventType の globalObjectContentGroup に uuid が必須
  xml += `          <uuid>${resolveUuid(id ? `event:${id}` : 'event', existingUuids, randomUUID)}</uuid>\n`;

  // name / description（lifecycle:transition 系 eventLog 共通ルール: eventlog_structure.md 2-2）
  const eventName = eventObj['name'] as string | undefined;
  const eventDesc = eventObj['description'] as string | undefined;
  if (eventName) xml += `          <name>${escapeXml(eventName)}</name>\n`;
  if (eventDesc) xml += `          <description>${escapeXml(eventDesc)}</description>\n`;

  xml += buildPropertiesXML(properties, 5);

  // resultsRef 要素の出力（存在する場合のみ）
  // data セクションの <result> ID は "data-" プレフィックス付きで生成されるため、
  // DB に保存された ref 値（place_id そのもの）にも同じプレフィックスを付与して参照を一致させる。
  for (const rr of resultsRefList) {
    const rrRef = rr['@ref'] as string | undefined;
    if (rrRef !== undefined) {
      const normalizedRef = rrRef.startsWith('data-') ? rrRef : `data-${rrRef}`;
      xml += `          <resultsRef ref="${escapeXml(normalizedRef)}"/>\n`;
    }
  }

  // event 直下の ownerRef（XSD 準拠: eventType は ownerRef を持てる）
  const eventOwnerRef = eventObj['ownerRef'];
  if (eventOwnerRef) {
    xml += buildOwnerRefXML(eventOwnerRef, 5);
  }

  xml += `        </event>\n`;
  return xml;
}

/**
 * <evnet> 要素の XML を生成（パターンB: 指示確認）
 * インデントレベルを引数で指定可能（log外evnet=2、trace内evnet=4）
 *
 * @remarks XSD準拠: evnetType は globalObjectContentGroup を継承するため uuid が必須
 */
function buildEvnetXML(
  evnetObj: Record<string, unknown>,
  indentLevel: number,
  existingUuids?: Map<string, string>
): string {
  const indent = '  '.repeat(indentLevel);
  const id = evnetObj['@id'] as string | undefined;
  const ref = evnetObj['@ref'] as string | undefined;

  let attrs = '';
  if (id) attrs += ` id="${escapeXml(id)}"`;
  if (ref) attrs += ` ref="${escapeXml(ref)}"`;

  const rawProperty = evnetObj['property'];
  const properties: Record<string, unknown>[] = rawProperty
    ? Array.isArray(rawProperty)
      ? (rawProperty as Record<string, unknown>[])
      : [rawProperty as Record<string, unknown>]
    : [];

  let xml = `${indent}<evnet${attrs}>\n`;
  // XSD準拠: globalObjectContentGroup に uuid が必須
  xml += `${indent}  <uuid>${resolveUuid(id ? `evnet:${id}` : 'evnet', existingUuids, randomUUID)}</uuid>\n`;
  xml += buildPropertiesXML(properties, indentLevel + 1);
  xml += `${indent}</evnet>\n`;
  return xml;
}

/**
 * <content> 要素を1つ生成（子 property / 子 content に再帰対応）
 *
 * value は ContentRowListInput の変更により string[] 配列で渡される。
 * 後方互換としてスペース区切り文字列も受け入れる。
 *
 * @param c           - content オブジェクト（property_set.contents の1要素、または子 content）
 * @param indentLevel - インデントレベル（material/condition/result の直下なら 4）
 * @param depth       - 再帰深さ（無限ループ防止。最大 10）
 * @returns <content ...>...</content> の XML 文字列
 */
function buildContentXML(
  c: Record<string, unknown>,
  indentLevel: number,
  depth: number = 0
): string {
  const MAX_DEPTH = 10;
  if (!c || !c['key']) return '';

  const indent = '  '.repeat(indentLevel);
  const childIndent = '  '.repeat(indentLevel + 1);

  const contentType = (c['xsiType'] as string | undefined) || 'contentDoubleListType';

  let xml = `${indent}<content key="${escapeXml(c['key'])}"`;
  if (c['units']) xml += ` units="${escapeXml(c['units'])}"`;
  xml += ` xsi:type="${escapeXml(contentType)}">\n`;

  if (c['description']) {
    xml += `${childIndent}<description>${escapeXml(c['description'])}</description>\n`;
  }

  // value は string[]（ContentRowListInput 対応）または後方互換の文字列
  const rawVal = c['value'];
  const items: string[] = Array.isArray(rawVal)
    ? (rawVal as unknown[]).map((v) => String(v))
    : typeof rawVal === 'string' && rawVal.trim().length > 0
    ? rawVal.trim().split(/[\s,]+/).filter((s) => s.length > 0)
    : [];
  for (const item of items) {
    xml += `${childIndent}<value>${escapeXml(item)}</value>\n`;
  }

  // 子 property を再帰的に出力（MAIML XSD で content 内に property が入れ子になる場合に対応）
  if (depth < MAX_DEPTH) {
    const childProperties = c['properties'];
    if (Array.isArray(childProperties)) {
      for (const childProp of childProperties) {
        if (childProp && typeof childProp === 'object') {
          xml += buildPropertyXML(childProp as Record<string, unknown>, indentLevel + 1, depth + 1);
        }
      }
    }

    // 子 content を再帰的に出力
    const childContents = c['contents'];
    if (Array.isArray(childContents)) {
      for (const cc of childContents) {
        if (cc && typeof cc === 'object') {
          xml += buildContentXML(cc as Record<string, unknown>, indentLevel + 1, depth + 1);
        }
      }
    }
  }

  xml += `${indent}</content>\n`;
  return xml;
}

/**
 * <property> 要素を1つ生成（propertyListType のネスト子要素に再帰対応）
 *
 * template_data の property_set.properties[] の各要素を受け取り、
 * xsi:type が propertyListType の場合は子 property / 子 content を再帰的に出力する。
 *
 * @param prop        - プロパティオブジェクト（property_set.properties の1要素）
 * @param indentLevel - インデントレベル（material/condition/result の直下なら 4）
 * @param depth       - 再帰深さ（無限ループ防止。最大 10）
 * @returns <property ...>...</property> の XML 文字列
 */
function buildPropertyXML(
  prop: Record<string, unknown>,
  indentLevel: number,
  depth: number = 0
): string {
  const MAX_DEPTH = 10;
  if (!prop || !prop['key']) return '';

  const indent = '  '.repeat(indentLevel);
  const childIndent = '  '.repeat(indentLevel + 1);

  // xsi:type フォールバック（未設定時は stringType）
  const propType = (prop['xsiType'] as string | undefined) || 'stringType';
  const key = prop['key'] as string;

  let xml = `${indent}<property key="${escapeXml(key)}"`;

  // カスタム属性を動的出力（xsiType / units / formatString / scaleFactor は個別処理）
  if (prop['attributes'] && typeof prop['attributes'] === 'object') {
    for (const [attrName, attrValue] of Object.entries(prop['attributes'] as Record<string, unknown>)) {
      if (attrName !== 'xsi:type' && attrValue) {
        xml += ` ${attrName}="${escapeXml(attrValue)}"`;
      }
    }
  }

  // units
  if (prop['units']) {
    xml += ` units="${escapeXml(prop['units'])}"`;
  }

  // formatString
  if (prop['formatString']) {
    xml += ` formatString="${escapeXml(prop['formatString'])}"`;
  }

  // scaleFactor
  if (prop['scaleFactor'] !== undefined && prop['scaleFactor'] !== null) {
    xml += ` scaleFactor="${escapeXml(String(prop['scaleFactor']))}"`;
  }

  // xsi:type は最後に出力
  xml += ` xsi:type="${escapeXml(propType)}"`;
  xml += `>\n`;

  // description（value より前に出力）
  if (prop['description']) {
    xml += `${childIndent}<description>${escapeXml(prop['description'])}</description>\n`;
  }

  // propertyListType の場合は value を出力せず、子 property / 子 content を再帰出力
  if (propType === 'propertyListType') {
    if (depth < MAX_DEPTH) {
      // 子 property を再帰的に出力
      const childProperties = prop['properties'];
      if (Array.isArray(childProperties)) {
        for (const childProp of childProperties) {
          if (childProp && typeof childProp === 'object') {
            xml += buildPropertyXML(childProp as Record<string, unknown>, indentLevel + 1, depth + 1);
          }
        }
      }

      // 子 content を buildContentXML() で出力（再帰・string[] 対応）
      const childContents = prop['contents'];
      if (Array.isArray(childContents)) {
        for (const c of childContents) {
          if (!c || typeof c !== 'object') continue;
          xml += buildContentXML(c as Record<string, unknown>, indentLevel + 1, depth + 1);
        }
      }
    }
  } else {
    // 通常プロパティ: value を出力（null / undefined / 空文字は出力しない）
    const propValue = prop['value'];
    if (propValue !== null && propValue !== undefined && propValue !== '') {
      xml += `${childIndent}<value>${escapeXml(String(propValue))}</value>\n`;
    }

    // uncertainties: planned_values から注入された不確かさ基準を <uncertainty> タグとして出力
    // 構造: [{ key, xsiType, units, value, description }, ...]
    if (prop['uncertainties'] && Array.isArray(prop['uncertainties'])) {
      for (const uc of prop['uncertainties'] as Record<string, unknown>[]) {
        if (!uc || typeof uc !== 'object') continue;
        const ucKey = uc['key'] as string | undefined;
        if (!ucKey) continue;

        let ucAttrs = ` key="${escapeXml(ucKey)}"`;
        if (uc['xsiType']) ucAttrs += ` xsi:type="${escapeXml(String(uc['xsiType']))}"`;
        if (uc['units']) ucAttrs += ` units="${escapeXml(String(uc['units']))}"`;

        xml += `${childIndent}<uncertainty${ucAttrs}>\n`;
        // value
        const ucValue = uc['value'];
        if (ucValue !== null && ucValue !== undefined && ucValue !== '') {
          xml += `${childIndent}  <value>${escapeXml(String(ucValue))}</value>\n`;
        }
        // description
        const ucDesc = uc['description'];
        if (ucDesc !== null && ucDesc !== undefined && ucDesc !== '') {
          xml += `${childIndent}  <description>${escapeXml(String(ucDesc))}</description>\n`;
        }
        xml += `${childIndent}</uncertainty>\n`;
      }
    }

    // uncertainty（単数形）: 実験作業者が入力した定性評価選択値・定性評価理由を
    // <uncertainty> タグとして転記する。
    // 構造: [{ key, xsiType, units, value（定性評価選択値）, description（定性評価理由）, ... }, ...]
    // - value と description がどちらも空の場合は出力しない（元の空タグ状態を維持）
    // - uncertainties（複数形）との重複出力を避けるため、uncertainties に同一キーが存在しない
    //   エントリのみ出力する
    if (prop['uncertainty'] && Array.isArray(prop['uncertainty'])) {
      // uncertainties（複数形）に既に出力済みのキーを収集
      const alreadyOutputKeys = new Set<string>();
      if (Array.isArray(prop['uncertainties'])) {
        for (const uc of prop['uncertainties'] as Record<string, unknown>[]) {
          const k = uc?.['key'] as string | undefined;
          if (k) alreadyOutputKeys.add(k);
        }
      }
      // 同一キーの重複エントリは先頭1件のみ処理（MAIMLに2件定義されている場合の安全策）
      const processedKeys = new Set<string>();
      for (const uc of prop['uncertainty'] as Record<string, unknown>[]) {
        if (!uc || typeof uc !== 'object') continue;
        const ucKey = uc['key'] as string | undefined;
        if (!ucKey) continue;
        // uncertainties（複数形）で既に出力済みのキーはスキップ
        if (alreadyOutputKeys.has(ucKey)) continue;
        // 同一キーの重複エントリは先頭1件のみ出力
        if (processedKeys.has(ucKey)) continue;
        processedKeys.add(ucKey);

        const ucValue = uc['value'];
        const ucDesc  = uc['description'];
        const hasValue = ucValue !== null && ucValue !== undefined && ucValue !== '';
        const hasDesc  = ucDesc  !== null && ucDesc  !== undefined && ucDesc  !== '';
        // value も description も空の場合は出力しない
        if (!hasValue && !hasDesc) continue;

        let ucAttrs = ` key="${escapeXml(ucKey)}"`;
        if (uc['xsiType']) ucAttrs += ` xsi:type="${escapeXml(String(uc['xsiType']))}"`;
        if (uc['units'])   ucAttrs += ` units="${escapeXml(String(uc['units']))}"`;

        xml += `${childIndent}<uncertainty${ucAttrs}>\n`;
        if (hasValue) {
          xml += `${childIndent}  <value>${escapeXml(String(ucValue))}</value>\n`;
        }
        if (hasDesc) {
          xml += `${childIndent}  <description>${escapeXml(String(ucDesc))}</description>\n`;
        }
        xml += `${childIndent}</uncertainty>\n`;
      }
    }

    // customElements（任意の追加要素）
    if (prop['customElements'] && typeof prop['customElements'] === 'object') {
      for (const [elemName, customElem] of Object.entries(prop['customElements'] as Record<string, unknown>)) {
        if (customElem && typeof customElem === 'object') {
          const ce = customElem as Record<string, unknown>;
          if (ce['value'] !== undefined && ce['value'] !== '') {
            let elemXml = `${childIndent}<${elemName}`;
            if (ce['attributes'] && typeof ce['attributes'] === 'object') {
              for (const [aName, aVal] of Object.entries(ce['attributes'] as Record<string, unknown>)) {
                if (aVal) elemXml += ` ${aName}="${escapeXml(aVal)}"`;
              }
            }
            elemXml += `>${escapeXml(String(ce['value']))}</${elemName}>\n`;
            xml += elemXml;
          }
        }
      }
    }
  }

  xml += `${indent}</property>\n`;
  return xml;
}

/**
 * <property> 要素群の XML を生成
 *
 * @param properties  - プロパティオブジェクトの配列（DB JSON 由来）
 * @param indentLevel - インデントレベル
 */
/**
 * <ownerRef> 要素（単体または配列）の XML を生成
 *
 * DB JSON での形式:
 *   単体: { '@id': 'ownerRef_xxx', '@ref': 'userId' }
 *   配列: [{ '@id': 'ownerRef_xxx_1', '@ref': 'userId1' }, ...]
 *
 * @param ownerRefValue - ownerRef オブジェクト（単体 or 配列）
 * @param indentLevel   - インデントレベル（eventLog直下=2, log直下=3, trace直下=4, event直下=5）
 * @returns <ownerRef .../> の XML 文字列
 */
function buildOwnerRefXML(
  ownerRefValue: unknown,
  indentLevel: number
): string {
  const indent = '  '.repeat(indentLevel);
  const items: Record<string, unknown>[] = Array.isArray(ownerRefValue)
    ? (ownerRefValue as Record<string, unknown>[])
    : [ownerRefValue as Record<string, unknown>];

  let xml = '';
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const id  = item['@id']  as string | undefined;
    const ref = item['@ref'] as string | undefined;
    if (!ref) continue;

    let attrs = '';
    if (id) attrs += ` id="${escapeXml(id)}"`;
    attrs += ` ref="${escapeXml(ref)}"`;
    xml += `${indent}<ownerRef${attrs}/>\n`;
  }
  return xml;
}


function buildPropertiesXML(
  properties: Record<string, unknown>[],
  indentLevel: number
): string {
  if (!properties || properties.length === 0) return '';

  const indent = '  '.repeat(indentLevel);
  let xml = '';

  for (const prop of properties) {
    const key = prop['@key'] as string | undefined;
    // XSD準拠: propertyBaseType は abstract のため xsi:type 必須。未設定時は stringType にフォールバック
    const xsiType = (prop['@xsi:type'] as string | undefined) ?? 'stringType';
    const textValue = prop['#text'];

    let attrs = '';
    if (key) attrs += ` key="${escapeXml(key)}"`;
    attrs += ` xsi:type="${escapeXml(xsiType)}"`;

    const textStr =
      textValue !== null && textValue !== undefined
        ? escapeXml(String(textValue))
        : '';

    if (textStr) {
      // MAIML XSD 準拠: property の値は <value> 子要素として出力する
      xml += `${indent}<property${attrs}>\n`;
      xml += `${indent}  <value>${textStr}</value>\n`;
      xml += `${indent}</property>\n`;
    } else {
      xml += `${indent}<property${attrs}/>\n`;
    }
  }

  return xml;
}

// ============================================================
// extractResultsBlocksFromDataXml
// ============================================================

/**
 * buildDataXML() の戻り値（<data>...</data>）から
 * <results>...</results> ブロックをすべて抽出して返す
 *
 * approveTask 時に template_data から生成した <results> を
 * 既存の <data> タグ内に追記するために使用する。
 *
 * @param dataXml - buildDataXML() の戻り値（<data>...</data> 全体）
 * @returns <results>...</results> XML 文字列（複数の場合は改行+インデントで連結）。
 *          <results> が存在しない場合は null を返す。
 */
export function extractResultsBlocksFromDataXml(dataXml: string): string | null {
  const matches = [...dataXml.matchAll(/<results[\s\S]*?<\/results>/g)];
  if (matches.length === 0) return null;
  return matches.map((m) => m[0]).join('\n    ');
}

// ============================================================
// appendResultsToData
// ============================================================

/**
 * MAIML XML の <data> タグ内の </data> 直前に新しい <results> XML を追記する
 *
 * 既存の <data> 内容（planned_values の実験計画指示など）はそのまま保持し、
 * 承認タスクの template_data から生成した <results> ブロックを末尾に追加する。
 *
 * 重複追記防止:
 *   newResultsXml 内の各 <results id="..."> について、同一 id が既に
 *   maimlContent 内に存在する場合はそのブロックをスキップする。
 *
 * @param maimlContent  - 元の MAIML XML 全文字列
 * @param newResultsXml - 追記する <results>...</results> XML 文字列
 *                        （extractResultsBlocksFromDataXml() の戻り値）
 * @returns 更新後の MAIML XML 全文字列（<data> タグが存在しない場合はそのまま返す）
 */
export function appendResultsToData(
  maimlContent: string,
  newResultsXml: string
): string {
  if (!/<\/data>/i.test(maimlContent)) {
    return maimlContent;
  }

  // newResultsXml から個別の <results> ブロックを分割して重複チェック
  const resultBlocks = [...newResultsXml.matchAll(/<results[\s\S]*?<\/results>/g)].map(
    (m) => m[0]
  );

  let toAppend = '';
  for (const block of resultBlocks) {
    // <results id="xxx"> の id 属性を抽出
    const idMatch = block.match(/<results[^>]*\sid="([^"]+)"/);
    const resultsId = idMatch ? idMatch[1] : null;

    // 同一 id が既存 maimlContent に存在する場合はスキップ（重複防止）
    if (resultsId) {
      const escapedId = resultsId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existsPattern = new RegExp(`<results[^>]*\\sid="${escapedId}"`);
      if (existsPattern.test(maimlContent)) {
        continue;
      }
    }
    toAppend += `    ${block.trimEnd()}\n`;
  }

  if (!toAppend) {
    return maimlContent;
  }

  return maimlContent.replace(/\n[ \t]*<\/data>/i, `\n${toAppend}  </data>`);
}

// ============================================================
// extractPlannedResultsBlocksFromMaiml
// ============================================================

/**
 * MAIML XML 文字列の <data> タグ内から「計画データ」の <results> ブロックのみを抽出して返す
 *
 * 計画データの識別条件:
 *   <results id="..."> の id 属性が "_actual" サフィックスを持たないもの。
 *   buildPlannedValuesResultsXML() が生成する id は "results_{methodId}_{taskNo}" 形式で
 *   "_actual" を含まないため、この条件で実績データと区別できる。
 *
 * writeDataAndEventLog()（targetFilter なし）の <data> 全置き換え前に呼び出し、
 * 置き換え後に appendResultsToData() で再追記することで計画データの消失を防ぐ。
 *
 * @param maimlContent - MAIML XML 全文字列
 * @returns 計画データ <results>...</results> の XML 文字列（複数の場合は改行+インデントで連結）。
 *          存在しない場合は null を返す。
 */
export function extractPlannedResultsBlocksFromMaiml(maimlContent: string): string | null {
  // <data>...</data> ブロック全体を抽出
  const dataMatch = maimlContent.match(/<data[\s\S]*?<\/data>/i);
  if (!dataMatch) return null;

  // <data> 内の全 <results> ブロックを抽出し、id が "_actual" で終わらないものだけ残す
  const allBlocks = [...dataMatch[0].matchAll(/<results[\s\S]*?<\/results>/g)];
  const plannedBlocks = allBlocks
    .map((m) => m[0])
    .filter((block) => {
      const idMatch = block.match(/<results[^>]*\sid="([^"]+)"/);
      if (!idMatch) return false;
      return !idMatch[1].endsWith('_actual');
    });

  if (plannedBlocks.length === 0) return null;
  return plannedBlocks.join('\n    ');
}

// ============================================================
// replaceDataAndEventLogInMaiml
// ============================================================

/**
 * MAIML XML 文字列の <data> タグと <eventLog> タグを
 * 指定された新しい XML 文字列で丸ごと置き換える
 *
 * 実装方針（PLAN 6-4 参照）:
 *   正規表現によるタグ全体置換
 *
 * @param maimlContent - 置き換え前の MAIML XML 全文字列
 * @param dataXml      - 新しい <data>...</data> XML 文字列（buildDataXML() の戻り値）
 * @param eventLogXml  - 新しい <eventLog>...</eventLog> XML 文字列（buildEventLogXML() の戻り値）
 * @returns 置き換え後の MAIML XML 全文字列
 */
export function replaceDataAndEventLogInMaiml(
  maimlContent: string,
  dataXml: string,
  eventLogXml: string
): string {
  let result = maimlContent;

  // <data ...>...</data> を丸ごと置換（複数行対応）
  result = result.replace(/<data[^>]*>[\s\S]*?<\/data>/g, dataXml.trimEnd());

  // <eventLog ...>...</eventLog> を丸ごと置換
  result = result.replace(/<eventLog[^>]*>[\s\S]*?<\/eventLog>/g, eventLogXml.trimEnd());

  return result;
}

// ============================================================
// extractOwnerIdsFromEventLogs
// ============================================================

/**
 * maiml_event_log の log JSON 配列から ownerRef の @ref 値を全件抽出する。
 *
 * JSON 構造は任意の深さに ownerRef が存在しうるため再帰的にたどる。
 * ownerRef は単体オブジェクトまたは配列のどちらの場合もある。
 * 抽出した値を重複排除して返す。
 *
 * @param logJsonArray - maiml_event_log の log カラム値の配列
 * @returns ownerRef の @ref 値の重複排除済みセット
 */
export function extractOwnerIdsFromEventLogs(
  logJsonArray: Record<string, unknown>[]
): Set<string> {
  const ownerIds = new Set<string>();

  const traverse = (obj: unknown): void => {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach(traverse);
      return;
    }

    const record = obj as Record<string, unknown>;

    // ownerRef キーを処理
    if ('ownerRef' in record) {
      const ownerRef = record['ownerRef'];
      if (Array.isArray(ownerRef)) {
        ownerRef.forEach((item) => {
          const ref = (item as Record<string, unknown>)?.['@ref'];
          if (typeof ref === 'string' && ref) ownerIds.add(ref);
        });
      } else if (ownerRef && typeof ownerRef === 'object') {
        const ref = (ownerRef as Record<string, unknown>)?.['@ref'];
        if (typeof ref === 'string' && ref) ownerIds.add(ref);
      }
    }

    // 子オブジェクトを再帰的にたどる（ownerRef 自身は処理済みなのでスキップ）
    Object.entries(record).forEach(([key, value]) => {
      if (key !== 'ownerRef') traverse(value);
    });
  };

  logJsonArray.forEach(traverse);
  return ownerIds;
}

// ============================================================
// appendOwnerToDocument
// ============================================================

/**
 * MAIML XML 文字列の `<document>` タグ内に `<owner>` タグを追記する。
 *
 * 同一 `id` の `<owner>` が既に存在する場合はスキップ（重複防止）。
 * `<document>` タグが存在しない場合はそのまま返す。
 *
 * @param maimlContent - 更新前の MAIML XML 文字列
 * @param ownerId - 追記する owner の id 属性値（`@` → `_` 変換済みの userId）
 * @param ownerName - 追記する owner の name 要素値
 * @returns 更新後の MAIML XML 文字列
 */
export function appendOwnerToDocument(
  maimlContent: string,
  ownerId: string,
  ownerName: string
): string {
  // <document> タグが存在しない場合はそのまま返す
  if (!/<document[^>]*>/.test(maimlContent)) {
    return maimlContent;
  }

  // 同一 id の <owner> が既に存在する場合はスキップ
  const escapedId = ownerId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existingOwnerPattern = new RegExp(`<owner[^>]*\\sid="${escapedId}"[^>]*>`);
  if (existingOwnerPattern.test(maimlContent)) {
    return maimlContent;
  }

  // 追記する <owner> XML を組み立て
  const ownerXml = [
    `  <owner id="${escapeXml(ownerId)}">`,
    `    <name>${escapeXml(ownerName)}</name>`,
    `  </owner>`,
  ].join('\n');

  // </document> の直前に挿入
  return maimlContent.replace(
    /(\s*)<\/document>/,
    `\n${ownerXml}\n$1</document>`
  );
}



/**
 * MAIML XML 文字列の <document> タグ直下の <uuid> を新しい UUID に更新し、
 * 更新前の uuid 値を <parent><uuid>旧uuid</uuid></parent> として追加（または上書き）する。
 *
 * 処理手順:
 *   1. 既存の <parent>...</parent> を除去（重複防止）
 *   2. <document> 直下の <uuid> を randomUUID() で新規生成した値に置き換え
 *   3. 新しい <uuid> の直後に <parent><uuid>旧uuid</uuid></parent> を挿入
 *
 * @param maimlContent - 更新前の MAIML XML 文字列
 * @returns 更新後の MAIML XML 文字列
 *          （<document> タグが存在しない場合や <uuid> が見つからない場合はそのまま返す）
 */
export function updateDocumentUuidAndParent(maimlContent: string): string {
  // <document> 直下の最初の <uuid> 値を抽出
  // [\s\S]*? の最短マッチで <document> 開きタグ直後の <uuid> のみを対象とする
  const docUuidMatch = maimlContent.match(
    /<document[^>]*>[\s\S]*?<uuid>([^<]+)<\/uuid>/
  );
  if (!docUuidMatch) {
    // <document> タグまたは直下の <uuid> が見つからない場合はそのまま返す
    return maimlContent;
  }

  const oldUuid = docUuidMatch[1].trim();
  const newUuid = randomUUID();

  let result = maimlContent;

  // 1. 既存の <parent>...</parent> を除去（2回目以降の書き出しでの重複防止）
  // [ \t]* で手前の行頭インデント（スペース・タブ）もまとめて除去し、後続要素のインデントずれを防ぐ
  result = result.replace(/[ \t]*<parent>[\s\S]*?<\/parent>\n?/g, '');
  // 1b. 孤立した </parent> を除去（過去のバグで残存している場合の対応）
  result = result.replace(/[ \t]*<\/parent>[ \t]*\n?/g, '');

  // 2. <document> 直下の <uuid> を新しい UUID に置き換え
  result = result.replace(
    /(<document[^>]*>[\s\S]*?)<uuid>[^<]+<\/uuid>/,
    `$1<uuid>${newUuid}</uuid>`
  );

  // 3. 新しい <uuid> の直後に <parent><uuid>旧uuid</uuid></parent> を挿入
  result = result.replace(
    `<uuid>${newUuid}</uuid>`,
    `<uuid>${newUuid}</uuid>\n    <parent>\n      <uuid>${escapeXml(oldUuid)}</uuid>\n    </parent>`
  );

  return result;
}

/**
 * MAIML XML 文字列の <eventLog> タグのみを
 * 指定された新しい XML 文字列で丸ごと置き換える
 *
 * <data> セクションは変更しない。
 * チェックアウト時点では template_data が空のため、
 * writeDataAndEventLog() を使うと <data> が空で上書きされる問題を回避するために使用する。
 *
 * @param maimlContent - 置き換え前の MAIML XML 全文字列
 * @param eventLogXml  - 新しい <eventLog>...</eventLog> XML 文字列（buildEventLogXML() の戻り値）
 * @returns 置き換え後の MAIML XML 全文字列
 */
export function replaceEventLogInMaiml(
  maimlContent: string,
  eventLogXml: string
): string {
  // <eventLog ...>...</eventLog> を丸ごと置換（複数行対応）
  return maimlContent.replace(/<eventLog[^>]*>[\s\S]*?<\/eventLog>/g, eventLogXml.trimEnd());
}

// ============================================================
// injectNamespaceDeclarations
// ============================================================

/**
 * MAIML XML の <maiml> 開きタグに xmlns:prefix="uri" 宣言を注入する
 *
 * - 既存の xmlns:xxx="..." 属性と xmlns="..." をすべて除去した上で、
 *   ファイルサーバから取得した名前空間で上書きする（完全置換方式）。
 * - namespaces が空配列の場合は何も変更せずそのまま返す（ノーオペレーション）。
 * - prefix が '' のエントリは xmlns="uri"（デフォルト名前空間）として出力する。
 * - xsi:schemaLocation 等の名前空間宣言でない属性は除去しない。
 * - <maiml> タグが存在しない場合はそのまま返す。
 *
 * @param maimlContent - 更新前の MAIML XML 文字列
 * @param namespaces   - ファイルサーバから取得した名前空間一覧（{prefix, uri}[]）
 * @returns 更新後の MAIML XML 文字列
 */
export function injectNamespaceDeclarations(
  maimlContent: string,
  namespaces: Array<{ prefix: string; uri: string }>
): string {
  // 名前空間が空の場合はノーオペレーション
  if (namespaces.length === 0) {
    return maimlContent;
  }

  // <maiml ...> 開きタグ全体をキャプチャ（複数行にまたがる場合も考慮）
  const maimlTagMatch = maimlContent.match(/<maiml[\s\S]*?>/);
  if (!maimlTagMatch) {
    return maimlContent;
  }

  const originalTag = maimlTagMatch[0];

  // xmlns:prefix="uri" 形式の属性をすべて除去（プレフィックスなしの xmlns="..." も除去）
  const tagWithoutNs = originalTag
    .replace(/\s+xmlns:[a-zA-Z0-9_.-]+="[^"]*"/g, '')
    .replace(/\s+xmlns="[^"]*"/g, '');

  // 名前空間を xmlns 属性に変換
  // prefix が '' の場合は xmlns="uri"（デフォルト名前空間）、それ以外は xmlns:prefix="uri"
  const nsAttrs = namespaces
    .map(({ prefix, uri }) =>
      prefix ? `xmlns:${prefix}="${escapeXml(uri)}"` : `xmlns="${escapeXml(uri)}"`)
    .join('\n  ');

  // <maiml> の閉じ角括弧直前に名前空間属性を追加
  // 末尾が "/>" (自己閉じタグ) か ">" かで分岐
  let newTag: string;
  if (tagWithoutNs.endsWith('/>')) {
    newTag = tagWithoutNs.slice(0, -2).trimEnd() + '\n  ' + nsAttrs + '\n/>';
  } else {
    newTag = tagWithoutNs.slice(0, -1).trimEnd() + '\n  ' + nsAttrs + '\n>';
  }

  return maimlContent.replace(originalTag, newTag);
}

// ============================================================
// buildPlannedValuesResultsXML
// ============================================================

/**
 * experiment_plan.planned_values から MAIML の <data><results> XML を生成する
 *
 * planned_values の各 fieldKey を解析し、prop_key（{prefix}:{localName}）を
 * {prefix}:SupervisorDirective{localName} 形式に変換して <property> タグとして出力する。
 *
 * @remarks
 * fieldKey 形式: "{templateId}_{prop_key}" または "{prop_key}" 単独
 * prop_key 変換規則: "{prefix}:{localName}" → "{prefix}:SupervisorDirective{localName}"
 * カテゴリ判定: templateId のプレフィックス（materialTemplate/conditionTemplate/resultTemplate）から判定
 *
 * @param experimentPlans - experiment_plan テーブルのレコード一覧
 * @param dataId          - <data> タグの id 属性（デフォルト: 'dataID'）
 * @param existingUuids   - 既存 MAIML から抽出した UUID マップ（UUID 再利用用）
 * @returns `<data id="...">...</data>` の XML 文字列。対象データが空の場合は空文字列を返す
 */
export function buildPlannedValuesResultsXML(
  experimentPlans: ExperimentPlan[],
  dataId: string = 'dataID',
  existingUuids?: Map<string, string>,
  validSupervisorKeySet?: Set<string>
): string {
  type PropEntry = { propKey: string; value: string };

  // method_id × task_no の出現順を保持
  const groupOrder: string[] = [];
  const groupMap = new Map<
    string,
    Map<string, { category: string; entries: PropEntry[] }>
  >();

  // templateId のプレフィックスからカテゴリを判定する
  function detectCategory(templateId: string): string {
    const lower = templateId.toLowerCase();
    if (lower.startsWith('materialtemplate')) return 'material';
    if (lower.startsWith('conditiontemplate')) return 'condition';
    if (lower.startsWith('resulttemplate')) return 'result';
    return 'result';
  }

  // prop_key を SupervisorDirective 付きに変換する
  function toSupervisorKey(propKey: string): string {
    const colonIdx = propKey.indexOf(':');
    if (colonIdx <= 0) return `SupervisorDirective${propKey}`;
    const prefix = propKey.slice(0, colonIdx);
    const localName = propKey.slice(colonIdx + 1);
    return `${prefix}:SupervisorDirective${localName}`;
  }

  const RESERVED_KEYS = new Set(['__uncertainty__', '__task__', '__meta__']);

  for (const plan of experimentPlans) {
    if (!plan.planned_values) continue;
    const plannedValues = plan.planned_values as Record<string, unknown>;
    const groupKey = `${plan.method_id}\x00${plan.task_no}`;

    if (!groupMap.has(groupKey)) {
      groupOrder.push(groupKey);
      groupMap.set(groupKey, new Map());
    }
    const templateMap = groupMap.get(groupKey)!;

    for (const [transitionId, fieldMap] of Object.entries(plannedValues)) {
      if (transitionId === '__meta__') continue;
      if (!fieldMap || typeof fieldMap !== 'object') continue;

      for (const [fieldKey, rawValue] of Object.entries(fieldMap as Record<string, unknown>)) {
        if (RESERVED_KEYS.has(fieldKey)) continue;
        if (fieldKey.startsWith('mgr-instruction:') || fieldKey.startsWith('Alchemia:SupervisorDirective')) continue;
        if (rawValue === null || rawValue === undefined) continue;
        if (typeof rawValue !== 'string' && typeof rawValue !== 'number') continue;

        const value = String(rawValue);

        // "{templateId}_{propKey}" 形式でテンプレートIDプレフィックスを検出
        const templatePrefixMatch = fieldKey.match(/^((?:material|condition|result)Template_[^_]+)_(.+)$/i);
        if (!templatePrefixMatch) continue; // templateId が特定できない場合はスキップ

        const templateId = templatePrefixMatch[1];
        const propKey = templatePrefixMatch[2];

        if (!templateMap.has(templateId)) {
          templateMap.set(templateId, { category: detectCategory(templateId), entries: [] });
        }
        templateMap.get(templateId)!.entries.push({ propKey, value });
      }
    }
  }

  // 対象データがない場合は空文字列を返す（<data> の置換をスキップさせる）
  if (groupOrder.length === 0) return '';

  // XML 生成
  let dataXml = `<data id="${escapeXml(dataId)}">\n`;
  dataXml += `    <uuid>${resolveUuid('data', existingUuids, randomUUID)}</uuid>\n`;

  for (const groupKey of groupOrder) {
    const templateMap = groupMap.get(groupKey)!;
    if (templateMap.size === 0) continue;

    const separatorIdx = groupKey.indexOf('\x00');
    const methodId = groupKey.slice(0, separatorIdx);
    const taskNoStr = groupKey.slice(separatorIdx + 1);
    const resultsId = `results_${escapeXml(methodId)}_${taskNoStr}`;

    dataXml += `    <results id="${resultsId}">\n`;
    dataXml += `      <uuid>${resolveUuid(`results:${resultsId}`, existingUuids, randomUUID)}</uuid>\n`;

    // material → condition → result の順に出力
    const categoryOrder = ['material', 'condition', 'result'];
    const byCategory = new Map<string, Array<{ templateId: string; entries: PropEntry[] }>>();
    for (const cat of categoryOrder) byCategory.set(cat, []);
    for (const [templateId, info] of templateMap.entries()) {
      const bucket = byCategory.get(info.category);
      if (bucket) bucket.push({ templateId, entries: info.entries });
    }

    for (const category of categoryOrder) {
      const items = byCategory.get(category) ?? [];
      for (const { templateId, entries } of items) {
        if (entries.length === 0) continue;
        const instanceId = `data-${escapeXml(templateId)}`;
        dataXml += `      <${category} id="${instanceId}" ref="${escapeXml(templateId)}">\n`;
        dataXml += `        <uuid>${resolveUuid(`${category}:${instanceId}`, existingUuids, randomUUID)}</uuid>\n`;
        for (const { propKey, value } of entries) {
          const outputKey = toSupervisorKey(propKey);
          // prefix 付き用語（コロンあり）は validSupervisorKeySet でチェック
          const colonIdx = propKey.indexOf(':');
          if (colonIdx > 0 && validSupervisorKeySet && !validSupervisorKeySet.has(outputKey)) {
            // namespace_term に変換後キーが存在しない → スキップ
            continue;
          }
          dataXml += `        <property key="${escapeXml(outputKey)}" xsi:type="stringType">\n`;
          dataXml += `          <value>${escapeXml(value)}</value>\n`;
          dataXml += `        </property>\n`;
        }
        dataXml += `      </${category}>\n`;
      }
    }

    dataXml += `    </results>\n`;
  }

  dataXml += `  </data>\n`;
  return dataXml;
}
