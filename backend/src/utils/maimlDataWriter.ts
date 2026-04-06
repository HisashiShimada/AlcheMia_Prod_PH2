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
function escapeXml(text: unknown): string {
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
  existingUuids?: Map<string, string>
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

    // results タグの id: "results_{method_id}_{task_no}"
    const resultsId = `results_${escapeXml(method_id)}_${task_no}`;

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

        // インスタンスID: place_id をそのまま使用（なければ自動採番）
        const instanceId = row.place_id || `${category}_instance_${index}`;
        // ref: templateId をテンプレート参照として使用
        const templateRef = ps.templateId || '';

        dataXml += `      <${category} id="${escapeXml(instanceId)}" ref="${escapeXml(templateRef)}">\n`;
        dataXml += `        <uuid>${resolveUuid(`${category}:${instanceId}`, existingUuids, randomUUID)}</uuid>\n`;

        // プロパティを出力
        if (ps.properties && Array.isArray(ps.properties)) {
          for (const prop of ps.properties) {
            if (!prop || !prop.key) continue;

            // xsi:type フォールバック（未設定時は stringType）
            const propType = prop.xsiType || 'stringType';

            dataXml += `        <property key="${escapeXml(prop.key)}"`;

            // カスタム属性を動的出力（xsi:type / units / formatString / scaleFactor は個別処理）
            if (prop.attributes) {
              for (const [attrName, attrValue] of Object.entries(prop.attributes)) {
                if (attrName !== 'xsi:type' && attrValue) {
                  dataXml += ` ${attrName}="${escapeXml(attrValue)}"`;
                }
              }
            }

            // units
            if (prop.units) {
              dataXml += ` units="${escapeXml(prop.units)}"`;
            }

            // formatString
            if (prop.formatString) {
              dataXml += ` formatString="${escapeXml(prop.formatString)}"`;
            }

            // scaleFactor
            if (prop.scaleFactor !== undefined && prop.scaleFactor !== null) {
              dataXml += ` scaleFactor="${escapeXml(String(prop.scaleFactor))}"`;
            }

            // xsi:type は最後に出力
            dataXml += ` xsi:type="${escapeXml(propType)}"`;

            dataXml += `>\n`;

            // description（value より前に出力）
            if (prop.description) {
              dataXml += `          <description>${escapeXml(prop.description)}</description>\n`;
            }

            // value（null / undefined / 空文字は出力しない）
            const propValue = prop.value;
            if (propValue !== null && propValue !== undefined && propValue !== '') {
              dataXml += `          <value>${escapeXml(String(propValue))}</value>\n`;
            }

            // customElements（任意の追加要素）
            if (prop.customElements) {
              for (const [elemName, customElem] of Object.entries(prop.customElements)) {
                if (customElem && customElem.value !== undefined && customElem.value !== '') {
                  let elemXml = `          <${elemName}`;
                  if (customElem.attributes) {
                    for (const [aName, aVal] of Object.entries(customElem.attributes)) {
                      if (aVal) elemXml += ` ${aName}="${escapeXml(aVal)}"`;
                    }
                  }
                  elemXml += `>${escapeXml(String(customElem.value))}</${elemName}>\n`;
                  dataXml += elemXml;
                }
              }
            }

            dataXml += `        </property>\n`;
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
        if (ps.contents && Array.isArray(ps.contents)) {
          for (const c of ps.contents) {
            if (!c || !c.key) continue;
            const contentType = c.xsiType || 'contentDoubleListType';
            dataXml += `        <content key="${escapeXml(c.key)}"`;
            if (c.units) dataXml += ` units="${escapeXml(c.units)}"`;
            dataXml += ` xsi:type="${escapeXml(contentType)}">\n`;
            if (c.description) {
              dataXml += `          <description>${escapeXml(c.description)}</description>\n`;
            }
            // value はスペース区切り文字列または配列
            const rawVal = c.value;
            const items: string[] = Array.isArray(rawVal)
              ? (rawVal as unknown[]).map((v) => String(v))
              : typeof rawVal === 'string' && rawVal.trim().length > 0
              ? rawVal.trim().split(/[\s,]+/).filter((s) => s.length > 0)
              : [];
            for (const item of items) {
              dataXml += `          <value>${escapeXml(item)}</value>\n`;
            }
            dataXml += `        </content>\n`;
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
  if (!logJsonArray || logJsonArray.length === 0) {
    // XSD準拠: eventLogType は log が必須（minOccurs=1）のため最小構造を返す
    const emptyLogId = `log_${eventLogId}_empty`;
    return [
      `<eventLog id="${escapeXml(eventLogId)}">`,
      `    <uuid>${resolveUuid('eventLog', existingUuids, randomUUID)}</uuid>`,
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
  xml += `    <uuid>${resolveUuid('eventLog', existingUuids, randomUUID)}</uuid>\n`;

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

    for (const logEntry of logEntries) {
      xml += buildLogEntryXML(logEntry, existingUuids);
    }

    // instruction_target=1 のパターンB: log 外の evnet
    const topLevelEvnet = eventLogObj['evnet'] as Record<string, unknown> | undefined;
    if (topLevelEvnet) {
      xml += buildEvnetXML(topLevelEvnet, 2, existingUuids);
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
  xml += buildPropertiesXML(properties, 5);

  // resultsRef 要素の出力（存在する場合のみ）
  for (const rr of resultsRefList) {
    const rrRef = rr['@ref'] as string | undefined;
    if (rrRef !== undefined) {
      xml += `          <resultsRef ref="${escapeXml(rrRef)}"/>\n`;
    }
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
 * <property> 要素群の XML を生成
 *
 * @param properties  - プロパティオブジェクトの配列（DB JSON 由来）
 * @param indentLevel - インデントレベル
 */
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
