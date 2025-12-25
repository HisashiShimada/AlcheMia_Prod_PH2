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
  List,
  Divider,
  Space,
  Spin,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ToolOutlined,
  ReloadOutlined,
  CloseOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Panel } = Collapse;

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
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
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

    return (
      <Collapse defaultActiveKey={['errors']} style={{ marginBottom: 16 }}>
        <Panel
          header={
            <Space>
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              <Text>エラー詳細 ({validationResult.errors.length}件)</Text>
            </Space>
          }
          key="errors"
        >
          <List
            dataSource={validationResult.errors}
            renderItem={(err, index) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <Switch
                        size="small"
                        checked={selectedErrors.includes(index)}
                        onChange={(checked) => {
                          if (checked) {
                            setSelectedErrors(prev => [...prev, index]);
                          } else {
                            setSelectedErrors(prev => prev.filter(i => i !== index));
                          }
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <Space>
                          <Tag color={err.severity === 'critical' ? 'error' : 'warning'}>
                            {err.severity || 'error'}
                          </Tag>
                          <Text>{err.message}</Text>
                        </Space>
                        
                        <div style={{ marginTop: 8 }}>
                          {err.xpath && (
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                              XPath: {err.xpath}
                            </Text>
                          )}
                          {err.element && (
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                              要素: {typeof err.element === 'object' ? JSON.stringify(err.element) : err.element}
                            </Text>
                          )}
                          {err.line && (
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                              行: {err.line}
                            </Text>
                          )}
                          {err.suggestion && (
                            <Text style={{ display: 'block', fontSize: 12, color: '#1890ff', marginTop: 4 }}>
                              💡 修正案: {typeof err.suggestion === 'object' ? JSON.stringify(err.suggestion) : err.suggestion}
                            </Text>
                          )}
                        </div>
                      </div>
                    </div>
                  </Space>
                </div>
              </List.Item>
            )}
          />
        </Panel>
      </Collapse>
    );
  };

  // 警告詳細表示
  const renderWarnings = () => {
    if (!validationResult || !validationResult.warnings || validationResult.warnings.length === 0) {
      return null;
    }

    return (
      <Collapse style={{ marginBottom: 16 }}>
        <Panel
          header={
            <Space>
              <WarningOutlined style={{ color: '#faad14' }} />
              <Text>警告詳細 ({validationResult.warnings.length}件)</Text>
            </Space>
          }
          key="warnings"
        >
          <List
            dataSource={validationResult.warnings}
            renderItem={(warn) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space>
                      <Tag color="warning">warning</Tag>
                      <Text>{warn.message}</Text>
                    </Space>
                    
                    <div>
                      {warn.xpath && (
                        <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                          XPath: {warn.xpath}
                        </Text>
                      )}
                      {warn.element && (
                        <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                          要素: {typeof warn.element === 'object' ? JSON.stringify(warn.element) : warn.element}
                        </Text>
                      )}
                    </div>
                  </Space>
                </div>
              </List.Item>
            )}
          />
        </Panel>
      </Collapse>
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
      bodyStyle={{ maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' }}
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
          message="✅ MaiMLファイルは有効です。スキーマバリデーションに合格しました。"
          type="success"
          style={{ marginTop: 16 }}
        />
      )}
    </Modal>
  );
};

export default ValidationPanel;
