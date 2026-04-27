'use client';

import React from 'react';
import {
  Modal,
  Button,
  Card,
  Space,
  Tag,
  Typography,
  Collapse,
  List,
  Alert,
  theme,
} from 'antd';
import {
  SafetyCertificateOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { MaimlAnalysisResultRow } from '@/services/maimlApiService';
import type { AnalysisResult } from '@/types/maimlValidation';

/**
 * JSONB フィールドのパースヘルパー（コンポーネント外定義）。
 * PostgreSQL の JSONB 型は node-postgres ドライバーが自動的に JS オブジェクトへ変換するため、
 * フロントエンドに届いた時点でフィールドがすでに配列/オブジェクトになっている場合がある。
 * 文字列の場合は JSON.parse し、すでにオブジェクト/配列の場合はそのまま返す。
 */
function parseJsonField<T>(field: unknown, fallback: T): T {
  if (field === null || field === undefined) return fallback;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field) as T;
    } catch {
      return fallback;
    }
  }
  // すでにオブジェクト/配列 → そのまま使う
  return field as T;
}

/**
 * DB行（MaimlAnalysisResultRow）を AnalysisResult に変換するユーティリティ
 */
function parseRowToAnalysisResult(row: MaimlAnalysisResultRow): AnalysisResult | null {
  try {
    const errors      = parseJsonField<AnalysisResult['errors']>(row.errors, []);
    const warnings    = parseJsonField<AnalysisResult['warnings']>(row.warnings, []);
    const suggestions = parseJsonField<AnalysisResult['suggestions']>(row.suggestions, []);
    const statistics  = parseJsonField<AnalysisResult['statistics']>(row.statistics, {} as AnalysisResult['statistics']);
    return {
      isValid: row.is_valid,
      version: row.version ?? undefined,
      namespace: row.namespace ?? undefined,
      errors,
      warnings,
      suggestions,
      statistics,
      processingTime: row.processing_time ?? undefined,
      timestamp: row.analysis_timestamp as string,
      autoCorrections: [],
      fileKey: row.file_key,
    } as AnalysisResult;
  } catch {
    return null;
  }
}

const { Text } = Typography;

interface MaimlValidationModalProps {
  /** モーダル開閉状態 */
  open: boolean;
  /** モーダルを閉じるコールバック */
  onClose: () => void;
  /** DB保存済みバリデーション結果行 */
  savedValidationRow: MaimlAnalysisResultRow | null;
  /** バリデーション実行中フラグ */
  isValidating: boolean;
  /** MAIMLコンテンツが存在するか（ボタン活性制御用） */
  hasMaimlContent: boolean;
  /** 再バリデーション実行コールバック */
  onValidate: () => void;
}

/**
 * MAIMLバリデーション結果モーダル
 *
 * ProjectManagement から外出しした独立コンポーネント。
 * - DB保存済みの最終バリデーション日時を表示
 * - 再バリデーションボタン
 * - ValidationPanel 同様のエラー/警告詳細（Collapse + List）
 */
