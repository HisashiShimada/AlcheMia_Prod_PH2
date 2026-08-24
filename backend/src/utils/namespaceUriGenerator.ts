/**
 * 名前空間URI自動生成ユーティリティ（バックエンド）
 *
 * フロントエンド版 (frontend/src/utils/namespaceUriGenerator.ts) と同一のロジック。
 *
 * URI生成ルール:
 *   組織URI           : https://{organization_cd}.Alchemia.co.jp
 *   組織+グループURI  : https://{organization_cd}.Alchemia.co.jp/{group_cd}
 *   組織+グループ+レイヤーURI : https://{organization_cd}.Alchemia.co.jp/{group_cd}/{layer...}
 *   個人URI           : https://{organization_cd}.Alchemia.co.jp/{login_name}
 *   重複時            : {uri}1, {uri}2, ... と連番付与
 *
 * @module namespaceUriGenerator
 */

/** 固定ドメインサフィックス */
const DOMAIN_SUFFIX = 'Alchemia.co.jp';

/**
 * 名前空間URIを生成する
 *
 * @param organizationCd - 組織CD（必須）
 * @param groupCd        - 組織階層グループCD（任意）
 * @param layerParts     - 追加レイヤー（任意、複数可）
 * @param loginName      - 個人ログイン名（メールアドレスの @ より前の部分、任意）
 * @returns 生成されたURI文字列（末尾スラッシュなし）
 *
 * @example
 * generateNamespaceUri('ORG001')
 * // => 'https://ORG001.Alchemia.co.jp'
 *
 * generateNamespaceUri('ORG001', 'RD')
 * // => 'https://ORG001.Alchemia.co.jp/RD'
 *
 * generateNamespaceUri('ORG001', 'RD', ['layer1'])
 * // => 'https://ORG001.Alchemia.co.jp/RD/layer1'
 *
 * generateNamespaceUri('ORG001', undefined, undefined, 'taro.yamada')
 * // => 'https://ORG001.Alchemia.co.jp/taro.yamada'
 */
export function generateNamespaceUri(
  organizationCd: string,
  groupCd?: string,
  layerParts?: string[],
  loginName?: string,
): string {
  const orgPart = organizationCd.trim();
  if (!orgPart) return '';

  const base = `https://${orgPart}.${DOMAIN_SUFFIX}`;
  const parts: string[] = [];

  if (loginName?.trim()) {
    // 個人URI: 組織ドメイン + ログイン名
    parts.push(loginName.trim());
  } else {
    if (groupCd?.trim()) {
      parts.push(groupCd.trim());
    }
    if (layerParts && layerParts.length > 0) {
      layerParts.forEach(layer => {
        if (layer?.trim()) parts.push(layer.trim());
      });
    }
  }

  if (parts.length === 0) {
    return base;
  }

  return `${base}/${parts.join('/')}`;
}

/**
 * URI重複時に連番サフィックスを付与して一意なURIを返す
 *
 * @param uri          候補URI
 * @param existingUris 既存のURI一覧
 * @returns 一意なURI（重複なければそのまま返す）
 *
 * @example
 * resolveUriConflict('https://ORG001.Alchemia.co.jp/taro.yamada', [
 *   'https://ORG001.Alchemia.co.jp/taro.yamada'
 * ])
 * // => 'https://ORG001.Alchemia.co.jp/taro.yamada1'
 */
export function resolveUriConflict(
  uri: string,
  existingUris: string[],
): string {
  if (!existingUris.includes(uri)) {
    return uri;
  }

  let counter = 1;
  while (existingUris.includes(`${uri}${counter}`)) {
    counter++;
  }

  return `${uri}${counter}`;
}
