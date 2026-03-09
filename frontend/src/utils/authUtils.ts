/**
 * 認証ユーティリティ
 * 認証関連の共通機能を提供
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// トークン更新状態の管理（モジュールスコープ）
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string | null) => void;
  reject: (error: Error) => void;
}> = [];

/**
 * 待機中のリクエストキューを処理
 * @param error エラー（nullの場合は成功）
 * @param token 新しいアクセストークン
 */
function processQueue(error: Error | null, token: string | null = null): void {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
}

/**
 * 認証付きAxiosインスタンスの作成
 * 
 * SessionStorageからセッショントークンを自動的に取得し、
 * すべてのリクエストにAuthorizationヘッダーを付与します。
 * 
 * @returns 認証付きAxiosインスタンス
 */
export const createApiClient = (): AxiosInstance => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  
  const client = axios.create({
    baseURL: `${baseURL}`,
    timeout: 120000, // 120秒（2分） - 大量ファイルの署名付きURL生成に対応
    withCredentials: true, // 🔧 修正: CookieをCross-Originリクエストで送受信するために必須
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // リクエストインターセプター: 全てのAPIリクエストに自動的にAuthorizationヘッダーを付与
  client.interceptors.request.use(
    (config) => {
      // LocalStorageからセッショントークンを自動取得
      if (typeof window !== 'undefined') {
        const sessionToken = localStorage.getItem('sessionToken');
        if (sessionToken) {
          // Authorizationヘッダーに自動設定
          config.headers.Authorization = `Bearer ${sessionToken}`;
        }
        // 現在の言語設定を Accept-Language ヘッダーに設定
        const lang = localStorage.getItem('user-locale') || 'ja';
        config.headers['Accept-Language'] = lang;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // レスポンスインターセプター: 401エラー時の自動トークン更新
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // ログイン前のエンドポイント（認証不要）への401エラーはトークン更新をスキップ
      // これらのエンドポイントの401エラーは正常なエラーレスポンス（パスワード間違い、PINコード間違いなど）
      const authEndpoints = [
        '/auth/login',
        '/auth/verify-pin',
        '/auth/resend-pin',
        '/auth/reset-password-request',
        '/auth/reset-password'
      ];
      const isAuthEndpoint = authEndpoints.some(endpoint => 
        originalRequest?.url?.includes(endpoint)
      );

      // ログイン前のエンドポイントへの401エラーはそのまま返す（トークン更新不要）
      if (error.response?.status === 401 && isAuthEndpoint) {
        console.log('[authUtils] 認証エンドポイントの401エラー: トークン更新をスキップします');
        return Promise.reject(error);
      }

      // /auth/refresh への401エラーは無限ループ防止のため特別処理
      if (error.response?.status === 401 && originalRequest?.url?.includes('/auth/refresh')) {
        console.log('[authUtils] リフレッシュトークンが期限切れまたは無効です - ログイン画面を表示します');
        
        // セッション情報をクリア
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sessionToken');
          localStorage.removeItem('tokenExpiresAt');
          localStorage.removeItem('userInfo');
          
          // カスタムイベントを発行してReactの状態遷移を促す
          const event = new CustomEvent('auth:auto-logout', {
            detail: { reason: 'refresh-token-expired' }
          });
          window.dispatchEvent(event);
          console.log('[authUtils] 自動ログアウトイベントを発行しました（理由: リフレッシュトークン期限切れ）');
          
          // フォールバック: イベントリスナーがない場合は100ms後にリロード
          setTimeout(() => {
            if (window.location.pathname !== '/') {
              console.warn('[authUtils] イベントリスナーが応答しないため、ページをリロードします');
              window.location.href = '/';
            }
          }, 100);
        }
        
        return Promise.reject(error);
      }

      // 401エラーでリトライ未実施の場合のみ処理
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        
        // トークン更新中の場合、キューに追加して待機
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(token => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return client(originalRequest);
            })
            .catch(err => Promise.reject(err));
        }

        // リトライフラグを設定
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          console.log('[authUtils] 401エラー検出: トークン更新を試みます');
          
          // 動的インポートで循環参照を回避
          const { authService } = await import('@/services/authService');
          
          // トークン更新を試みる
          const newAccessToken = await authService.refreshAccessToken();

          if (newAccessToken) {
            console.log('[authUtils] トークン更新成功: リクエストをリトライします');
            
            // 待機中のリクエストを処理
            processQueue(null, newAccessToken);

            // 元のリクエストをリトライ
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            return client(originalRequest);
          } else {
            // トークン更新失敗
            console.error('[authUtils] トークン更新失敗');
            processQueue(new Error('トークン更新失敗'), null);
            
            // セッション情報をクリア
            if (typeof window !== 'undefined') {
              localStorage.removeItem('sessionToken');
              localStorage.removeItem('tokenExpiresAt');
              localStorage.removeItem('userInfo');
              
              // カスタムイベントを発行してReactの状態遷移を促す
              const event = new CustomEvent('auth:auto-logout', {
                detail: { reason: 'refresh-failed' }
              });
              window.dispatchEvent(event);
              console.log('[authUtils] 自動ログアウトイベントを発行しました（理由: トークン更新失敗）');
              
              // フォールバック: イベントリスナーがない場合は100ms後にリロード
              setTimeout(() => {
                if (window.location.pathname !== '/') {
                  console.warn('[authUtils] イベントリスナーが応答しないため、ページをリロードします');
                  window.location.href = '/';
                }
              }, 100);
            }
            
            return Promise.reject(error);
          }
        } catch (refreshError) {
          console.error('[authUtils] トークン更新エラー:', refreshError);
          const errorObj = refreshError instanceof Error ? refreshError : new Error('トークン更新中に不明なエラーが発生しました');
          processQueue(errorObj, null);
          
          // トークン更新自体が失敗した場合
          if (typeof window !== 'undefined') {
            localStorage.removeItem('sessionToken');
            localStorage.removeItem('tokenExpiresAt');
            localStorage.removeItem('userInfo');
            
            // カスタムイベントを発行してReactの状態遷移を促す
            const event = new CustomEvent('auth:auto-logout', {
              detail: { reason: 'refresh-error' }
            });
            window.dispatchEvent(event);
            console.log('[authUtils] 自動ログアウトイベントを発行しました（理由: トークン更新エラー）');
            
            // フォールバック: イベントリスナーがない場合は100ms後にリロード
            setTimeout(() => {
              if (window.location.pathname !== '/') {
                console.warn('[authUtils] イベントリスナーが応答しないため、ページをリロードします');
                window.location.href = '/';
              }
            }, 100);
          }
          
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // 401以外のエラーはそのまま返す
      return Promise.reject(error);
    }
  );

  return client;
};
