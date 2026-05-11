/**
 * バッチ処理パネルコンポーネント
 *
 * @description 組織内全MAIMLファイルのセマンティック検索インデックス一括生成を管理する
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  Typography,
  Space,
  Switch,
  InputNumber,
  Alert,
  Tag,
  Progress,
  Spin,
  Statistic,
  Row,
  Col,
  Tooltip,
} from 'antd';
import {
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons';
import {
  startBatch,
  listBatchJobs,
  getBatchStats,
  cancelBatchJob,
} from '@/services/semanticSearchService';
import type { BatchJob, BatchStats, BatchIngestOptions } from '@/types/semanticSearch';

const { Text, Title } = Typography;

/** ステータスに対応するTagカラー */
function statusColor(status: BatchJob['status']): string {
  switch (status) {
    case 'started':
    case 'processing':
      return 'blue';
    case 'completed':
      return 'green';
    case 'failed':
      return 'red';
    case 'cancelled':
      return 'default';
    default:
      return 'default';
  }
}

/** ステータス表示ラベル */
function statusLabel(status: BatchJob['status']): string {
  switch (status) {
    case 'started':
      return '開始中';
    case 'processing':
      return '処理中';
    case 'completed':
      return '完了';
    case 'failed':
      return 'エラー';
    case 'cancelled':
      return 'キャンセル済';
    default:
      return status;
  }
}

/**
 * バッチ処理パネル
 */
