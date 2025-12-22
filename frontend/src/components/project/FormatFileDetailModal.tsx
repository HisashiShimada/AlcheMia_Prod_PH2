'use client';

import React from 'react';
import {
  Modal,
  Descriptions,
  Space,
  Typography,
  theme,
  Tag,
} from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatFileSize, formatRelativeTime } from '@/utils/formatters';

const { Text } = Typography;

/**
 * フォーマットファイル詳細データの型定義
 */
export interface FormatFileDetailData {
  id: string;
  name: string;
  path: string;
  size: number;
  lastModified: string;
  type: string;
  version?: string;
  description?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
}

/**
 * FormatFileDetailModalのProps型定義
 */
interface FormatFileDetailModalProps {
  open: boolean;
  onClose: () => void;
  file: FormatFileDetailData | null;
}

/**
 * フォーマットファイル詳細表示モーダルコンポーネント
 * ファイルの詳細情報（作成者、概要など）を表示
 */
export default function FormatFileDetailModal({
  open,
  onClose,
  file,
}: FormatFileDetailModalProps) {
  const { t } = useLanguage();
  const { token } = theme.useToken();

  if (!file) {
    return null;
  }

  // ファイルタイプから拡張子を抽出
  const extension = file.name.split('.').pop()?.toUpperCase() || '';

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined style={{ color: token.colorPrimary }} />
          <Text strong>{t('formatManagement.detail.title') || 'ファイル詳細'}</Text>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Descriptions
        bordered
        column={1}
        size="small"
        style={{ marginTop: token.marginLG }}
      >
        {/* ファイル名 */}
        <Descriptions.Item 
          label={t('formatManagement.detail.fileName') || 'ファイル名'}
          labelStyle={{ width: '30%', fontWeight: token.fontWeightStrong }}
        >
          <Text strong>{file.name}</Text>
        </Descriptions.Item>

        {/* ファイルタイプ */}
        <Descriptions.Item 
          label={t('formatManagement.detail.fileType') || 'ファイルタイプ'}
          labelStyle={{ width: '30%', fontWeight: token.fontWeightStrong }}
        >
          <Tag color="blue">{extension}</Tag>
        </Descriptions.Item>

        {/* ファイルパス */}
        <Descriptions.Item 
          label={t('formatManagement.detail.filePath') || 'ファイルパス'}
          labelStyle={{ width: '30%', fontWeight: token.fontWeightStrong }}
        >
          <Text type="secondary" code>{file.path}</Text>
        </Descriptions.Item>

        {/* ファイルサイズ */}
        <Descriptions.Item 
          label={t('formatManagement.detail.fileSize') || 'ファイルサイズ'}
          labelStyle={{ width: '30%', fontWeight: token.fontWeightStrong }}
        >
          <Text>{formatFileSize(file.size)}</Text>
        </Descriptions.Item>

        {/* 最終更新日 */}
        <Descriptions.Item 
          label={t('formatManagement.detail.lastModified') || '最終更新日'}
          labelStyle={{ width: '30%', fontWeight: token.fontWeightStrong }}
        >
          <Text>{formatRelativeTime(file.lastModified)}</Text>
        </Descriptions.Item>

        {/* 作成日（オプション） */}
        {file.createdAt && (
          <Descriptions.Item 
            label={t('formatManagement.detail.createdAt') || '作成日'}
            labelStyle={{ width: '30%', fontWeight: token.fontWeightStrong }}
          >
            <Text>{formatRelativeTime(file.createdAt)}</Text>
          </Descriptions.Item>
        )}

        {/* 作成者（オプション） */}
        {file.createdByName && (
          <Descriptions.Item 
            label={t('formatManagement.detail.createdBy') || '作成者'}
            labelStyle={{ width: '30%', fontWeight: token.fontWeightStrong }}
          >
            <Text strong>{file.createdByName}</Text>
          </Descriptions.Item>
        )}

        {/* バージョン（オプション） */}
        {file.version && (
          <Descriptions.Item 
            label={t('formatManagement.detail.version') || 'バージョン'}
            labelStyle={{ width: '30%', fontWeight: token.fontWeightStrong }}
          >
            <Tag color="green">{file.version}</Tag>
          </Descriptions.Item>
        )}

        {/* 概要 */}
        <Descriptions.Item 
          label={t('formatManagement.detail.description') || '概要'}
          labelStyle={{ width: '30%', fontWeight: token.fontWeightStrong }}
        >
          {file.description ? (
            <Text style={{ whiteSpace: 'pre-wrap' }}>{file.description}</Text>
          ) : (
            <Text type="secondary" italic>
              {t('formatManagement.detail.noDescription') || '概要が登録されていません'}
            </Text>
          )}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}
