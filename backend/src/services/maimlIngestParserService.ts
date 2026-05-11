/**
 * MaiML Ingest パーサーサービス
 *
 * @description
 *   MaiML XML 文字列を受け取り、組織スキーマの各テーブルへ挿入するための
 *   フラット化された中間データ構造（ParsedMaimlData）に変換する。
 *
 *   MaimlParserTyped を使って MaimlRoot を取得し、
 *   data セクション（Material/Condition/Result インスタンス）と
 *   protocol セクション（Template）を走査してマッピングする。
 *
 * @reference docs/MaiML_OpenData_Pipeline/spec.md §11
 */

import { MaimlParserTyped } from '../utils/maimlParserTyped';
import { buildMaimlLineNoMap } from '../utils/maimlLineNoExtractor';
import type { MaimlLineNoMap } from '../utils/maimlLineNoExtractor';
import type {
  Material,
  Condition,
  Result,
  Template,
  Property,
  Content,
  Insertion,
} from '../types/maiml-unified';
import type {
  ParsedMaimlData,
  MaimlInstanceInput,
  MaimlElementInput,
  MaimlElementValueInput,
  MaimlInsertionInput,
  MaimlTemplateInput,
  MaimlTemplateElementInput,
  MaimlTemplateElementValueInput,
  MaimlTemplateInsertionInput,
  MaimlEventInput,
  MaimlEventElementInput,
  MaimlEventElementValueInput,
} from '../types/maimlOpenData';

// ============================================================
// 内部 ID カウンター（単一パース呼び出しスコープ内でユニーク）
// ============================================================

class TempIdCounter {
  private counter = 0;
  next(): number {
    return ++this.counter;
  }
}

// ============================================================
// Property / Content を要素行にフラット化するヘルパー
// ============================================================

/**
 * Property を再帰的に走査し、MaimlElementInput / MaimlElementValueInput を生成する
 *
 * @param hierarchy - 連番形式の階層番号（例: "1", "2-1", "2-1-3"）
 * @param lineNoMap - buildMaimlLineNoMap() で構築した行番号マップ
 */
function flattenProperty(
  prop:         Property,
  parentTempId: number | null,
  instanceKey:  string,
  hierarchy:    string,
  counter:      TempIdCounter,
  elements:     MaimlElementInput[],
  values:       MaimlElementValueInput[],
  lineNoMap:    MaimlLineNoMap
): void {
  const tempId  = counter.next();
  const lineNo  = lineNoMap.elements.get(`${instanceKey}::${hierarchy}`) ?? null;

  elements.push({
    _tempId:          tempId,
    _tempParentId:    parentTempId,
    _instanceKey:     instanceKey,
    hierarchy,
    element_type:     'property',
    description:      prop.description ?? null,
    element_data:     null,
    xsi_type:         prop.xsiType ?? null,
    key:              prop.key ?? null,
    format_string:    prop.formatString ?? null,
    units:            prop.units ?? null,
    scale_factor:     prop.scaleFactor ?? null,
    axis:             null,
    size_value:       null,
    element_id_attr:  null,
    element_ref:      null,
    maiml_line_no:    lineNo,
  });

  // value
  if (prop.value !== undefined && prop.value !== null) {
    values.push({
      _tempElementId: tempId,
      value_idx:      0,
      value:          String(prop.value),
      value_array:    null,
    });
  }

  // ネストされた property / content（連番 hierarchy で走査）
  let childIdx = 0;
  for (const child of prop.properties ?? []) {
    childIdx++;
    flattenProperty(
      child,
      tempId,
      instanceKey,
      `${hierarchy}-${childIdx}`,
      counter,
      elements,
      values,
      lineNoMap
    );
  }
  for (const child of prop.contents ?? []) {
    childIdx++;
    flattenContent(
      child,
      tempId,
      instanceKey,
      `${hierarchy}-${childIdx}`,
      counter,
      elements,
      values,
      lineNoMap
    );
  }
}

/**
 * Content を再帰的に走査し、MaimlElementInput / MaimlElementValueInput を生成する
 *
 * @param hierarchy - 連番形式の階層番号（例: "1", "2-1", "2-1-3"）
 * @param lineNoMap - buildMaimlLineNoMap() で構築した行番号マップ
 */
