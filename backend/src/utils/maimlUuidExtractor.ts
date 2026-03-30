/**
 * MAIMLファイルから <uuid> 要素の値を抽出するユーティリティ
 *
 * buildDataXML() / buildEventLogXML() で既存 UUID を再利用するために使用する。
 * 同じ要素（同じ id 属性を持つ要素）には常に同じ UUID を出力し、
 * MAIMLファイルの改竄防止要件に対応する。
 *
 * ### UUID 識別キーの設計
 *
 * | 要素           | 識別キー形式             | 例                              |
 * |----------------|------------------------|---------------------------------|
 * | `<data>`       | `"data"`               | `"data"`                        |
 * | `<results>`    | `"results:{id}"`       | `"results:results_method01_1"`  |
 * | `<material>`   | `"material:{id}"`      | `"material:place_001"`          |
 * | `<condition>`  | `"condition:{id}"`     | `"condition:place_002"`         |
 * | `<result>`     | `"result:{id}"`        | `"result:place_003"`            |
 * | `<eventLog>`   | `"eventLog"`           | `"eventLog"`                    |
 * | `<log>`        | `"log:{id}"`           | `"log:log_1"`                   |
 * | `<trace>`      | `"trace:{id}"`         | `"trace:trace_1"`               |
 * | `<event>`      | `"event:{id}"`         | `"event:event_report_user_123"` |
 * | `<evnet>`      | `"evnet:{id}"`         | `"evnet:evnet_1"`               |
 */

/**
 * 対象要素名のリスト
 * id 属性を持つ要素（識別キー = `{tagName}:{id}`）
 */
const ID_TAGGED_ELEMENTS = [
  'results',
  'material',
  'condition',
  'result',
  'log',
  'trace',
  'event',
  'evnet',
] as const;

/**
 * id 属性を持たない単独要素（識別キー = `{tagName}`）
 */
const SINGLETON_ELEMENTS = ['data', 'eventLog'] as const;

/**
 * MAIML XML 文字列から各要素の UUID マッピングを抽出する
 *
 * 各要素の `<uuid>` 子要素の値を読み取り、識別キー → UUID 値の Map を返す。
 * 識別キーが重複する場合（同じ id が複数存在する不正 XML）は最初に見つかった値を使用する。
 *
 * @param maimlContent - MAIML XML 文字列
 * @returns 識別キー → UUID 値の Map。抽出できなかった場合は空 Map。
 */
export function extractUuidsFromMaiml(maimlContent: string): Map<string, string> {
  const uuidMap = new Map<string, string>();

  if (!maimlContent) {
    return uuidMap;
  }

  // ── 1. id 属性を持つ要素の抽出 ──────────────────────────────────────────
  // パターン: <tagName ...id="VALUE"...> ... <uuid>UUID_VALUE</uuid> ...
  // 要素の開きタグ直後の <uuid> を対象とする（子要素の uuid を混在させないよう
  // 開きタグ〜最初の </uuid> までを最短マッチで取得）
  for (const tagName of ID_TAGGED_ELEMENTS) {
    // [\s\S]*? で開きタグ直後から最初の <uuid> までを最短マッチ
    const pattern = new RegExp(
      `<${tagName}[^>]*\\sid="([^"]+)"[^>]*>(?:[^<]|<(?!uuid[^>]*>))*?<uuid>([^<]+)<\\/uuid>`,
      'g'
    );

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(maimlContent)) !== null) {
      const id = match[1];
      const uuid = match[2].trim();
      const key = `${tagName}:${id}`;
      // 最初に見つかった値を優先（重複キーは上書きしない）
      if (!uuidMap.has(key) && uuid) {
        uuidMap.set(key, uuid);
      }
    }
  }

  // ── 2. singleton 要素（id 属性なし）の抽出 ───────────────────────────────
  for (const tagName of SINGLETON_ELEMENTS) {
    const pattern = new RegExp(
      `<${tagName}[^>]*>(?:[^<]|<(?!uuid[^>]*>))*?<uuid>([^<]+)<\\/uuid>`,
      'g'
    );

    const match = pattern.exec(maimlContent);
    if (match) {
      const uuid = match[1].trim();
      if (uuid) {
        uuidMap.set(tagName, uuid);
      }
    }
  }

  return uuidMap;
}

/**
 * 識別キーに対応する UUID を返す
 *
 * - existingUuids に識別キーが存在する場合: 既存 UUID を返す（再利用）
 * - 存在しない場合: `randomUUID()` で新規生成して返す
 *
 * @param key          - UUID 識別キー（例: `"data"`, `"results:results_m01_1"`）
 * @param existingUuids - extractUuidsFromMaiml() が返した UUID マップ
 * @param randomUUID   - UUID 生成関数（テスト時にモック可能にするため引数で受け取る）
 * @returns UUID 文字列
 */
export function resolveUuid(
  key: string,
  existingUuids: Map<string, string> | undefined,
  randomUUID: () => string
): string {
  if (existingUuids) {
    const existing = existingUuids.get(key);
    if (existing) {
      return existing;
    }
  }
  return randomUUID();
}
