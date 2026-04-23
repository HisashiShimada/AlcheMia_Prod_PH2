/**
 * SaveConfirmDialog - V2保存確認ダイアログ
 *
 * 機能:
 * - S3 or ローカルダウンロード選択
 * - バリデーション結果表示
 * - 自動補正/強制保存/キャンセル
 *
 * @version 2.3.0
 * @date 2026-04-23
 */

import React, { useState } from 'react';
import {
  Modal,
  Button,
  Radio,
  Typography,
  Space,
  Alert,
  Collapse,
  Tag,
} from 'antd';
import {
  CloudUploadOutlined,
  DownloadOutlined,
  WarningOutlined,
  ToolOutlined,
  CloseCircleOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

interface ValidationError {
  type?: string;
  message?: string;
  description?: string;
  xpath?: string;
}

interface ValidationResult {
  errors?: ValidationError[];
  warnings?: ValidationError[];
  corrections?: unknown[];
}

interface SaveConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  validationResult?: ValidationResult | null;
  onSave: (
    action: 'save' | 'auto-correct' | 'force-save' | 'cancel',
    destination: string,
    folder?: string,
  ) => void;
  sourceFolder?: string;
}

const SaveConfirmDialog: React.FC<SaveConfirmDialogProps> = ({
  open,
  onClose,
  validationResult,
  onSave,
  sourceFolder = '',
}) => {
  const { t } = useLanguage();

  // 保存先選択
  const [saveDestination, setSaveDestination] = useState<'s3' | 'download'>('s3');

  // 保存アクション
  const handleChoice = (action: 'save' | 'auto-correct' | 'force-save' | 'cancel') => {
    onSave(action, saveDestination, sourceFolder);
  };

  // バリデーション結果の統計
  const errorCount = validationResult?.errors?.length || 0;
  const warningCount = validationResult?.warnings?.length || 0;
  const correctionsCount = validationResult?.corrections?.length || 0;
  const hasErrors = errorCount > 0;
  const hasCorrections = correctionsCount > 0;

  // エラー詳細 Collapse items（Ant Design v6 推奨形式）
  const errorCollapseItems = [
    {
      key: 'errors',
      label: t('saveConfirmDialog.errorDetailLabel'),
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          {validationResult?.errors?.slice(0, 3).map((error, index) => (
            <Alert
              key={index}
              message={error.type || t('saveConfirmDialog.validationErrorFallback')}
              description={
                <>
                  <Text>{error.message || error.description || t('saveConfirmDialog.errorDetailNone')}</Text>
                  {error.xpath && (
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        📍 XPath: {error.xpath}
                      </Text>
                    </div>
                  )}
                </>
              }
              type="error"
              showIcon
            />
          ))}
          {(validationResult?.errors?.length ?? 0) > 3 && (
            <Text type="secondary">
              {t('saveConfirmDialog.errorDetailMore').replace(
                '{{count}}',
                String((validationResult?.errors?.length ?? 0) - 3),
              )}
            </Text>
          )}
        </Space>
      ),
    },
  ];

  const destinationTag =
    saveDestination === 's3'
      ? t('saveConfirmDialog.destinationTagS3')
      : t('saveConfirmDialog.destinationTagDownload');

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={700}
      footer={null}
      title={
        <Space>
          {hasErrors ? (
            <WarningOutlined style={{ color: '#ff4d4f' }} />
          ) : (
            <CloudUploadOutlined />
          )}
          <span>
            {hasErrors
              ? t('saveConfirmDialog.titleError')
              : t('saveConfirmDialog.titleSave')}
          </span>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* バリデーション結果統計（エラーがある場合のみ） */}
        {hasErrors && (
          <Alert
            message={t('saveConfirmDialog.validationSummary')}
            description={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Space>
                  <Text strong>{t('saveConfirmDialog.errorCount')}</Text>
                  <Text>{errorCount}{t('saveConfirmDialog.unit')}</Text>
                </Space>
                <Space>
                  <Text strong>{t('saveConfirmDialog.warningCount')}</Text>
                  <Text>{warningCount}{t('saveConfirmDialog.unit')}</Text>
                </Space>
                <Space>
                  <Text strong>{t('saveConfirmDialog.correctionCount')}</Text>
                  <Text>{correctionsCount}{t('saveConfirmDialog.unit')}</Text>
                </Space>
              </Space>
            }
            type="error"
            showIcon
          />
        )}

        {/* エラー詳細プレビュー（エラーがある場合のみ） */}
        {hasErrors && (
          <Collapse items={errorCollapseItems} />
        )}

        {/* 保存先選択 */}
        <div
          style={{
            padding: 16,
            backgroundColor: '#e6f4ff',
            borderRadius: 8,
            border: '2px solid #1677ff',
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <CloudUploadOutlined />
              <Text strong>{t('saveConfirmDialog.destinationLabel')}</Text>
            </Space>
            <Radio.Group
              value={saveDestination}
              onChange={(e) => setSaveDestination(e.target.value)}
            >
              <Space>
                <Radio value="s3">
                  <Space size="small">
                    <CloudUploadOutlined />
                    <span>{t('saveConfirmDialog.destinationS3')}</span>
                  </Space>
                </Radio>
                <Radio value="download">
                  <Space size="small">
                    <DownloadOutlined />
                    <span>{t('saveConfirmDialog.destinationDownload')}</span>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>

            {/* S3保存先パス表示 */}
            {saveDestination === 's3' && (
              <Alert
                message={t('saveConfirmDialog.destinationFolderLabel')}
                description={
                  <Space>
                    <FolderOpenOutlined />
                    <Text code>
                      {sourceFolder || t('saveConfirmDialog.destinationFolderNone')}
                    </Text>
                  </Space>
                }
                type="info"
              />
            )}

            <Text type="secondary" style={{ fontSize: 12 }}>
              {saveDestination === 's3'
                ? t('saveConfirmDialog.descriptionS3')
                : t('saveConfirmDialog.descriptionDownload')}
            </Text>
          </Space>
        </div>

        {/* 説明文 */}
        <Text type="secondary">
          {hasErrors
            ? t('saveConfirmDialog.actionPromptError')
            : t('saveConfirmDialog.actionPromptNormal')}
        </Text>

        {/* アクションボタン */}
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 自動補正ボタン（エラーがある場合のみ） */}
          {hasErrors && hasCorrections && (
            <Button
              block
              type="primary"
              size="large"
              icon={<ToolOutlined />}
              onClick={() => handleChoice('auto-correct')}
              style={{ backgroundColor: '#52c41a' }}
            >
              {t('saveConfirmDialog.autoCorrectButton')}
              <Tag style={{ marginLeft: 8 }}>{destinationTag}</Tag>
            </Button>
          )}

          {/* 保存ボタン（エラーなし）or 強制保存ボタン（エラーあり） */}
          <Button
            block
            type={hasErrors ? 'default' : 'primary'}
            size="large"
            danger={hasErrors}
            icon={hasErrors ? <WarningOutlined /> : <CloudUploadOutlined />}
            onClick={() => handleChoice(hasErrors ? 'force-save' : 'save')}
          >
            {hasErrors
              ? t('saveConfirmDialog.forceButton')
              : t('saveConfirmDialog.saveButton')}
            <Tag style={{ marginLeft: 8 }}>{destinationTag}</Tag>
          </Button>

          {/* キャンセルボタン */}
          <Button
            block
            icon={<CloseCircleOutlined />}
            onClick={() => handleChoice('cancel')}
          >
            {t('saveConfirmDialog.cancelButton')}
          </Button>
        </Space>

        {/* 注意書き（エラーがある場合のみ） */}
        {hasErrors && (
          <Alert
            message={t('saveConfirmDialog.hintMessage')}
            type="info"
            showIcon
          />
        )}
      </Space>
    </Modal>
  );
};

export default SaveConfirmDialog;