function flattenContent(
  cont:         Content,
  parentTempId: number | null,
  instanceKey:  string,
  hierarchy:    string,
  counter:      TempIdCounter,
  elements:     MaimlElementInput[],
  values:       MaimlElementValueInput[],
  lineNoMap:    MaimlLineNoMap
): void {
  const tempId  = counter.next();
  const lineNo  = lineNoMap.elements.get(`${instanceKey}::${hierarchy}`) ?? null;

  elements.push({
    _tempId:          tempId,
    _tempParentId:    parentTempId,
    _instanceKey:     instanceKey,
    hierarchy,
    element_type:     'content',
    description:      cont.description ?? null,
    element_data:     null,
    xsi_type:         cont.xsiType ?? null,
    key:              cont.key ?? null,
    format_string:    cont.formatString ?? null,
    units:            cont.units ?? null,
    scale_factor:     cont.scaleFactor ?? null,
    axis:             cont.axis ?? null,
    size_value:       cont.size ?? null,
    element_id_attr:  cont.id ?? null,
    element_ref:      cont.ref ?? null,
    maiml_line_no:    lineNo,
  });

  // value（文字列化して格納）
  if (cont.value !== undefined && cont.value !== null) {
    const raw = String(cont.value);
    // スペース区切りのリスト値を配列として保存
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      values.push({
        _tempElementId: tempId,
        value_idx:      0,
        value:          null,
        value_array:    parts,
      });
    } else {
      values.push({
        _tempElementId: tempId,
        value_idx:      0,
        value:          raw,
        value_array:    null,
      });
    }
  }

  // ネストされた property / content（連番 hierarchy で走査）
  let childIdx = 0;
  for (const child of cont.properties ?? []) {
    childIdx++;
    flattenProperty(
      child,
      tempId,
      instanceKey,
      `${hierarchy}-${childIdx}`,
      counter,
      elements,
      values,
      lineNoMap
    );
  }
  for (const child of cont.contents ?? []) {
    childIdx++;
    flattenContent(
      child,
      tempId,
      instanceKey,
      `${hierarchy}-${childIdx}`,
      counter,
      elements,
      values,
      lineNoMap
    );
  }
}

/**
 * Insertion を MaimlInsertionInput に変換する
 */
function toInsertionInput(
  ins:         Insertion,
  instanceKey: string
): MaimlInsertionInput {
  return {
    _instanceKey:  instanceKey,
    uri:           ins.uri,
    hash_value:    ins.hash?.value ?? null,
    hash_method:   ins.hash?.method ?? null,
    file_uuid:     ins.uuid ?? null,
    mime_format:   ins.format ?? null,
    maiml_line_no: null,
  };
}

// ============================================================
// インスタンス系（Material / Condition / Result）のマッピング
// ============================================================

type InstanceLike = Material | Condition | Result;
type InstanceType = 'material' | 'condition' | 'result';

function processInstance(
  inst:         InstanceLike,
  instType:     InstanceType,
  counter:      TempIdCounter,
  instances:    MaimlInstanceInput[],
  elements:     MaimlElementInput[],
  values:       MaimlElementValueInput[],
  insertions:   MaimlInsertionInput[],
  lineNoMap:    MaimlLineNoMap
): void {
  const instanceKey = inst.id;

  instances.push({
    instance_type:     instType,
    instance_key:      instanceKey,
    template_ref:      inst.ref ?? null,
    instance_uuid:     inst.uuid ?? null,
    instance_name:     inst.name ?? null,
    instance_line_no:  lineNoMap.instances.get(instanceKey) ?? null,
  });

  // property / content（連番 hierarchy で走査）
  let topIdx = 0;
  for (const prop of inst.properties ?? []) {
    topIdx++;
    flattenProperty(
      prop,
      null,
      instanceKey,
      String(topIdx),
      counter,
      elements,
      values,
      lineNoMap
    );
  }
  for (const cont of inst.contents ?? []) {
    topIdx++;
    flattenContent(
      cont,
      null,
      instanceKey,
      String(topIdx),
      counter,
      elements,
      values,
      lineNoMap
    );
  }

  // insertion（Result のみ）
  if (instType === 'result') {
    const r = inst as Result;
    if (r.insertion) {
      const insIdx = insertions.filter(i => i._instanceKey === instanceKey).length;
      const insLineNo = lineNoMap.insertions.get(`${instanceKey}::insertion::${insIdx}`) ?? null;
      const ins = toInsertionInput(r.insertion, instanceKey);
      insertions.push({ ...ins, maiml_line_no: insLineNo });
    }
  }
}

