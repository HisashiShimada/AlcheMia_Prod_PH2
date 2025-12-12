'use client';

import React from 'react';
import { Card, Button, Space, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import informationDownloadData from '../data/information-download.json';
import organizationsData from '../data/organizations.json';

/**
 * 組織データの型定義
 */
interface Organization {
  id: number;
  organization_id: string;
  organization_name: string;
  organization_name_en: string;
  description: string;
  status: string;
  user_count: number;
  admin_count: number;
  storage_used_gb: number;
  storage_limit_gb: number;
  language: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

/**
 * 情報ダウンロード画面モック
 * 組織統計情報のCSVダウンロード機能を提供
 */
const InformationDownloadMock: React.FC = () => {
  const { title, downloadEnabled } = informationDownloadData;

  /**
   * JSONデータをCSV形式に変換
   */
  const convertToCSV = (data: Organization[]): string => {
    if (data.length === 0) return '';

    // CSVヘッダー（日本語）
    const headers = [
      'ID',
      '組織ID',
      '組織名',
      '組織名（英語）',
      '説明',
      'ステータス',
      'ユーザー数',
      '管理者数',
      'ストレージ使用量(GB)',
      'ストレージ上限(GB)',
      '言語',
      'タイムゾーン',
      '作成日時',
      '更新日時'
    ];

    // ヘッダー行
    const csvHeaders = headers.join(',');

    // データ行
    const csvRows = data.map((org) => {
      return [
        org.id,
        org.organization_id,
        `"${org.organization_name}"`,
        `"${org.organization_name_en}"`,
        `"${org.description}"`,
        org.status,
        org.user_count,
        org.admin_count,
        org.storage_used_gb,
        org.storage_limit_gb,
        org.language,
        org.timezone,
        org.created_at,
        org.updated_at
      ].join(',');
    });

    return [csvHeaders, ...csvRows].join('\r\n');
  };

  /**
   * CSVダウンロード処理
   */
  const handleDownload = () => {
    try {
      // CSVデータを生成
      const csvContent = convertToCSV(organizationsData);

      // UTF-8 BOM（Byte Order Mark）を追加
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;

      // Blobを作成
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });

      // ダウンロードリンクを作成
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // ファイル名に日時を追加
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `organization_statistics_${timestamp}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // URLオブジェクトを解放
      URL.revokeObjectURL(url);

      message.success(`${fileName} をダウンロードしました`);
    } catch (error) {
      console.error('CSV download error:', error);
      message.error('CSVダウンロードに失敗しました');
    }
  };

  // ヘッダースタイル
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: '#ffffff',
    borderBottom: '2px solid #212121',
    marginBottom: 0,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 600,
    color: '#212121',
    margin: 0,
  };

  return (
    <div style={{ padding: 0, minHeight: 'calc(100vh - 112px)' }}>
      {/* ヘッダーカード */}
      <Card
        bordered={false}
        style={{
          borderRadius: 0,
          marginBottom: 0,
        }}
        bodyStyle={headerStyle}
      >
        <h2 style={titleStyle}>{title}</h2>
        <Button
          type="default"
          size="large"
          icon={<DownloadOutlined />}
          onClick={handleDownload}
          disabled={!downloadEnabled}
          style={{
            borderRadius: '8px',
            fontWeight: 500,
            minWidth: '160px',
          }}
        >
          CSVダウンロード
        </Button>
      </Card>
    </div>
  );
};

export default InformationDownloadMock;
