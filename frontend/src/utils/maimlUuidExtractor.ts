/**
 * MAIML UUID抽出ユーティリティ
 *
 * MAIMLデータから各要素の UUID を抽出し、エディタ状態管理用の
 * ExtractedUuids オブジェクトとして返す。
 *
 * @version 1.0.0
 * @date 2026-05-21
 */

import { MaimlParserTyped } from './maimlParserTyped';
import type { ExtractedUuids } from '@/types/editor';
import type { Method, Template } from '@/types/maiml-unified';

/**
 * MAIML文字列から各要素のUUIDを抽出する。
 *
 * - place / transition / arc の uuid を抽出（オプション属性のため未設定の場合は空文字）
 * - template（protocol/method/program の全レベル）の uuid を抽出
 * - instruction の uuid を抽出
 * - pnml / program / method / protocol の uuid を抽出
 *
 * @param maimlData - MAIML XML 文字列
 * @returns ExtractedUuids オブジェクト
 */
export function extractUuidsFromMaiml(maimlData: string): ExtractedUuids {
  const result: ExtractedUuids = {
    places: new Map<string, string>(),
    transitions: new Map<string, string>(),
    arcs: new Map<string, string>(),
    templates: new Map<string, string>(),
    instructions: new Map<string, string>(),
    protocol: '',
    methods: new Map<string, string>(),
    pnmls: new Map<string, string>(),
    programs: new Map<string, string>(),
    dataUuid: undefined,
    eventLogUuid: undefined,
  };

  try {
    const parser = new MaimlParserTyped(maimlData);

    // ── protocol UUID ──────────────────────────────────────────────────────
    try {
      const protocol = parser.getProtocol?.();
      if (protocol?.uuid) {
        result.protocol = protocol.uuid;
      }
    } catch {
      // getProtocol が存在しない場合は XML から直接取得を試みる
      const protocolUuidMatch = maimlData.match(/<protocol[^>]*>[\s\S]*?<uuid>([\s\S]*?)<\/uuid>/);
      if (protocolUuidMatch) {
        result.protocol = protocolUuidMatch[1].trim();
      }
    }

    // ── method / pnml / program / place / transition / arc / instruction ───
    const methods: Method[] = parser.getMethods();

    methods.forEach((method: Method) => {
      const methodId = method.id;
      if (!methodId) return;

      // method UUID
      if (method.uuid) {
        result.methods.set(methodId, method.uuid);
      }

      // pnml UUID
      if (method.pnml?.uuid) {
        result.pnmls.set(methodId, method.pnml.uuid);
      }

      // program UUID（program は Program[] 配列）
      const program = Array.isArray(method.program) ? method.program[0] : undefined;
      if (program?.uuid) {
        result.programs.set(methodId, program.uuid);
      }

      // place UUID（uuid はオプション）
      const places = method.pnml?.places ?? [];
      places.forEach((place) => {
        if (place.id && place.uuid) {
          result.places.set(place.id, place.uuid);
        }
      });

      // transition UUID（uuid はオプション）
      const transitions = method.pnml?.transitions ?? [];
      transitions.forEach((transition) => {
        if (transition.id && transition.uuid) {
          result.transitions.set(transition.id, transition.uuid);
        }
      });

      // arc UUID（uuid はオプション）
      const arcs = method.pnml?.arcs ?? [];
      arcs.forEach((arc) => {
        if (arc.id && arc.uuid) {
          result.arcs.set(arc.id, arc.uuid);
        }
      });

      // instruction UUID
      const instructions = program?.instructions ?? [];
      instructions.forEach((instruction) => {
        if (instruction.id && instruction.uuid) {
          result.instructions.set(instruction.id, instruction.uuid);
        }
      });

      // program レベル template UUID
      const programTemplates: Template[] = [
        ...(program?.materialTemplates ?? []),
        ...(program?.conditionTemplates ?? []),
        ...(program?.resultTemplates ?? []),
      ];
      programTemplates.forEach((tmpl) => {
        if (tmpl.id && tmpl.uuid) {
          result.templates.set(tmpl.id, tmpl.uuid);
        }
      });

      // method レベル template UUID
      const methodTemplates: Template[] = [
        ...(method.materialTemplates ?? []),
        ...(method.conditionTemplates ?? []),
        ...(method.resultTemplates ?? []),
      ];
      methodTemplates.forEach((tmpl) => {
        if (tmpl.id && tmpl.uuid) {
          result.templates.set(tmpl.id, tmpl.uuid);
        }
      });
    });

    // ── protocol レベル template UUID ────────────────────────────────────
    try {
      const { material, condition, result: resultTemplates } = parser.getTemplates();
      const protocolLevelTemplates = [
        // protocol 直下 (methodId が null / undefined) のもの
        ...material.filter((t: Template) => t.methodId === null || t.methodId === undefined),
        ...condition.filter((t: Template) => t.methodId === null || t.methodId === undefined),
        ...resultTemplates.filter((t: Template) => t.methodId === null || t.methodId === undefined),
      ];
      protocolLevelTemplates.forEach((tmpl: Template) => {
        if (tmpl.id && tmpl.uuid) {
          result.templates.set(tmpl.id, tmpl.uuid);
        }
      });
    } catch {
      // getTemplates が利用できない場合は無視
    }

    // ── data / eventLog UUID ──────────────────────────────────────────────
    const dataObj = parser.getData();
    if (dataObj?.uuid) {
      result.dataUuid = dataObj.uuid;
    }
    const eventLogObj = parser.getEventLog();
    if (eventLogObj?.uuid) {
      result.eventLogUuid = eventLogObj.uuid;
    }

  } catch (err) {
    console.error('[maimlUuidExtractor] UUID抽出エラー:', err);
  }

  return result;
}

/**
 * 空の ExtractedUuids を生成する（初期化ヘルパー）
 */
export function createEmptyExtractedUuids(): ExtractedUuids {
  return {
    places: new Map(),
    transitions: new Map(),
    arcs: new Map(),
    templates: new Map(),
    instructions: new Map(),
    protocol: '',
    methods: new Map(),
    pnmls: new Map(),
    programs: new Map(),
  };
}
