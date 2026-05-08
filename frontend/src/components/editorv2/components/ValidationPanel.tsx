/**
 * ValidationPanel - バリデーション結果表示パネル（EditorV2用）
 * 
 * バリデーション結果の詳細表示、エラー/警告の階層的表示
 * Material-UI → Ant Design変換版
 * 
 * @version 2.1.0
 * @date 2026-05-08
 */

import React, { useState } from 'react';
import { 
  Modal,
  Card,
  Typography,
  Alert,
  Tag,
  Collapse,
  Button,
  Progress,
  Space,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { AnalysisResult } from '@/types/maimlValidation';

const { Text, Title } = Typography;

/**
 * unknown型を文字列に安全に変換するヘルパー関数
 */
const convertToString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

/**
 * ValidationPanel Props
 */
export interface ValidationPanelProps {
  show: boolean;
  validationResult: AnalysisResult | null;
  onClose: () => void;
  onRevalidate?: () => void;
  isValidating?: boolean;
}

/**
 * ValidationPanel - バリデーション結果表示
 */
const ValidationPanel: React.FC<ValidationPanelProps> = ({
  show = false,
  validationResult = null,
  onClose,
  onRevalidate,
  isValidating = false,
}) => {
  console.log('🎨 [ValidationPanel V2] Rendering with props:', {
    show,
    hasResult: !!validationResult,
    isValidating,
    errorCount: validationResult?.errors?.length || 0,
    warningCount: validationResult?.warnings?.length || 0
  });

  // State管理
  const [activeKeys, setActiveKeys] = useState<string[]>(['errors']);
  const [prevValidationResult, setPrevValidationResult] = useState<AnalysisResult | null>(null);

  // validationResult変更検知（ESLintエラー回避のため手動比較）
  if (validationResult !== prevValidationResult) {
    setPrevValidationResult(validationResult);
    
    if (validationResult) {
      console.log('✅ [ValidationPanel V2] Validation result updated:', {
        isValid: validationResult.isValid,
        errorCount: validationResult.errors?.length || 0,
        warningCount: validationResult.warnings?.length || 0
      });
    }
  }

  /**
   * バリデーション結果サマリーレンダリング
   */
  const renderValidationSummary = () => {
    if (!validationResult) {
      return (
        <Card style={{ marginBottom: 16, backgroundColor: '#f5f5f5' }}>
          <Space>
            <Title level={5} style={{ margin: 0, color: 'rgba(0, 0, 0, 0.45)' }}>
              バリデーション結果がありません
            </Title>
          </Space>
        </Card>
      );
    }

    const { isValid, errors = [], warnings = [] } = validationResult;
    const totalWarnings = warnings.length;

    // エラーを致命的/編集可能に分類（canBeIgnoredOnUploadフラグで判定）
    const fatalErrors = errors.filter(e => e.severity === 'error' && !e.canBeIgnoredOnUpload);
    const editableErrors = errors.filter(e => e.severity === 'error' && e.canBeIgnoredOnUpload);

    return (
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="middle">
            {isValid ? (
              <CheckCircleOutlined style={{ fontSize: 40, color: '#52c41a' }} />
            ) : (
              <CloseCircleOutlined style={{ fontSize: 40, color: '#ff4d4f' }} />
            )}
            <div>
              <Title level={5} style={{ margin: 0 }}>
                {isValid ? '✅ バリデーション成功' : '❌ バリデーション失敗'}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                スキーマバージョン: {validationResult.version || '不明'}
              </Text>
            </div>
          </Space>
          <Space size="small" wrap>
            {fatalErrors.length > 0 && (
              <Tag color="error">致命的エラー: {fatalErrors.length}</Tag>
            )}
            {editableErrors.length > 0 && (
              <Tag color="orange">編集可能エラー: {editableErrors.length}</Tag>
            )}
            {totalWarnings > 0 && (
              <Tag color="warning">警告: {totalWarnings}</Tag>
            )}
          </Space>
        </div>
      </Card>
    );
  };

  /**
   * エラー詳細レンダリング
   */
  const renderErrors = () => {
    if (!validationResult || !validationResult.errors || validationResult.errors.length === 0) {
      return null;
    }

    return (
      <Collapse 
        activeKey={activeKeys}
        onChange={(keys) => setActiveKeys(keys as string[])}
        style={{ marginBottom: 16 }}
        items={[{
          key: 'errors',
          label: (
            <Space>
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              <Text strong>エラー詳細 ({validationResult.errors.length}件)</Text>
            </Space>
          ),
          children: (
            <div>
              {validationResult.errors.map((err, index) => {
                const elementStr = err.element ? convertToString(err.element) : '';
                const suggestionStr = err.suggestion ? convertToString(err.suggestion) : '';
                return (
                  <div key={index} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ width: '100%' }}>
                      <Space size="small" style={{ marginBottom: 4 }}>
                        <Tag 
                          color={err.severity === 'critical' ? 'error' : 'warning'}
                        >
                          {err.severity || 'error'}
                        </Tag>
                        <Text>{err.message}</Text>
                      </Space>
                      <div style={{ marginTop: 4 }}>
                        {err.path && (
                          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                            XPath: {err.path}
                          </Text>
                        )}
                        {elementStr && (
                          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                            要素: {elementStr}
                          </Text>
                        )}
                        {err.line && (
                          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                            行: {err.line}
                          </Text>
                        )}
                        {suggestionStr && (
                          <Text style={{ fontSize: 11, display: 'block', marginTop: 4, color: '#1890ff' }}>
                            💡 修正案: {suggestionStr}
                          </Text>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ),
        }]}
      />
    );
  };

  /**
   * 警告詳細レンダリング
   */
  const renderWarnings = () => {
    if (!validationResult || !validationResult.warnings || validationResult.warnings.length === 0) {
      return null;
    }

    return (
      <Collapse 
        activeKey={activeKeys}
        onChange={(keys) => setActiveKeys(keys as string[])}
        style={{ marginBottom: 16 }}
        items={[{
          key: 'warnings',
          label: (
            <Space>
              <WarningOutlined style={{ color: '#faad14' }} />
              <Text strong>警告詳細 ({validationResult.warnings.length}件)</Text>
            </Space>
          ),
          children: (
            <div>
              {validationResult.warnings.map((warn, index) => {
                const elementStr = warn.element ? convertToString(warn.element) : '';
                return (
                  <div key={index} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ width: '100%' }}>
                      <Space size="small" style={{ marginBottom: 4 }}>
                        <Tag color="warning">warning</Tag>
                        <Text>{warn.message}</Text>
                      </Space>
                      <div style={{ marginTop: 4 }}>
                        {warn.path && (
                          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                            XPath: {warn.path}
                          </Text>
                        )}
                        {elementStr && (
                          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                            要素: {elementStr}
                          </Text>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ),
        }]}
      />
    );
  };

  return (
    <Modal
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0 }}>
            🔍 バリデーション結果
          </Title>
          <Space style={{ marginRight: 32 }}>
            {onRevalidate && (
              <Tooltip title="再検証">
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={onRevalidate}
                  disabled={isValidating}
                  type="text"
                />
              </Tooltip>
            )}
          </Space>
        </Space>
      }
      open={show}
      onCancel={onClose}
      width={900}
      style={{ top: 20 }}
      footer={null}
      closeIcon={<CloseOutlined />}
    >
      <div style={{ maxHeight: 'calc(90vh - 120px)', overflow: 'auto' }}>
        {/* 進行状態バー */}
        {isValidating && (
          <div style={{ marginBottom: 16 }}>
            <Progress percent={100} status="active" showInfo={false} />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              🔍 検証中...
            </Text>
          </div>
        )}

        {/* バリデーション結果サマリー */}
        {renderValidationSummary()}

        {/* エラー詳細 */}
        {renderErrors()}

        {/* 警告詳細 */}
        {renderWarnings()}

        {/* 成功メッセージ */}
        {validationResult && validationResult.isValid && (
          <Alert
            title="✅ MaiMLファイルは有効です"
            description="スキーマバリデーションに合格しました。"
            type="success"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </div>
    </Modal>
  );
};

export default ValidationPanel;
