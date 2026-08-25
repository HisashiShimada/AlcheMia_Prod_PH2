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
import { useLanguage } from '@/contexts/LanguageContext';
import EvaluationSummaryBar from '@/components/project/subcomponents/EvaluationSummaryBar';
import AttentionItemList from '@/components/project/subcomponents/AttentionItemList';
import type { CreateAggregationRuleInput, SummaryPreviewResponse, AggregationRuleSettingsProps } from '@/types/aggregationRule';

const { Title, Text } = Typography;

const AggregationRuleSettings: React.FC<AggregationRuleSettingsProps> = ({ previewProjectId }) => {
  const { t } = useLanguage();
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
      setError(err instanceof Error ? err.message : t('aggregationRule.previewFailed'));
    } finally {
      setPreviewing(false);
    }
  }, [form, previewProjectId, previewRule, t]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);
      const values = await form.validateFields();
      await createNewRule(values);
      setSaveSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('aggregationRule.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [form, createNewRule, t]);

  if (isLoading) {
    return <Flex justify="center" style={{ padding: 40 }}><Spin tip={t('aggregationRule.loading')} /></Flex>;
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
      <Title level={5} style={{ marginBottom: 0 }}>{t('aggregationRule.title')}</Title>

      {activeRule
        ? <Alert type="info" message={t('aggregationRule.activeRuleInfo', { version: String(activeRule.version) })} showIcon />
        : <Alert type="warning" message={t('aggregationRule.noActiveRule')} showIcon />
      }
      {saveSuccess && <Alert type="success" message={t('aggregationRule.saveSuccess')} showIcon closable onClose={() => setSaveSuccess(false)} />}
      {error && <Alert type="error" message={error} showIcon closable onClose={() => setError(null)} />}

      <Card size="small" title={t('aggregationRule.scoreMappingTitle')}>
        <Form form={form} initialValues={initialValues} layout="inline">
          <Form.Item label={t('aggregationRule.scoreGood')} name="score_good">
            <InputNumber min={0} max={100} size="small" style={{ width: 70 }} />
          </Form.Item>
          <Form.Item label={t('aggregationRule.scoreCaution')} name="score_caution">
            <InputNumber min={0} max={100} size="small" style={{ width: 70 }} />
          </Form.Item>
          <Form.Item label={t('aggregationRule.scoreBad')} name="score_bad">
            <InputNumber min={0} max={100} size="small" style={{ width: 70 }} />
          </Form.Item>
        </Form>
      </Card>

      <Card size="small" title={t('aggregationRule.aggregationRuleTitle')}>
        <Form form={form} initialValues={initialValues} layout="vertical">
          <Flex gap={16} wrap="wrap">
            <Form.Item label={t('aggregationRule.targetRollup.label')} name="target_rollup" style={{ minWidth: 200 }}>
              <Select size="small" options={[
                { value: 'WORST_CASE', label: t('aggregationRule.targetRollup.worstCase') },
                { value: 'MAJORITY',  label: t('aggregationRule.targetRollup.majority') },
                { value: 'AVERAGE',   label: t('aggregationRule.targetRollup.average') },
              ]} />
            </Form.Item>
            <Form.Item label={t('aggregationRule.levelStatusRule.label')} name="level_status_rule" style={{ minWidth: 200 }}>
              <Select size="small" options={[
                { value: 'WORST_CASE', label: t('aggregationRule.levelStatusRule.worstCase') },
                { value: 'MAJORITY',  label: t('aggregationRule.levelStatusRule.majority') },
              ]} />
            </Form.Item>
            <Form.Item label={t('aggregationRule.levelScoreRule.label')} name="level_score_rule" style={{ minWidth: 150 }}>
              <Select size="small" options={[
                { value: 'MEAN', label: t('aggregationRule.levelScoreRule.mean') },
                { value: 'MIN',  label: t('aggregationRule.levelScoreRule.min') },
              ]} />
            </Form.Item>
            <Form.Item label={t('aggregationRule.missingHandling.label')} name="missing_handling" style={{ minWidth: 200 }}>
              <Select size="small" options={[
                { value: 'SEPARATE_COUNT',      label: t('aggregationRule.missingHandling.separateCount') },
                { value: 'EXCLUDE_DENOMINATOR', label: t('aggregationRule.missingHandling.excludeDenominator') },
                { value: 'TREAT_AS_GOOD',       label: t('aggregationRule.missingHandling.treatAsGood') },
              ]} />
            </Form.Item>
            <Form.Item label={t('aggregationRule.transitionHierarchy.label')} name="transition_hierarchy" style={{ minWidth: 180 }}>
              <Select size="small" options={[
                { value: 'MERGE', label: t('aggregationRule.transitionHierarchy.merge') },
                { value: 'SPLIT', label: t('aggregationRule.transitionHierarchy.split') },
              ]} />
            </Form.Item>
          </Flex>
        </Form>
      </Card>

      <Flex gap={8}>
        {previewProjectId && (
          <Button icon={<EyeOutlined />} onClick={handlePreview} loading={previewing} size="small">
            {t('aggregationRule.buttons.preview')}
          </Button>
        )}
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} size="small">
          {t('aggregationRule.buttons.save')}
        </Button>
      </Flex>

      {previewResult && (
        <>
          <Divider style={{ margin: '8px 0' }} />
          <Card size="small" title={<Text style={{ fontSize: 13 }}>{t('aggregationRule.preview.resultTitle', { version: String(previewResult.appliedRule.version) })}</Text>}>
            <EvaluationSummaryBar summaries={previewResult.levels} />
          </Card>
          {previewResult.attentionItems.length > 0 && (
            <Card size="small" title={t('aggregationRule.preview.attentionTitle')}>
              <AttentionItemList items={previewResult.attentionItems} />
            </Card>
          )}
        </>
      )}
    </Space>
  );
};

export default AggregationRuleSettings;
