/**
 * トランジションセット ジェネレーターサービス
 *
 * @description MAIMLファイルの内容を解析し、セマンティック検索用の
 *              4軸正規化テキスト（input/transition/output/structure）と
 *              メタデータを生成する。
 * @remarks
 * 新規実装（Reference版に相当するものなし）
 * MaimlParserTyped を使用してMAIMLを解析
 */

import { v5 as uuidv5 } from 'uuid';
import { MaimlParserTyped } from '../utils/maimlParserTyped';
import { TransitionSetUpsertData } from '../types/semanticSearch';
import type { Method, Transition, Place, Arc } from '../types/maiml-unified';

/** file_id生成用UUIDネームスペース */
const FILE_ID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/** Embedding生成時に使用するモデルバージョン */
const EMBEDDING_MODEL_VERSION = 'embeddinggemma-768d-v1';
/** 正規化テンプレートバージョン */
const NORM_TEMPLATE_VERSION = 'v2.5';

/**
 * ファイルパスからfile_id（UUID v5）を生成
 */
function generateFileId(filePath: string): string {
  return uuidv5(filePath, FILE_ID_NAMESPACE);
}

/**
 * S3/Swiftのファイルパスからプロジェクト名を抽出
 *
 * @example
 * "projects/my_project/my_project.maiml" → "my_project"
 * "formats/dept_001/material/template.xml" → null
 */
