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
 */
function flattenProperty(
  prop:         Property,
  parentTempId: number | null,
  instanceKey:  string,
  hierarchy:    string,
  counter:      TempIdCounter,
  elements:     MaimlElementInput[],
  values:       MaimlElementValueInput[]
): void {
  const tempId = counter.next();

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
    maiml_line_no:    null,
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

  // ネストされた property
  for (const child of prop.properties ?? []) {
    flattenProperty(
      child,
      tempId,
      instanceKey,
      `${hierarchy}/property[${child.key}]`,
      counter,
      elements,
      values
    );
  }

  // ネストされた content
  for (const child of prop.contents ?? []) {
    flattenContent(
      child,
      tempId,
      instanceKey,
      `${hierarchy}/content[${child.key}]`,
      counter,
      elements,
      values
    );
  }
}

/**
 * Content を再帰的に走査し、MaimlElementInput / MaimlElementValueInput を生成する
 */
function flattenContent(
  cont:         Content,
  parentTempId: number | null,
  instanceKey:  string,
  hierarchy:    string,
  counter:      TempIdCounter,
  elements:     MaimlElementInput[],
  values:       MaimlElementValueInput[]
): void {
  const tempId = counter.next();

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
    format_string:    null,
    units:            cont.units ?? null,
    scale_factor:     cont.scaleFactor ?? null,
    axis:             cont.axis ?? null,
    size_value:       cont.size ?? null,
    element_id_attr:  cont.id ?? null,
    element_ref:      cont.ref ?? null,
    maiml_line_no:    null,
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

  // ネストされた property
  for (const child of cont.properties ?? []) {
    flattenProperty(
      child,
      tempId,
      instanceKey,
      `${hierarchy}/property[${child.key}]`,
      counter,
      elements,
      values
    );
  }

  // ネストされた content
  for (const child of cont.contents ?? []) {
    flattenContent(
      child,
      tempId,
      instanceKey,
      `${hierarchy}/content[${child.key}]`,
      counter,
      elements,
      values
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
  insertions:   MaimlInsertionInput[]
): void {
  const instanceKey = inst.id;

  instances.push({
    instance_type:     instType,
    instance_key:      instanceKey,
    template_ref:      inst.ref ?? null,
    instance_uuid:     inst.uuid ?? null,
    instance_name:     inst.name ?? null,
    instance_line_no:  null,
  });

  // property
  for (const prop of inst.properties ?? []) {
    flattenProperty(
      prop,
      null,
      instanceKey,
      `/${instType}/property[${prop.key}]`,
      counter,
      elements,
      values
    );
  }

  // content
  for (const cont of inst.contents ?? []) {
    flattenContent(
      cont,
      null,
      instanceKey,
      `/${instType}/content[${cont.key}]`,
      counter,
      elements,
      values
    );
  }

  // insertion（Result のみ）
  if (instType === 'result') {
    const r = inst as Result;
    if (r.insertion) {
      insertions.push(toInsertionInput(r.insertion, instanceKey));
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
  values:       MaimlTemplateElementValueInput[]
): void {
  const tempId = counter.next();

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
    maiml_line_no:    null,
  });

  if (prop.value !== undefined && prop.value !== null) {
    values.push({
      _tempElementId: tempId,
      value_idx:      0,
      value:          String(prop.value),
      value_array:    null,
    });
  }

  for (const child of prop.properties ?? []) {
    flattenTemplateProperty(child, tempId, templateKey, `${hierarchy}/property[${child.key}]`, counter, elements, values);
  }
  for (const child of prop.contents ?? []) {
    flattenTemplateContent(child, tempId, templateKey, `${hierarchy}/content[${child.key}]`, counter, elements, values);
  }
}

function flattenTemplateContent(
  cont:         Content,
  parentTempId: number | null,
  templateKey:  string,
  hierarchy:    string,
  counter:      TempIdCounter,
  elements:     MaimlTemplateElementInput[],
  values:       MaimlTemplateElementValueInput[]
): void {
  const tempId = counter.next();

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
    format_string:    null,
    units:            cont.units ?? null,
    scale_factor:     cont.scaleFactor ?? null,
    axis:             cont.axis ?? null,
    size_value:       cont.size ?? null,
    element_id_attr:  cont.id ?? null,
    element_ref:      cont.ref ?? null,
    maiml_line_no:    null,
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

  for (const child of cont.properties ?? []) {
    flattenTemplateProperty(child, tempId, templateKey, `${hierarchy}/property[${child.key}]`, counter, elements, values);
  }
  for (const child of cont.contents ?? []) {
    flattenTemplateContent(child, tempId, templateKey, `${hierarchy}/content[${child.key}]`, counter, elements, values);
  }
}

function processTemplate(
  tmpl:               Template,
  tmplType:           'result' | 'material' | 'condition',
  counter:            TempIdCounter,
  templates:          MaimlTemplateInput[],
  elements:           MaimlTemplateElementInput[],
  values:             MaimlTemplateElementValueInput[],
  insertions:         MaimlTemplateInsertionInput[]
): void {
  const templateKey = tmpl.id;

  templates.push({
    template_type:     tmplType,
    template_key:      templateKey,
    template_uuid:     tmpl.uuid ?? null,
    template_name:     tmpl.name ?? null,
    template_line_no:  null,
  });

  for (const prop of tmpl.properties ?? []) {
    flattenTemplateProperty(prop, null, templateKey, `/template/property[${prop.key}]`, counter, elements, values);
  }
  for (const cont of tmpl.contents ?? []) {
    flattenTemplateContent(cont, null, templateKey, `/template/content[${cont.key}]`, counter, elements, values);
  }

  if (tmpl.insertion) {
    insertions.push({
      _templateKey:  templateKey,
      uri:           tmpl.insertion.uri,
      hash_value:    tmpl.insertion.hash?.value ?? null,
      hash_method:   tmpl.insertion.hash?.method ?? null,
      file_uuid:     tmpl.insertion.uuid ?? null,
      mime_format:   tmpl.insertion.format ?? null,
      maiml_line_no: null,
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
    const parser = new MaimlParserTyped(xmlString);
    const root   = parser.getTypedMaiml();

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

    // ── data セクション ──────────────────────────────────
    const dataSection = root.data;
    if (dataSection?.results) {
      for (const results of dataSection.results) {
        for (const mat of results.materials ?? []) {
          processInstance(mat, 'material', counter, instances, elements, elementValues, insertions);
        }
        for (const cond of results.conditions ?? []) {
          processInstance(cond, 'condition', counter, instances, elements, elementValues, insertions);
        }
        for (const res of results.results ?? []) {
          processInstance(res, 'result', counter, instances, elements, elementValues, insertions);
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
        processTemplate(tmpl, type, counter, templates, templateElements, templateElementValues, templateInsertions);
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
    };
  },
};
