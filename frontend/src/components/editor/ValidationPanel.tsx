/**
 * ValidationPanel - バリデーション結果表示パネル
 * 
 * Material-UI → Ant Design v6 変換版
 * 
 * 機能:
 * - バリデーション結果の詳細表示
 * - エラー/警告の階層的表示
 * - 自動補正機能
 * 
 * @version 2.0.0
 * @date 2025-12-23
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Typography,
  Alert,
  Tag,
  Collapse,
  Button,
  Switch,
  Progress,
  Table,
  Divider,
  Space,
  Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ToolOutlined,
  ReloadOutlined,
  CloseOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

/**
 * ValidationError型定義
 */
interface ValidationError {
  severity?: string;
  message: string;
  xpath?: string;
  element?: any;
  line?: number;
  suggestion?: any;
}

/**
 * ValidationResult型定義
 */
interface ValidationResult {
  isValid: boolean;
  schemaVersion?: string;
  errors?: ValidationError[];
  warnings?: ValidationError[];
  corrections?: any[];
}

/**
 * ValidationPanelのProps型定義
 */
export interface ValidationPanelProps {
  open?: boolean;
  validationResult: ValidationResult | null;
  onClose?: () => void;
  onAutoCorrect?: (selectedErrors: number[]) => void;
  onRevalidate?: () => void;
  isValidating?: boolean;
  isCorrecting?: boolean;
}

/**
 * ValidationPanelコンポーネント
 */
