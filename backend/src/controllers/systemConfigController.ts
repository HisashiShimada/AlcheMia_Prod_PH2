/**
 * システム設定値取得コントローラー
 *
 * ホワイトリスト方式で環境変数をフロントエンドに公開する。
 * 機密情報（DB接続文字列・秘密鍵等）が誤って露出しないよう、
 * 返却可能な設定キーを SYSTEM_CONFIG_WHITELIST に明示的に列挙する。
 *
 * GET /api/v1/provider/system-config
 *   - クエリパラメータ `keys` でカンマ区切りのキーを指定可能
 *     例: GET /api/v1/provider/system-config?keys=defaultRetentionDays
 *   - `keys` 省略時はホワイトリスト全件を返却
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * 公開可能な設定キーのホワイトリスト
 *
 * キー   : フロントエンドが受け取るプロパティ名（camelCase）
 * 値(関数): 呼び出し時点の環境変数から値を解決するファクトリ
 *
 * 将来追加する設定はここに追記するだけで対応できる。
 */
const SYSTEM_CONFIG_WHITELIST: Record<string, () => string | number | boolean> = {
  // MaiML公開機能: デフォルト保持日数（日）
  defaultRetentionDays: () => parseInt(process.env.RETENTION_DAYS_DEFAULT ?? '30', 10),
  // 将来の追加設定はここに追記
};

/**
 * システム設定値を返却するハンドラ
 *
 * GET /api/v1/provider/system-config
 * GET /api/v1/provider/system-config?keys=defaultRetentionDays
 */
export async function getSystemConfig(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // クエリパラメータ keys をパース
    const rawKeys = req.query.keys;
    let requestedKeys: string[] | null = null;

    if (rawKeys) {
      requestedKeys = String(rawKeys)
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
    }

    // ホワイトリストから取得対象のキーを絞り込む
    const targetKeys = requestedKeys
      ? requestedKeys.filter((k) => k in SYSTEM_CONFIG_WHITELIST)
      : Object.keys(SYSTEM_CONFIG_WHITELIST);

    // 存在しないキーが指定された場合は 400 を返す
    if (requestedKeys) {
      const unknownKeys = requestedKeys.filter((k) => !(k in SYSTEM_CONFIG_WHITELIST));
      if (unknownKeys.length > 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CONFIG_KEY',
            message: `不明な設定キーが含まれています: ${unknownKeys.join(', ')}`,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || uuidv4(),
          },
        });
        return;
      }
    }

    // 値を解決してレスポンスを構築
    const configData: Record<string, string | number | boolean> = {};
    for (const key of targetKeys) {
      configData[key] = SYSTEM_CONFIG_WHITELIST[key]();
    }

    res.json({
      success: true,
      data: configData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });
  } catch (error) {
    next(error);
  }
}