// ============================================================
// Template 系のマッピング
// ============================================================

function flattenTemplateProperty(
  prop:         Property,
  parentTempId: number | null,
  templateKey:  string,
  hierarchy:    string,
  counter:      TempIdCounter,
  elements:     MaimlTemplateElementInput[],
  values:       MaimlTemplateElementValueInput[],
  lineNoMap:    MaimlLineNoMap
): void {
  const tempId = counter.next();
  const lineNo = lineNoMap.elements.get(`${templateKey}::${hierarchy}`) ?? null;

  elements.push({
    _tempId:          tempId,
    _tempParentId:    parentTempId,
    _templateKey:     templateKey,
    hierarchy,
    element_type:     'property',
    description:      prop.description ?? null,
    element_data:     null,
    xsi_type:         prop.xsiType ?? null,
    key:              prop.key ?? null,
    format_string:    prop.formatString ?? null,
    units:            prop.units ?? null,
    scale_factor:     prop.scaleFactor ?? null,
    axis:             null,
    size_value:       null,
    element_id_attr:  null,
    element_ref:      null,
    maiml_line_no:    lineNo,
  });

  if (prop.value !== undefined && prop.value !== null) {
    values.push({
      _tempElementId: tempId,
      value_idx:      0,
      value:          String(prop.value),
      value_array:    null,
    });
  }

  // ネストされた property / content（連番 hierarchy で走査）
  let childIdx = 0;
  for (const child of prop.properties ?? []) {
    childIdx++;
    flattenTemplateProperty(child, tempId, templateKey, `${hierarchy}-${childIdx}`, counter, elements, values, lineNoMap);
  }
  for (const child of prop.contents ?? []) {
    childIdx++;
    flattenTemplateContent(child, tempId, templateKey, `${hierarchy}-${childIdx}`, counter, elements, values, lineNoMap);
  }
}

function flattenTemplateContent(
  cont:         Content,
  parentTempId: number | null,
  templateKey:  string,
  hierarchy:    string,
  counter:      TempIdCounter,
  elements:     MaimlTemplateElementInput[],
  values:       MaimlTemplateElementValueInput[],
  lineNoMap:    MaimlLineNoMap
): void {
  const tempId = counter.next();
  const lineNo = lineNoMap.elements.get(`${templateKey}::${hierarchy}`) ?? null;

  elements.push({
    _tempId:          tempId,
    _tempParentId:    parentTempId,
    _templateKey:     templateKey,
    hierarchy,
    element_type:     'content',
    description:      cont.description ?? null,
    element_data:     null,
    xsi_type:         cont.xsiType ?? null,
    key:              cont.key ?? null,
    format_string:    cont.formatString ?? null,
    units:            cont.units ?? null,
    scale_factor:     cont.scaleFactor ?? null,
    axis:             cont.axis ?? null,
    size_value:       cont.size ?? null,
    element_id_attr:  cont.id ?? null,
    element_ref:      cont.ref ?? null,
    maiml_line_no:    lineNo,
  });

  if (cont.value !== undefined && cont.value !== null) {
    const raw   = String(cont.value);
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    values.push({
      _tempElementId: tempId,
      value_idx:      0,
      value:          parts.length > 1 ? null : raw,
      value_array:    parts.length > 1 ? parts : null,
    });
  }

  // ネストされた property / content（連番 hierarchy で走査）
  let childIdx = 0;
  for (const child of cont.properties ?? []) {
    childIdx++;
    flattenTemplateProperty(child, tempId, templateKey, `${hierarchy}-${childIdx}`, counter, elements, values, lineNoMap);
  }
  for (const child of cont.contents ?? []) {
    childIdx++;
    flattenTemplateContent(child, tempId, templateKey, `${hierarchy}-${childIdx}`, counter, elements, values, lineNoMap);
  }
}