const ValidationPanel: React.FC<ValidationPanelProps> = ({
  open = false,
  validationResult = null,
  onClose,
  onAutoCorrect,
  onRevalidate,
  isValidating = false,
  isCorrecting = false,
}) => {
  console.log('🎨 [ValidationPanel] Rendering with props:', {
    open,
    hasResult: !!validationResult,
    isValidating,
    isCorrecting,
    errorCount: validationResult?.errors?.length || 0,
    warningCount: validationResult?.warnings?.length || 0
  });

  // State管理
  const [selectedErrors, setSelectedErrors] = useState<number[]>([]);

  // validationResult変更時に選択をリセット
  useEffect(() => {
    if (validationResult) {
      setSelectedErrors([]);
      console.log('✅ [ValidationPanel] Validation result updated:', {
        isValid: validationResult.isValid,
        errorCount: validationResult.errors?.length || 0,
        warningCount: validationResult.warnings?.length || 0
      });
    }
  }, [validationResult]);

  // 自動補正実行ハンドラー
  const handleApplyCorrections = () => {
    if (selectedErrors.length === 0) {
      Modal.warning({
        title: '選択エラー',
        content: '補正するエラーを選択してください',
      });
      return;
    }

    if (onAutoCorrect) {
      console.log('🔧 [ValidationPanel] Applying corrections for errors:', selectedErrors);
      onAutoCorrect(selectedErrors);
    }
  };

  // バリデーション結果サマリー
  const renderValidationSummary = () => {
    if (!validationResult) {
      return (
        <div style={{ padding: 16, marginBottom: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
          <Space>
            <Text type="secondary" style={{ fontSize: 16 }}>
              バリデーション結果がありません
            </Text>
          </Space>
        </div>
      );
    }

    const { isValid, errors = [], warnings = [] } = validationResult;
    const totalErrors = errors.length;
    const totalWarnings = warnings.length;
    const criticalErrors = errors.filter(e => e.severity === 'critical').length;

    return (
      <div style={{ padding: 16, marginBottom: 16, border: '1px solid #d9d9d9', borderRadius: 8, backgroundColor: '#fff' }}>
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space size="large">
              {isValid ? (
                <CheckCircleOutlined style={{ fontSize: 40, color: '#52c41a' }} />
              ) : (
                <CloseCircleOutlined style={{ fontSize: 40, color: '#ff4d4f' }} />
              )}
              <div>
                <Title level={5} style={{ margin: 0 }}>
                  {isValid ? '✅ バリデーション成功' : '❌ バリデーション失敗'}
                </Title>
                <Text type="secondary">
                  スキーマバージョン: {validationResult.schemaVersion || '不明'}
                </Text>
              </div>
            </Space>
            <Space wrap>
              {criticalErrors > 0 && (
                <Tag color="error">致命的: {criticalErrors}</Tag>
              )}
              {totalErrors > 0 && (
                <Tag color="error">エラー: {totalErrors}</Tag>
              )}
              {totalWarnings > 0 && (
                <Tag color="warning">警告: {totalWarnings}</Tag>
              )}
            </Space>
          </div>
        </Space>
      </div>
    );
  };

  // エラー詳細表示
  const renderErrors = () => {
    if (!validationResult || !validationResult.errors || validationResult.errors.length === 0) {
      return null;
    }

    const errorColumns: ColumnsType<ValidationError & { index: number }> = [
      {
        title: '選択',
        key: 'select',
        width: 60,
        align: 'center',
        render: (_text, record) => (
          <Switch
            size="small"
            checked={selectedErrors.includes(record.index)}
            onChange={(checked) => {
              if (checked) {
                setSelectedErrors(prev => [...prev, record.index]);
              } else {
                setSelectedErrors(prev => prev.filter(i => i !== record.index));
              }
            }}
          />
        ),
      },
      {
        title: '重要度',
        key: 'severity',
        width: 100,
        render: (_text, record) => (
          <Tag color={record.severity === 'critical' ? 'error' : 'warning'}>
            {record.severity || 'error'}
          </Tag>
        ),
      },
      {
        title: 'エラー内容',
        key: 'details',
        render: (_text, record) => (
          <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            <Text>{record.message}</Text>
            {record.xpath && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                XPath: {record.xpath}
              </Text>
            )}
            {record.element && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                要素: {typeof record.element === 'object' ? JSON.stringify(record.element) : record.element}
              </Text>
            )}
            {record.line && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                行: {record.line}
              </Text>
            )}
            {record.suggestion && (
              <Text style={{ fontSize: 12, color: '#1890ff' }}>
                💡 修正案: {typeof record.suggestion === 'object' ? JSON.stringify(record.suggestion) : record.suggestion}
              </Text>
            )}
          </Space>
        ),
      },
    ];

    const errorData = validationResult.errors.map((err, index) => ({ ...err, index, key: index }));

    return (
      <Collapse
        defaultActiveKey={['errors']}
        style={{ marginBottom: 16 }}
        items={[
          {
            key: 'errors',
            label: (
              <Space>
                <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                <Text>エラー詳細 ({validationResult.errors.length}件)</Text>
              </Space>
            ),
            children: (
              <Table
                dataSource={errorData}
                columns={errorColumns}
                pagination={false}
                size="small"
              />
            )
          }
        ]}
      />
    );
  };

  // 警告詳細表示
  const renderWarnings = () => {
    if (!validationResult || !validationResult.warnings || validationResult.warnings.length === 0) {
      return null;
    }

    const warningColumns: ColumnsType<ValidationError> = [
      {
        title: '重要度',
        key: 'severity',
        width: 100,
        render: () => <Tag color="warning">warning</Tag>,
      },
      {
        title: '警告内容',
        key: 'details',
        render: (_text, record) => (
          <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            <Text>{record.message}</Text>
            {record.xpath && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                XPath: {record.xpath}
              </Text>
            )}
            {record.element && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                要素: {typeof record.element === 'object' ? JSON.stringify(record.element) : record.element}
              </Text>
            )}
          </Space>
        ),
      },
    ];

    const warningData = validationResult.warnings.map((warn, index) => ({ ...warn, key: index }));

    return (
      <Collapse
        style={{ marginBottom: 16 }}
        items={[
          {
            key: 'warnings',
            label: (
              <Space>
                <WarningOutlined style={{ color: '#faad14' }} />
                <Text>警告詳細 ({validationResult.warnings.length}件)</Text>
              </Space>
            ),
            children: (
              <Table
                dataSource={warningData}
                columns={warningColumns}
                pagination={false}
                size="small"
              />
            )
          }
        ]}
      />
    );
  };

  return (
    <Modal
      title={
        <Space>
          <span>🔍 バリデーション結果</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={900}
      footer={null}
      style={{ top: 20 }}
      styles={{ body: { maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' } }}
    >
      {/* 進行状態バー */}
      {(isValidating || isCorrecting) && (
        <div style={{ marginBottom: 16 }}>
          <Progress percent={100} status="active" showInfo={false} />
          <Text type="secondary" style={{ marginTop: 4, display: 'block', fontSize: 12 }}>
            {isValidating && '🔍 検証中...'}
            {isCorrecting && '🔧 補正適用中...'}
          </Text>
        </div>
      )}

      {/* バリデーション結果サマリー */}
      {renderValidationSummary()}

      {/* エラー詳細 */}
      {renderErrors()}

      {/* 警告詳細 */}
      {renderWarnings()}

      {/* 自動補正ボタン */}
      {validationResult && validationResult.errors && validationResult.errors.length > 0 && (
        <div style={{ marginTop: 16, padding: 16, border: '1px solid #d9d9d9', borderRadius: 8 }}>
          <Title level={5}>🔧 自動補正</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            修正したいエラーを選択して、自動補正を試行できます。
          </Text>
          <Button
            type="primary"
            block
            onClick={handleApplyCorrections}
            disabled={selectedErrors.length === 0 || isCorrecting || isValidating}
            icon={isCorrecting ? <Spin size="small" /> : <ToolOutlined />}
          >
            {isCorrecting 
              ? '補正適用中...' 
              : `選択したエラーを自動補正 (${selectedErrors.length}件)`
            }
          </Button>
          {selectedErrors.length > 0 && (
            <Text type="secondary" style={{ marginTop: 8, display: 'block', fontSize: 12 }}>
              ⚠️ 自動補正は完璧ではありません。適用後に必ず内容を確認してください。
            </Text>
          )}
        </div>
      )}

      {/* 成功メッセージ */}
      {validationResult && validationResult.isValid && (
        <Alert
          title="✅ MaiMLファイルは有効です。スキーマバリデーションに合格しました。"
          type="success"
          style={{ marginTop: 16 }}
        />
      )}
    </Modal>
  );
};

export default ValidationPanel;