const MaimlValidationModal: React.FC<MaimlValidationModalProps> = ({
  open,
  onClose,
  savedValidationRow,
  isValidating,
  hasMaimlContent,
  onValidate,
}) => {
  const { token } = theme.useToken();

  // savedValidationRow をパースして表示用データを生成（常にDBが唯一の情報源）
  const displayResult: AnalysisResult | null = (() => {
    if (!savedValidationRow) return null;
    try {
      const errors      = parseJsonField<AnalysisResult['errors']>(savedValidationRow.errors, []);
      const warnings    = parseJsonField<AnalysisResult['warnings']>(savedValidationRow.warnings, []);
      const suggestions = parseJsonField<AnalysisResult['suggestions']>(savedValidationRow.suggestions, []);
      const statistics  = parseJsonField<AnalysisResult['statistics']>(savedValidationRow.statistics, {} as AnalysisResult['statistics']);
      return {
        isValid: savedValidationRow.is_valid,
        version: savedValidationRow.version ?? undefined,
        namespace: savedValidationRow.namespace ?? undefined,
        errors,
        warnings,
        suggestions,
        statistics,
        processingTime: savedValidationRow.processing_time ?? undefined,
        timestamp: savedValidationRow.analysis_timestamp as string,
        autoCorrections: [],
        fileKey: savedValidationRow.file_key,
      } as AnalysisResult;
    } catch {
      return null;
    }
  })();

  return (
    <Modal
      title="🔍 MAIMLバリデーション"
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnHidden
    >
      {/* DB保存済み結果がある場合は最終確認日時を表示 */}
      {savedValidationRow && (
        <div
          style={{
            padding: '8px 12px',
            marginBottom: 16,
            borderRadius: token.borderRadius,
            backgroundColor: savedValidationRow.is_valid
              ? token.colorSuccessBg
              : token.colorWarningBg,
            border: `1px solid ${savedValidationRow.is_valid ? token.colorSuccessBorder : token.colorWarningBorder}`,
          }}
        >
          <Space>
            {savedValidationRow.is_valid ? (
              <SafetyCertificateOutlined style={{ color: token.colorSuccess }} />
            ) : (
              <WarningOutlined style={{ color: token.colorWarning }} />
            )}
            <Text>
              最終バリデーション:{' '}
              {new Date(savedValidationRow.analysis_timestamp).toLocaleString('ja-JP')}
            </Text>
            <Tag color={savedValidationRow.is_valid ? 'success' : 'warning'}>
              {savedValidationRow.is_valid ? '問題なし' : '問題あり'}
            </Tag>
          </Space>
        </div>
      )}

      {!savedValidationRow && (
        <div style={{ marginBottom: 16, color: token.colorTextSecondary }}>
          まだバリデーションが実行されていません。
        </div>
      )}

      {/* 再バリデーションボタン */}
      <Button
        icon={<SafetyCertificateOutlined />}
        onClick={onValidate}
        loading={isValidating}
        disabled={!hasMaimlContent}
        style={{ marginBottom: 16 }}
        type="primary"
      >
        {isValidating ? 'バリデーション実行中...' : '再バリデーション実行'}
      </Button>

      {/* バリデーション結果表示（手動実行結果 or DB保存済み結果をパースして表示） */}
      {displayResult && (
        <div>
          {/* サマリーカード */}
          <Card style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space size="middle">
                {displayResult.isValid ? (
                  <SafetyCertificateOutlined style={{ fontSize: 36, color: token.colorSuccess }} />
                ) : (
                  <WarningOutlined style={{ fontSize: 36, color: token.colorError }} />
                )}
                <div>
                  <Text strong style={{ fontSize: 15 }}>
                    {displayResult.isValid ? '✅ バリデーション成功' : '❌ バリデーション失敗'}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    スキーマバージョン: {displayResult.version || '不明'}
                  </Text>
                </div>
              </Space>
              <Space size="small" wrap>
                {(() => {
                  const fatalErrors = (displayResult.errors || []).filter(
                    (e) => !e.canBeIgnoredOnUpload
                  );
                  const editableErrors = (displayResult.errors || []).filter(
                    (e) => e.canBeIgnoredOnUpload
                  );
                  return (
                    <>
                      {fatalErrors.length > 0 && (
                        <Tag color="error">致命的エラー: {fatalErrors.length}</Tag>
                      )}
                      {editableErrors.length > 0 && (
                        <Tag color="orange">編集可能エラー: {editableErrors.length}</Tag>
                      )}
                      {(displayResult.warnings?.length ?? 0) > 0 && (
                        <Tag color="warning">警告: {displayResult.warnings!.length}</Tag>
                      )}
                    </>
                  );
                })()}
              </Space>
            </div>
          </Card>

          {/* エラー詳細 */}
          {displayResult.errors && displayResult.errors.length > 0 && (
            <Collapse
              defaultActiveKey={['errors']}
              style={{ marginBottom: 12 }}
              items={[
                {
                  key: 'errors',
                  label: (
                    <Space>
                      <WarningOutlined style={{ color: token.colorError }} />
                      <Text strong>エラー詳細 ({displayResult.errors.length}件)</Text>
                    </Space>
                  ),
                  children: (
                    <List
                      size="small"
                      dataSource={displayResult.errors}
                      renderItem={(err, i) => (
                        <List.Item key={i}>
                          <div style={{ width: '100%' }}>
                            <Space size="small" style={{ marginBottom: 4 }}>
                              <Tag color={err.canBeIgnoredOnUpload ? 'orange' : 'error'}>
                                {err.canBeIgnoredOnUpload ? '編集可能' : 'エラー'}
                              </Tag>
                              <Text>{err.message}</Text>
                            </Space>
                            {err.path && (
                              <Text
                                type="secondary"
                                style={{ fontSize: 11, display: 'block' }}
                              >
                                XPath: {err.path}
                              </Text>
                            )}
                            {err.suggestion && (
                              <Text
                                style={{ fontSize: 11, display: 'block', color: token.colorInfo }}
                              >
                                💡 修正案: {String(err.suggestion)}
                              </Text>
                            )}
                          </div>
                        </List.Item>
                      )}
                    />
                  ),
                },
              ]}
            />
          )}

          {/* 警告詳細 */}
          {displayResult.warnings && displayResult.warnings.length > 0 && (
            <Collapse
              defaultActiveKey={['warnings']}
              style={{ marginBottom: 12 }}
              items={[
                {
                  key: 'warnings',
                  label: (
                    <Space>
                      <WarningOutlined style={{ color: token.colorWarning }} />
                      <Text strong>警告詳細 ({displayResult.warnings.length}件)</Text>
                    </Space>
                  ),
                  children: (
                    <List
                      size="small"
                      dataSource={displayResult.warnings}
                      renderItem={(warn, i) => (
                        <List.Item key={i}>
                          <div style={{ width: '100%' }}>
                            <Space size="small" style={{ marginBottom: 4 }}>
                              <Tag color="warning">warning</Tag>
                              <Text>{warn.message}</Text>
                            </Space>
                            {warn.path && (
                              <Text
                                type="secondary"
                                style={{ fontSize: 11, display: 'block' }}
                              >
                                XPath: {warn.path}
                              </Text>
                            )}
                          </div>
                        </List.Item>
                      )}
                    />
                  ),
                },
              ]}
            />
          )}

          {/* 成功メッセージ */}
          {displayResult.isValid && (
            <Alert
              message="✅ MAIMLファイルは有効です"
              description="スキーマバリデーションに合格しました。"
              type="success"
              showIcon
            />
          )}
        </div>
      )}
    </Modal>
  );
};

export default MaimlValidationModal;