function processTemplate(
  tmpl:               Template,
  tmplType:           'result' | 'material' | 'condition',
  counter:            TempIdCounter,
  templates:          MaimlTemplateInput[],
  elements:           MaimlTemplateElementInput[],
  values:             MaimlTemplateElementValueInput[],
  insertions:         MaimlTemplateInsertionInput[],
  lineNoMap:          MaimlLineNoMap
): void {
  const templateKey = tmpl.id;

  templates.push({
    template_type:     tmplType,
    template_key:      templateKey,
    template_uuid:     tmpl.uuid ?? null,
    template_name:     tmpl.name ?? null,
    template_line_no:  lineNoMap.templates.get(templateKey) ?? null,
  });

  // トップレベル property / content（連番 hierarchy で走査）
  let topIdx = 0;
  for (const prop of tmpl.properties ?? []) {
    topIdx++;
    flattenTemplateProperty(prop, null, templateKey, String(topIdx), counter, elements, values, lineNoMap);
  }
  for (const cont of tmpl.contents ?? []) {
    topIdx++;
    flattenTemplateContent(cont, null, templateKey, String(topIdx), counter, elements, values, lineNoMap);
  }

  if (tmpl.insertion) {
    // template insertion の行番号: lineNoMap.insertions のキーは `${contextKey}::insertion::0`
    const tmplInsLineNo = lineNoMap.insertions.get(`${templateKey}::insertion::0`) ?? null;
    insertions.push({
      _templateKey:  templateKey,
      uri:           tmpl.insertion.uri,
      hash_value:    tmpl.insertion.hash?.value ?? null,
      hash_method:   tmpl.insertion.hash?.method ?? null,
      file_uuid:     tmpl.insertion.uuid ?? null,
      mime_format:   tmpl.insertion.format ?? null,
      maiml_line_no: tmplInsLineNo,
    });
  }
}

// ============================================================
// サービス本体
// ============================================================

