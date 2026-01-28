/**
 * 認証ユーティリティ
 * 認証関連の共通機能を提供
 */

import axios, { AxiosInstance } from 'axios';

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
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // リクエストインターセプター: 全てのAPIリクエストに自動的にAuthorizationヘッダーを付与
  client.interceptors.request.use(
    (config) => {
      // SessionStorageからセッショントークンを自動取得
      if (typeof window !== 'undefined') {
        const sessionToken = sessionStorage.getItem('sessionToken');
        if (sessionToken) {
          // Authorizationヘッダーに自動設定
          config.headers.Authorization = `Bearer ${sessionToken}`;
        }
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return client;
};
