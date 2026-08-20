'use client';

/**
 * AggregationRuleSettings.tsx
 *
 * 集約ルール設定画面（システム管理）
 */

import React, { useState, useCallback } from 'react';
import {
  Card, Form, Select, InputNumber, Button, Space, Typography,
  Divider, Alert, Spin, Flex,
} from 'antd';
import { SaveOutlined, EyeOutlined } from '@ant-design/icons';
import { useAggregationRule } from '@/hooks/useAggregationRule';
import EvaluationSummaryBar from '@/components/project/subcomponents/EvaluationSummaryBar';
import AttentionItemList from '@/components/project/subcomponents/AttentionItemList';
import type { CreateAggregationRuleInput, SummaryPreviewResponse, AggregationRuleSettingsProps } from '@/types/aggregationRule';

const { Title, Text } = Typography;

const AggregationRuleSettings: React.FC<AggregationRuleSettingsProps> = ({ previewProjectId }) => {
  const [form] = Form.useForm<CreateAggregationRuleInput>();
  const { activeRule, isLoading, createNewRule, previewRule } = useAggregationRule();
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<SummaryPreviewResponse | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = useCallback(async () => {
    if (!previewProjectId) return;
    try {
      setPreviewing(true);
      setError(null);
      const values = await form.validateFields();
      const result = await previewRule(previewProjectId, values);
      setPreviewResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'プレビューに失敗しました');
    } finally {
      setPreviewing(false);
    }
  }, [form, previewProjectId, previewRule]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);
      const values = await form.validateFields();
      await createNewRule(values);
      setSaveSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }, [form, createNewRule]);

  if (isLoading) {
    return <Flex justify="center" style={{ padding: 40 }}><Spin tip="読み込み中..." /></Flex>;
  }

  const initialValues: CreateAggregationRuleInput = {
    score_good:           activeRule?.score_good           ?? 100,
    score_caution:        activeRule?.score_caution        ?? 50,
    score_bad:            activeRule?.score_bad            ?? 0,
    target_rollup:        activeRule?.target_rollup        ?? 'WORST_CASE',
    level_status_rule:    activeRule?.level_status_rule    ?? 'WORST_CASE',
    level_score_rule:     activeRule?.level_score_rule     ?? 'MEAN',
    missing_handling:     activeRule?.missing_handling     ?? 'SEPARATE_COUNT',
    transition_hierarchy: activeRule?.transition_hierarchy ?? 'MERGE',
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={5} style={{ marginBottom: 0 }}>集約ルール設定</Title>

      {activeRule
        ? <Alert type="info" message={`現在の ACTIVE ルール: 版 ${activeRule.version}`} showIcon />
        : <Alert type="warning" message="有効な集約ルールが未設定です。以下で初期設定を行ってください。" showIcon />
      }
      {saveSuccess && <Alert type="success" message="集約ルールを保存しました。" showIcon closable onClose={() => setSaveSuccess(false)} />}
      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} />}

      <Card size="small" title="スコア写像設定">
        <Form form={form} initialValues={initialValues} layout="inline">
          <Form.Item label="良好" name="score_good">
            <InputNumber min={0} max={100} size="small" style={{ width: 70 }} />
          </Form.Item>
          <Form.Item label="要確認" name="score_caution">
            <InputNumber min={0} max={100} size="small" style={{ width: 70 }} />
          </Form.Item>
          <Form.Item label="不良" name="score_bad">
            <InputNumber min={0} max={100} size="small" style={{ width: 70 }} />
          </Form.Item>
        </Form>
      </Card>

      <Card size="small" title="集計ルール設定">
        <Form form={form} initialValues={initialValues} layout="vertical">
          <Flex gap={16} wrap="wrap">
            <Form.Item label="対象ロールアップ" name="target_rollup" style={{ minWidth: 200 }}>
              <Select size="small" options={[
                { value: 'WORST_CASE', label: 'ワーストケース' },
                { value: 'MAJORITY',  label: '多数決' },
                { value: 'AVERAGE',   label: '平均' },
              ]} />
            </Form.Item>
            <Form.Item label="階層代表ステータス" name="level_status_rule" style={{ minWidth: 200 }}>
              <Select size="small" options={[
                { value: 'WORST_CASE', label: '最悪値採用' },
                { value: 'MAJORITY',  label: '多数決' },
              ]} />
            </Form.Item>
            <Form.Item label="階層スコア" name="level_score_rule" style={{ minWidth: 150 }}>
              <Select size="small" options={[
                { value: 'MEAN', label: '平均' },
                { value: 'MIN',  label: '最小値' },
              ]} />
            </Form.Item>
            <Form.Item label="未評価の扱い" name="missing_handling" style={{ minWidth: 200 }}>
              <Select size="small" options={[
                { value: 'SEPARATE_COUNT',      label: '別カウント' },
                { value: 'EXCLUDE_DENOMINATOR', label: '分母除外' },
                { value: 'TREAT_AS_GOOD',       label: '良好扱い' },
              ]} />
            </Form.Item>
            <Form.Item label="トランジション階層" name="transition_hierarchy" style={{ minWidth: 180 }}>
              <Select size="small" options={[
                { value: 'MERGE', label: '合算' },
                { value: 'SPLIT', label: '分離表示' },
              ]} />
            </Form.Item>
          </Flex>
        </Form>
      </Card>

      <Flex gap={8}>
        {previewProjectId && (
          <Button icon={<EyeOutlined />} onClick={handlePreview} loading={previewing} size="small">
            プレビュー
          </Button>
        )}
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} size="small">
          保存（新版として登録）
        </Button>
      </Flex>

      {previewResult && (
        <>
          <Divider style={{ margin: '8px 0' }} />
          <Card size="small" title={<Text style={{ fontSize: 13 }}>📊 プレビュー結果（適用ルール版 {previewResult.appliedRule.version}）</Text>}>
            <EvaluationSummaryBar summaries={previewResult.levels} />
          </Card>
          {previewResult.attentionItems.length > 0 && (
            <Card size="small" title="⚠️ 要注意項目（プレビュー）">
              <AttentionItemList items={previewResult.attentionItems} />
            </Card>
          )}
        </>
      )}
    </Space>
  );
};

export default AggregationRuleSettings;