const TransitionSetBatchProcessingPanel: React.FC = () => {
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [forceReprocess, setForceReprocess] = useState(false);
  const [maxFiles, setMaxFiles] = useState<number | null>(null);

  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [stats, setStats] = useState<BatchStats | null>(null);

  /** ジョブ一覧と統計を取得 */
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [jobList, batchStats] = await Promise.all([
        listBatchJobs(),
        getBatchStats(),
      ]);
      setJobs(jobList);
      setStats(batchStats);
    } catch (err) {
      console.error('[BatchPanel] データ取得エラー:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // アクティブなジョブがあれば3秒ごとにポーリング
  useEffect(() => {
    const hasActive = jobs.some(
      (j) => j.status === 'started' || j.status === 'processing'
    );
    if (!hasActive) return;
    const timer = setInterval(fetchData, 3000);
    return () => clearInterval(timer);
  }, [jobs, fetchData]);

  /** バッチ開始 */
  const handleStart = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsStarting(true);
    try {
      const options: BatchIngestOptions = {
        forceReprocess,
        maxFiles: maxFiles ?? null,
      };
      const result = await startBatch(options);
      setSuccessMessage(`バッチ処理を開始しました（Job ID: ${result.batch_job_id}）`);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'バッチ処理の開始に失敗しました');
    } finally {
      setIsStarting(false);
    }
  };

  /** ジョブキャンセル */
  const handleCancel = async (jobId: string) => {
    try {
      await cancelBatchJob(jobId);
      setSuccessMessage(`ジョブ ${jobId} をキャンセルしました`);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'キャンセルに失敗しました');
    }
  };

  /** 進捗率 */
  const calcProgress = (job: BatchJob): number => {
    if (job.total_files === 0) return 0;
    return Math.round((job.processed_files / job.total_files) * 100);
  };

  return (
    <div style={{ padding: '8px 0' }}>
      {/* ヘッダー */}
      <Space style={{ marginBottom: 16 }}>
        <NodeIndexOutlined style={{ fontSize: 24, color: '#1677ff' }} />
        <Title level={5} style={{ margin: 0 }}>
          トランジションセット検索バッチ処理
        </Title>
      </Space>

      {/* 統計カード */}
      {stats && (
        <Card size="small" style={{ marginBottom: 16, background: '#f0f5ff' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="総ジョブ数" value={stats.total_jobs} />
            </Col>
            <Col span={6}>
              <Statistic title="処理済ファイル" value={stats.total_files_processed} />
            </Col>
            <Col span={6}>
              <Statistic
                title="失敗ファイル"
                value={stats.total_files_failed}
                styles={{ content: { color: stats.total_files_failed > 0 ? '#ff4d4f' : undefined } }}
              />
            </Col>
            <Col span={6}>
              <Statistic title="生成Embedding数" value={stats.total_embeddings_generated} />
            </Col>
          </Row>
        </Card>
      )}

      {/* バッチ開始セクション */}
      <Card size="small" title="新規バッチ処理" style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          プロジェクト配下の全MAIMLファイルをスキャンし、4軸ベクトルEmbeddingを生成します。
        </Text>

        <Space orientation="vertical" style={{ width: '100%' }}>
          <Space>
            <Text style={{ fontSize: 12 }}>既存ファイルを強制再処理:</Text>
            <Switch
              checked={forceReprocess}
              onChange={setForceReprocess}
              checkedChildren="ON"
              unCheckedChildren="OFF"
            />
          </Space>

          <Space>
            <Text style={{ fontSize: 12 }}>最大処理ファイル数（省略可）:</Text>
            <InputNumber
              size="small"
              min={1}
              placeholder="全ファイル"
              value={maxFiles ?? undefined}
              onChange={(v) => setMaxFiles(v ?? null)}
              style={{ width: 120 }}
            />
          </Space>
        </Space>

        {error && (
          <Alert
            type="error"
            title={error}
            closable
            onClose={() => setError(null)}
            style={{ marginTop: 12 }}
          />
        )}
        {successMessage && (
          <Alert
            type="success"
            title={successMessage}
            closable
            onClose={() => setSuccessMessage(null)}
            style={{ marginTop: 12 }}
          />
        )}

        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          loading={isStarting}
          onClick={handleStart}
          style={{ marginTop: 12, width: '100%' }}
          size="large"
        >
          {isStarting ? 'バッチ処理を開始しています...' : 'バッチ処理を開始'}
        </Button>
      </Card>

      {/* ジョブ一覧 */}
      <Card
        size="small"
        title="バッチジョブ一覧"
        extra={
          <Tooltip title="更新">
            <Button
              size="small"
              icon={<ReloadOutlined spin={isLoading} />}
              onClick={fetchData}
              disabled={isLoading}
            />
          </Tooltip>
        }
      >
        {isLoading && jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin />
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Text type="secondary">バッチジョブがありません</Text>
          </div>
        ) : (
          <div>
            {jobs.map((job) => (
              <div
                key={job.id}
                style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}
              >
                <div style={{ width: '100%' }}>
                  <Space style={{ marginBottom: 4 }} wrap>
                    <Text strong style={{ fontSize: 12 }}>
                      Job #{job.id.slice(0, 8)}...
                    </Text>
                    <Tag color={statusColor(job.status)}>{statusLabel(job.status)}</Tag>
                    {(job.status === 'started' || job.status === 'processing') && (
                      <Tooltip title="キャンセル">
                        <Button
                          size="small"
                          danger
                          icon={<StopOutlined />}
                          onClick={() => handleCancel(job.id)}
                        >
                          キャンセル
                        </Button>
                      </Tooltip>
                    )}
                  </Space>

                  {(job.status === 'started' || job.status === 'processing') && (
                    <div style={{ marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        進捗: {job.processed_files} / {job.total_files} ファイル
                      </Text>
                      <Progress
                        percent={calcProgress(job)}
                        size="small"
                        strokeColor="#1677ff"
                      />
                    </div>
                  )}

                  <Space size="small" style={{ marginTop: 4 }} wrap>
                    <Tag>処理済: {job.processed_files}</Tag>
                    {job.failed_files > 0 && (
                      <Tag color="red">失敗: {job.failed_files}</Tag>
                    )}
                    {job.skipped_files > 0 && (
                      <Tag color="orange">スキップ: {job.skipped_files}</Tag>
                    )}
                  </Space>

                  {job.error_message && (
                    <Alert
                      type="error"
                      title={job.error_message}
                      style={{ marginTop: 4 }}
                      banner
                    />
                  )}

                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      作成: {new Date(job.created_at).toLocaleString('ja-JP')}
                    </Text>
                    {job.completed_at && (
                      <Text type="secondary" style={{ fontSize: 10, marginLeft: 8 }}>
                        完了: {new Date(job.completed_at).toLocaleString('ja-JP')}
                      </Text>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default TransitionSetBatchProcessingPanel;
