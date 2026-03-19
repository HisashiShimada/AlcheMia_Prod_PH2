/**
 * MaiML 行番号・hierarchy 抽出ユーティリティ
 *
 * @description
 *   `sax` パーサーを使って MaiML XML 文字列を走査し、
 *   各要素の行番号（maiml_line_no）と階層番号（hierarchy: 1 / 1-1 / 1-2-3 形式）を
 *   マップとして返す。
 *
 *   maimlIngestParserService.parseForIngest() の 2 パス目として使用し、
 *   既存の MaimlParserTyped には変更を加えない。
 *
 * @reference maiml2Excel/maimlinstancetoxl.py の addcellgeneralcontainer() 相当
 */

import * as sax from 'sax';

// ============================================================
// 型定義
// ============================================================

/**
 * buildMaimlLineNoMap() の返り値
 */
export interface MaimlLineNoMap {
  /**
   * インスタンス（result / material / condition）の行番号
   * key: instanceKey（@id 属性値）
   */
  instances: Map<string, number>;

  /**
   * テンプレートの行番号
   * key: templateKey（@id 属性値）
   */
  templates: Map<string, number>;

  /**
   * 要素（property / content / uncertainty）の行番号
   * key: `${contextKey}::${hierarchy}`
   *   contextKey = instanceKey または templateKey
   *   hierarchy  = "1" / "2-1" / "2-1-1" 形式
   */
  elements: Map<string, number>;

  /**
   * insertion の行番号
   * key: `${contextKey}::insertion::${index}`（0-origin）
   */
  insertions: Map<string, number>;

  /**
   * event の行番号
   * key: eventKey（@id 属性値、なければ出現順インデックス文字列）
   */
  events: Map<string, number>;

  /**
   * event 直下の property 要素の行番号
   * key: `${eventKey}::${hierarchy}`
   *   eventKey  = event/@id（なければ出現順インデックス文字列）
   *   hierarchy = "1" / "2" / "3" 形式（event直下の連番）
   */
  eventElements: Map<string, number>;
}

// ============================================================
// 定数
// ============================================================

/** property / content / uncertainty はカウント対象 */
const TARGET_ELEMENT_TAGS = new Set(['property', 'content', 'uncertainty']);

/** インスタンスタグ */
const INSTANCE_TAGS = new Set(['result', 'material', 'condition']);

/** テンプレートタグ（名前空間プレフィックスを除いた末尾部分） */
const TEMPLATE_TAG_SUFFIXES = ['materialtemplate', 'conditiontemplate', 'resulttemplate'];

function isTemplateTag(name: string): boolean {
  const lower = name.toLowerCase();
  return TEMPLATE_TAG_SUFFIXES.some((s) => lower.endsWith(s));
}

// ============================================================
// スタック要素
// ============================================================

interface StackFrame {
  /** タグ名（小文字） */
  name: string;
  /** この要素がターゲット要素（property/content/uncertainty）か */
  isTarget: boolean;
  /** この要素の hierarchy 文字列（ターゲット要素のみ） */
  hierarchy: string;
  /** 直接の子ターゲット要素のカウンター（兄弟順） */
  childCount: number;
}

// ============================================================
// メイン関数
// ============================================================

/**
 * MaiML XML を走査して行番号・hierarchy マップを構築する
 *
 * @param xmlString - MaiML XML 文字列
 * @returns MaimlLineNoMap
 */