export const maimlIngestParserService = {
  /**
   * MaiML XML を ParsedMaimlData に変換する
   *
   * @param xmlString - MaiML XML 文字列
   * @returns フラット化された挿入データ
   */
  parseForIngest(xmlString: string): ParsedMaimlData {
    const parser    = new MaimlParserTyped(xmlString);
    const root      = parser.getTypedMaiml();
    const lineNoMap = buildMaimlLineNoMap(xmlString);

    const counter = new TempIdCounter();

    // 出力バッファ
    const instances:              MaimlInstanceInput[]              = [];
    const elements:               MaimlElementInput[]               = [];
    const elementValues:          MaimlElementValueInput[]          = [];
    const insertions:             MaimlInsertionInput[]             = [];
    const templates:              MaimlTemplateInput[]              = [];
    const templateElements:       MaimlTemplateElementInput[]       = [];
    const templateElementValues:  MaimlTemplateElementValueInput[]  = [];
    const templateInsertions:     MaimlTemplateInsertionInput[]     = [];
    const events:                 MaimlEventInput[]                 = [];
    const eventElements:          MaimlEventElementInput[]          = [];
    const eventElementValues:     MaimlEventElementValueInput[]     = [];

    // ── data セクション ──────────────────────────────────
    const dataSection = root.data;
    if (dataSection?.results) {
      for (const results of dataSection.results) {
        for (const mat of results.materials ?? []) {
          processInstance(mat, 'material', counter, instances, elements, elementValues, insertions, lineNoMap);
        }
        for (const cond of results.conditions ?? []) {
          processInstance(cond, 'condition', counter, instances, elements, elementValues, insertions, lineNoMap);
        }
        for (const res of results.results ?? []) {
          processInstance(res, 'result', counter, instances, elements, elementValues, insertions, lineNoMap);
        }
      }
    }

    // ── protocol セクション（テンプレート）───────────────
    const protocol = root.protocol;
    if (protocol) {
      const allTemplates: Array<{ tmpl: Template; type: 'result' | 'material' | 'condition' }> = [];

      // protocol 直下
      for (const t of protocol.materialTemplates ?? []) allTemplates.push({ tmpl: t, type: 'material' });
      for (const t of protocol.conditionTemplates ?? []) allTemplates.push({ tmpl: t, type: 'condition' });
      for (const t of protocol.resultTemplates ?? []) allTemplates.push({ tmpl: t, type: 'result' });

      // method 直下 + program 直下
      for (const method of protocol.methods ?? []) {
        for (const t of method.materialTemplates ?? []) allTemplates.push({ tmpl: t, type: 'material' });
        for (const t of method.conditionTemplates ?? []) allTemplates.push({ tmpl: t, type: 'condition' });
        for (const t of method.resultTemplates ?? []) allTemplates.push({ tmpl: t, type: 'result' });

        for (const prog of Array.isArray(method.program) ? method.program : (method.program ? [method.program] : [])) {
          for (const t of prog.materialTemplates ?? []) allTemplates.push({ tmpl: t, type: 'material' });
          for (const t of prog.conditionTemplates ?? []) allTemplates.push({ tmpl: t, type: 'condition' });
          for (const t of prog.resultTemplates ?? []) allTemplates.push({ tmpl: t, type: 'result' });
        }
      }

      // 重複除去（template_key で一意）
      const seen = new Set<string>();
      for (const { tmpl, type } of allTemplates) {
        if (seen.has(tmpl.id)) continue;
        seen.add(tmpl.id);
        processTemplate(tmpl, type, counter, templates, templateElements, templateElementValues, templateInsertions, lineNoMap);
      }
    }

    // ── eventLog セクション ─────────────────────────────
    // MaimlRoot.eventLog（単数）> logs > traces > events 階層を走査する
    const eventLogSection = root.eventLog;
    if (eventLogSection) {
      for (const log of eventLogSection.logs ?? []) {
        for (const trace of log.traces ?? []) {
          for (const event of trace.events ?? []) {
            const eventIndex = events.length;

            // resultsRefs は配列。最初の ref 値を results_ref として格納する
            const firstResultsRef = (event.resultsRefs ?? [])[0]?.ref ?? null;

            // event の行番号: lineNoMap.events は event/@id or 出現順インデックス文字列がキー
            const eventMapKey  = event.id ?? String(eventIndex);
            const eventLineNo  = lineNoMap.events.get(eventMapKey) ?? null;

            events.push({
              event_key:       event.id          ?? null,
              results_ref:     firstResultsRef,
              instruction_ref: event.ref         ?? null,
              event_uuid:      event.uuid        ?? null,
              event_name:      event.name        ?? null,
              description:     event.description ?? null,
              annotation:      event.annotation  ?? null,
              maiml_line_no:   eventLineNo,
            });

            // event 直下の property / content を eventElement / eventElementValue に変換
            let evElemIdx = 0;
            for (const prop of event.properties ?? []) {
              evElemIdx++;
              const elemIndex = eventElements.length;
              const eeLineNo = lineNoMap.eventElements.get(`${eventMapKey}::${evElemIdx}`) ?? null;

              eventElements.push({
                _eventIndex:    eventIndex,
                hierarchy:      String(evElemIdx),
                element_type:   'property',
                description:    prop.description  ?? null,
                xsi_type:       prop.xsiType      ?? null,
                key:            prop.key          ?? null,
                format_string:  prop.formatString ?? null,
                units:          prop.units        ?? null,
                scale_factor:   prop.scaleFactor  ?? null,
                axis:           null,
                size_value:     null,
                element_id_attr: null,
                element_ref:    null,
                maiml_line_no:  eeLineNo,
              });

              if (prop.value !== undefined && prop.value !== null) {
                eventElementValues.push({
                  _eventElementIndex: elemIndex,
                  value_idx:          0,
                  value:              String(prop.value),
                  value_array:        null,
                });
              }
            }
            for (const cont of event.contents ?? []) {
              evElemIdx++;
              const elemIndex = eventElements.length;
              const eeLineNo = lineNoMap.eventElements.get(`${eventMapKey}::${evElemIdx}`) ?? null;

              eventElements.push({
                _eventIndex:    eventIndex,
                hierarchy:      String(evElemIdx),
                element_type:   'content',
                description:    cont.description  ?? null,
                xsi_type:       cont.xsiType      ?? null,
                key:            cont.key          ?? null,
                format_string:  cont.formatString ?? null,
                units:          cont.units        ?? null,
                scale_factor:   cont.scaleFactor  ?? null,
                axis:           cont.axis         ?? null,
                size_value:     cont.size         ?? null,
                element_id_attr: cont.id          ?? null,
                element_ref:    cont.ref          ?? null,
                maiml_line_no:  eeLineNo,
              });

              if (cont.value !== undefined && cont.value !== null) {
                const raw   = String(cont.value);
                const parts = raw.trim().split(/\s+/).filter(Boolean);
                eventElementValues.push({
                  _eventElementIndex: elemIndex,
                  value_idx:          0,
                  value:              parts.length > 1 ? null : raw,
                  value_array:        parts.length > 1 ? parts : null,
                });
              }
            }
          }
        }
      }
    }

    // doc_name: document.name を使用
    const docName = root.document?.name ?? null;

    return {
      docName,
      instances,
      elements,
      elementValues,
      insertions,
      templates,
      templateElements,
      templateElementValues,
      templateInsertions,
      events,
      eventElements,
      eventElementValues,
    };
  },
};