function extractProjectName(filePath: string): string | null {
  const match = filePath.match(/^projects\/([^/]+)\//);
  return match ? match[1] : null;
}

/**
 * Place情報を整形してInputテキストを生成
 * 形式: INPUT:\nPLACES: p1, p2\nTEMPLATES:\n  - MT: xxx\n  - CT: yyy
 */
function buildInputText(
  inputPlaces: Place[],
  method: Method
): string {
  const placeIds = inputPlaces.map((p) => p.id ?? '').filter(Boolean);
  const materialTemplates = (method.materialTemplates ?? [])
    .map((t) => `  - MT: ${t.id ?? ''}`)
    .join('\n');
  const conditionTemplates = (method.conditionTemplates ?? [])
    .map((t) => `  - CT: ${t.id ?? ''}`)
    .join('\n');

  const templateLines = [materialTemplates, conditionTemplates]
    .filter(Boolean)
    .join('\n');

  return [
    'INPUT:',
    `PLACES: ${placeIds.join(', ') || '(none)'}`,
    'TEMPLATES:',
    templateLines || '  (none)',
  ].join('\n');
}

/**
 * TransitionとInstruction情報からTransitionテキストを生成
 * 形式: TRANSITION: {technique}\nINSTRUCTIONS:\n  - desc1\n  - desc2
 */
function buildTransitionText(
  _transition: Transition,
  instructionDescs: string[],
  technique: string | null
): string {
  const tech = technique ?? '(unknown)';
  const instrLines = instructionDescs.length > 0
    ? instructionDescs.map((d) => `  - ${d}`).join('\n')
    : '  (none)';

  return [
    `TRANSITION: ${tech}`,
    'INSTRUCTIONS:',
    instrLines,
  ].join('\n');
}

/**
 * Place情報を整形してOutputテキストを生成
 * 形式: OUTPUT:\nPLACES: p3, p4\nTEMPLATES:\n  - RT: zzz
 */
function buildOutputText(
  outputPlaces: Place[],
  method: Method
): string {
  const placeIds = outputPlaces.map((p) => p.id ?? '').filter(Boolean);
  const resultTemplates = (method.resultTemplates ?? [])
    .map((t) => `  - RT: ${t.id ?? ''}`)
    .join('\n');

  return [
    'OUTPUT:',
    `PLACES: ${placeIds.join(', ') || '(none)'}`,
    'TEMPLATES:',
    resultTemplates || '  (none)',
  ].join('\n');
}

/**
 * 構造情報からStructureテキストを生成
 * 形式: STRUCTURE:\nIN: PLACES=N, MT=N, CT=N, RT=N\nOUT: PLACES=N, MT=N, CT=N, RT=N
 */
function buildStructureText(
  inputPlaceCount: number,
  outputPlaceCount: number,
  inputMtCount: number,
  inputCtCount: number,
  inputRtCount: number,
  outputMtCount: number,
  outputCtCount: number,
  outputRtCount: number
): string {
  return [
    'STRUCTURE:',
    `IN: PLACES=${inputPlaceCount}, MT=${inputMtCount}, CT=${inputCtCount}, RT=${inputRtCount}`,
    `OUT: PLACES=${outputPlaceCount}, MT=${outputMtCount}, CT=${outputCtCount}, RT=${outputRtCount}`,
  ].join('\n');
}

/**
 * 1つのMethodから全トランジションセットのメタデータを生成（ベクトルなし）
 *
 * @param method - Methodオブジェクト
 * @param organizationId - 組織ID
 * @param filePath - ファイルパス（organization_id省略の相対パス）
 * @param fileId - ファイルID（UUID）
 * @param projectName - プロジェクト名（nullはformats等）
 * @param technique - 分析手法コード（nullは不明）
 * @param parser - MaimlParserTyped インスタンス
 * @returns トランジションセットデータ配列（ベクトルフィールドは空配列）
 */
function generateFromMethod(
  method: Method,
  organizationId: string,
  filePath: string,
  fileId: string,
  projectName: string | null,
  technique: string | null,
  parser: MaimlParserTyped
): Omit<TransitionSetUpsertData, 'emb_input' | 'emb_transition' | 'emb_output' | 'emb_structure'>[] {
  const pnml = method.pnml;
  if (!pnml) return [];

  // method_uuid はmethod.idから取得（UUIDでない場合はUUID v5で変換）
  let methodUuid: string;
  if (method.id && /^[0-9a-f-]{36}$/i.test(method.id)) {
    methodUuid = method.id;
  } else {
    methodUuid = uuidv5(`${filePath}::${method.id ?? 'method'}`, FILE_ID_NAMESPACE);
  }

  const result: Omit<TransitionSetUpsertData, 'emb_input' | 'emb_transition' | 'emb_output' | 'emb_structure'>[] = [];

  // Placeマップ（id → Place）
  const placeMap = new Map<string, Place>();
  const places: Place[] = pnml.places ?? [];
  for (const p of places) {
    if (p.id) placeMap.set(p.id, p);
  }

  // Arc一覧
  const arcs: Arc[] = pnml.arcs ?? [];

  // Transition一覧
  const transitions: Transition[] = pnml.transitions ?? [];

  for (const transition of transitions) {
    const transitionId = transition.id;
    if (!transitionId) continue;

    // arc からinput/output placeを特定
    const inputPlaceIds: string[] = [];
    const outputPlaceIds: string[] = [];

    for (const arc of arcs) {
      if (arc.target === transitionId && arc.source && placeMap.has(arc.source)) {
        inputPlaceIds.push(arc.source);
      }
      if (arc.source === transitionId && arc.target && placeMap.has(arc.target)) {
        outputPlaceIds.push(arc.target);
      }
    }

    const inputPlaces = inputPlaceIds.map((id) => placeMap.get(id)!);
    const outputPlaces = outputPlaceIds.map((id) => placeMap.get(id)!);

    // MT/CT/RTカウント（materialTemplates/conditionTemplates/resultTemplatesをplaceRefベースでカウント）
    const countMT = (method.materialTemplates ?? []).length;
    const countCT = (method.conditionTemplates ?? []).length;
    const countRT = (method.resultTemplates ?? []).length;

    // Instruction情報取得
    let instructionIds: string[] | null = null;
    let instructionDescs: string[] | null = null;
    try {
      const instrId = parser.getInstructionIdByTransitionId(transitionId);
      if (instrId) {
        instructionIds = [instrId];
        instructionDescs = [instrId]; // descが取れない場合はIDで代替
      }
    } catch {
      // Instruction取得失敗は無視
    }

    // 4軸テキスト生成
    const inputText = buildInputText(inputPlaces, method);
    const transitionText = buildTransitionText(
      transition,
      instructionDescs ?? [],
      technique
    );
    const outputText = buildOutputText(outputPlaces, method);
    const structureText = buildStructureText(
      inputPlaceIds.length,
      outputPlaceIds.length,
      countMT, countCT, 0, // input RT = 0（出力側）
      0, countCT, countRT  // output MT = 0（入力側）
    );

    result.push({
      organization_id: organizationId,
      project_name: projectName,
      file_id: fileId,
      file_path: filePath,
      method_uuid: methodUuid,
      transition_id: transitionId,
      instruction_ids: instructionIds,
      instruction_descs: instructionDescs,
      input_place_ids: inputPlaceIds,
      output_place_ids: outputPlaceIds,
      input_place_count: inputPlaceIds.length,
      output_place_count: outputPlaceIds.length,
      input_text: inputText,
      transition_text: transitionText,
      output_text: outputText,
      structure_text: structureText,
      input_mt_count: countMT,
      input_ct_count: countCT,
      input_rt_count: 0,
      output_mt_count: 0,
      output_ct_count: countCT,
      output_rt_count: countRT,
      technique: technique,
      embedding_model_version: EMBEDDING_MODEL_VERSION,
      norm_template_version: NORM_TEMPLATE_VERSION,
    });
  }

  return result;
}

/**
 * MAIMLコンテンツから全トランジションセットのメタデータを生成（ベクトルなし）
 *
 * @param maimlContent - MAIMLファイル文字列
 * @param organizationId - 組織ID
 * @param filePath - ファイルパス（organization_id省略の相対パス）
 * @param technique - 分析手法コード（自動検出、または明示的に指定）
 * @returns トランジションセットデータ配列（ベクトルフィールドは空配列）
 */
export function generateTransitionSetMetadata(
  maimlContent: string,
  organizationId: string,
  filePath: string,
  technique?: string | null
): Omit<TransitionSetUpsertData, 'emb_input' | 'emb_transition' | 'emb_output' | 'emb_structure'>[] {
  const parser = new MaimlParserTyped(maimlContent);
  const methods = parser.getMethods();

  const fileId = generateFileId(filePath);
  const projectName = extractProjectName(filePath);

  // techniqueが未指定の場合はDocumentから自動抽出を試みる
  let resolvedTechnique = technique ?? null;
  if (resolvedTechnique === undefined || resolvedTechnique === null) {
    try {
      const doc = parser.getDocument();
      // document.technique または document.title からtechniqueを推測
      const title = (doc as any)?.title ?? '';
      if (typeof title === 'string' && title.length > 0) {
        // タイトルから既知のtechniqueキーワードを検出
        const knownTechniques = ['RAMAN', 'XRF', 'GC-MS', 'GCMS', 'NMR', 'XRD', 'TEM', 'SEM', 'AFM', 'FTIR'];
        for (const tech of knownTechniques) {
          if (title.toUpperCase().includes(tech.replace('-', ''))) {
            resolvedTechnique = tech;
            break;
          }
        }
      }
    } catch {
      // Document取得失敗は無視
    }
  }

  const allSets: Omit<TransitionSetUpsertData, 'emb_input' | 'emb_transition' | 'emb_output' | 'emb_structure'>[] = [];

  for (const method of methods) {
    const sets = generateFromMethod(
      method,
      organizationId,
      filePath,
      fileId,
      projectName,
      resolvedTechnique,
      parser
    );
    allSets.push(...sets);
  }

  return allSets;
}