export function buildMaimlLineNoMap(xmlString: string): MaimlLineNoMap {
  const map: MaimlLineNoMap = {
    instances:     new Map<string, number>(),
    templates:     new Map<string, number>(),
    elements:      new Map<string, number>(),
    insertions:    new Map<string, number>(),
    events:        new Map<string, number>(),
    eventElements: new Map<string, number>(),
  };

  // xmlns を除去（maiml2Excel と同様の前処理）
  const cleanXml = xmlString.replace(/xmlns(?::\w+)?="[^"]*"/g, '');

  const parser = sax.parser(true /* strict */);

  // ── コンテキスト管理 ──────────────────────────────
  /** 現在処理中のインスタンスまたはテンプレートのキー */
  let currentContextKey: string | null = null;
  /** 現在がインスタンスか（false = テンプレート） */
  let currentIsInstance  = false;
  /** 現在がテンプレートか */
  let currentIsTemplate  = false;

  /** 要素スタック */
  const elemStack: StackFrame[] = [];

  /** 現在のコンテキスト内の insertion カウンター */
  const insertionCounters = new Map<string, number>();

  /** event の出現順インデックス */
  let eventIndex = 0;

  /** 現在処理中の event キー（@id 値 or 出現順文字列）。null = event外 */
  let currentEventKey: string | null = null;
  /** event直下の property カウンター */
  let eventPropertyCount = 0;

  // ── onopentag ────────────────────────────────────
  parser.onopentag = function (node: sax.Tag | sax.QualifiedTag) {
    const rawName  = node.name;
    const lname    = rawName.toLowerCase();
    // strict モード（true）では attributes は Record<string, string>
    const attrs    = node.attributes as Record<string, string>;
    const line     = (parser as unknown as { line: number }).line + 1;

    // ── インスタンス ──
    if (INSTANCE_TAGS.has(lname)) {
      const instanceKey = attrs['id'] ?? attrs['ID'] ?? '';
      currentContextKey = instanceKey;
      currentIsInstance  = true;
      currentIsTemplate  = false;
      elemStack.length   = 0;
      // インスタンス自体をスタックに積む（子カウンター管理ルート）
      elemStack.push({ name: lname, isTarget: false, hierarchy: '', childCount: 0 });

      if (instanceKey) {
        map.instances.set(instanceKey, line);
      }
      return;
    }

    // ── テンプレート ──
    if (isTemplateTag(lname)) {
      const templateKey = attrs['id'] ?? attrs['ID'] ?? '';
      currentContextKey = templateKey;
      currentIsInstance  = false;
      currentIsTemplate  = true;
      elemStack.length   = 0;
      elemStack.push({ name: lname, isTarget: false, hierarchy: '', childCount: 0 });

      if (templateKey) {
        map.templates.set(templateKey, line);
      }
      return;
    }

    // ── ターゲット要素（property / content / uncertainty）──
    if ((currentIsInstance || currentIsTemplate) && TARGET_ELEMENT_TAGS.has(lname)) {
      // 親スタックフレームの childCount をインクリメント
      const parent = elemStack[elemStack.length - 1];
      parent.childCount++;
      const myIdx = parent.childCount;

      // hierarchy 計算
      const hie = parent.hierarchy
        ? `${parent.hierarchy}-${myIdx}`
        : String(myIdx);

      // マップに登録
      const contextKey = currentContextKey ?? '';
      const mapKey     = `${contextKey}::${hie}`;
      map.elements.set(mapKey, line);

      // スタックに積む
      elemStack.push({ name: lname, isTarget: true, hierarchy: hie, childCount: 0 });
      return;
    }

    // ── insertion ──
    if (lname === 'insertion' && currentContextKey) {
      const contextKey = currentContextKey;
      const idx = insertionCounters.get(contextKey) ?? 0;
      const mapKey = `${contextKey}::insertion::${idx}`;
      map.insertions.set(mapKey, line);
      insertionCounters.set(contextKey, idx + 1);
      return;
    }

    // ── event ──
    if (lname === 'event') {
      const eid    = attrs['id'] ?? attrs['ID'] ?? '';
      const mapKey = eid || String(eventIndex);
      map.events.set(mapKey, line);
      currentEventKey    = mapKey;
      eventPropertyCount = 0;
      eventIndex++;
      return;
    }

    // ── event 直下の property（eventElements マップ） ──
    // event コンテキスト内かつ instance/template コンテキスト外のとき
    if (currentEventKey !== null && !currentIsInstance && !currentIsTemplate && lname === 'property') {
      eventPropertyCount++;
      const mapKey = `${currentEventKey}::${eventPropertyCount}`;
      map.eventElements.set(mapKey, line);
      return;
    }
  };

  // ── onclosetag ───────────────────────────────────
  parser.onclosetag = function (name: string) {
    const lname = name.toLowerCase();

    // インスタンス終了
    if (INSTANCE_TAGS.has(lname)) {
      currentContextKey = null;
      currentIsInstance  = false;
      elemStack.length   = 0;
      return;
    }

    // テンプレート終了
    if (isTemplateTag(lname)) {
      currentContextKey = null;
      currentIsTemplate  = false;
      elemStack.length   = 0;
      return;
    }

    // event 終了
    if (lname === 'event') {
      currentEventKey    = null;
      eventPropertyCount = 0;
      return;
    }

    // ターゲット要素終了: スタックの末尾がこのタグなら pop
    if (
      (currentIsInstance || currentIsTemplate) &&
      TARGET_ELEMENT_TAGS.has(lname) &&
      elemStack.length > 0 &&
      elemStack[elemStack.length - 1].name === lname
    ) {
      elemStack.pop();
    }
  };

  // ── エラーハンドリング ───────────────────────────
  parser.onerror = function (err: Error) {
    // パースエラーは警告に留め、取得できた分のマップを返す
    console.warn('[maimlLineNoExtractor] sax parse warning:', err.message);
    parser.resume(); // strict モードのエラーをリセットして継続
  };

  // ── 実行 ──────────────────────────────────────────
  try {
    parser.write(cleanXml).close();
  } catch (err) {
    console.warn('[maimlLineNoExtractor] parse aborted:', err);
  }

  return map;
}
