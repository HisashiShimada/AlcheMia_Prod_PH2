'use client';

import React, { useState } from 'react';
import {
  App, Modal, Form, Input, Select, Radio, Button, Divider, Alert, Typography,
} from 'antd';
import {
  CheckOutlined, CloseOutlined, LinkOutlined,
} from '@ant-design/icons';
import { generateNamespaceUri } from '@/utils/namespaceUriGenerator';
import type { Level, NamespaceFormValues, NamespaceAddDialogProps } from '@/types/namespace';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

// ──────────────────────────────────────────────
// モック: ログインユーザーの組織CD・部署CD
// 本番実装では認証APIから取得する
// ──────────────────────────────────────────────
const MOCK_ORG_CD  = 'ORG001';
const MOCK_DEPT_CD = 'RD';

// ──────────────────────────────────────────────
// 親名前空間の選択肢（モック）
// ──────────────────────────────────────────────
const parentOptions = [
  { value: 'ns-corpa', label: 'CorpA  (https://www.corpa.co.jp/)' },
  { value: 'ns-laba',  label: 'LabA  (https://corpa.co.jp/lab/)' },
];

// ──────────────────────────────────────────────
// バリデーション：xs:NCName
// ──────────────────────────────────────────────
const ncNamePattern = /^[A-Za-z_][A-Za-z0-9._\-]*$/;

// ──────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────
const NamespaceAddDialog: React.FC<NamespaceAddDialogProps> = ({ open, onClose, onRegistered }) => {
  const { message } = App.useApp();
  const { t } = useLanguage();
  const [form]  = Form.useForm<NamespaceFormValues>();
  const [level, setLevel] = useState<Level>('organization');

  // ── レベル別 URI ガイダンス（t() を使うためコンポーネント内で定義）
  const uriGuidance: Record<Level, string> = {
    global:       t('namespaceAdd.uriGuidance.global'),
    organization: t('namespaceAdd.uriGuidance.organization'),
    personal:     t('namespaceAdd.uriGuidance.personal'),
  };

  // ── レベル別ガイダンス（Alert）
  const levelGuidance: Record<Level, string> = {
    global:       t('namespaceAdd.levelGuidance.global'),
    organization: t('namespaceAdd.levelGuidance.organization'),
    personal:     t('namespaceAdd.levelGuidance.personal'),
  };

  // ── バリデーション関数（t() を使うためコンポーネント内で定義）
  const validatePrefix = (_: unknown, value: string) => {
    if (!value) return Promise.reject(t('namespaceAdd.validation.prefixRequired'));
    if (!ncNamePattern.test(value))
      return Promise.reject(t('namespaceAdd.validation.prefixInvalid'));
    if (value.length > 64) return Promise.reject(t('namespaceAdd.validation.prefixTooLong'));
    return Promise.resolve();
  };

  const validateUri = (_: unknown, value: string) => {
    if (!value) return Promise.reject(t('namespaceAdd.validation.uriRequired'));
    if (!value.startsWith('https://') && !value.startsWith('http://') && !value.startsWith('urn:'))
      return Promise.reject(t('namespaceAdd.validation.uriInvalid'));
    if (value.length > 512) return Promise.reject(t('namespaceAdd.validation.uriTooLong'));
    return Promise.resolve();
  };

  // organization レベル時に Prefix の入力に連動してURIプレビューを生成
  const watchedPrefix: string = Form.useWatch('prefix', form) ?? '';
  const autoUri = level === 'organization'
    ? generateNamespaceUri(MOCK_ORG_CD, MOCK_DEPT_CD, watchedPrefix ? [watchedPrefix] : undefined)
    : '';

  const handleLevelChange = (val: Level) => {
    setLevel(val);
    form.setFieldValue('parentNamespace', null);
    // organization → 他レベルへ切り替えた際にURIをクリア
    if (val !== 'organization') {
      form.setFieldValue('uri', '');
    }
  };

  const handleOrcidAutoFill = () => {
    // モック: 実際は OAuth2 ポップアップで取得
    const orcidId = '0000-0002-2494-9603';
    form.setFieldValue('uri', `https://orcid.org/${orcidId}`);
    message.success(t('namespaceAdd.orcidAutoFilled'));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      // organization レベルの場合は自動生成URIをセット
      if (level === 'organization') {
        values.uri = autoUri;
      }
      onRegistered(values);
      form.resetFields();
      setLevel('organization');
      message.success(t('namespaceAdd.registerSuccess', { prefix: values.prefix }));
    } catch {
      // バリデーションエラーは Form が表示
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setLevel('organization');
    onClose();
  };

  return (
    <Modal
      open={open}
      title={t('namespaceAdd.title')}
      width={560}
      onCancel={handleCancel}
      footer={null}
      maskClosable={false}
      keyboard
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ level: 'organization' }}
        requiredMark="optional"
      >
        {/* ── レベル選択 ── */}
        <Form.Item
          label={t('namespaceAdd.labelLevel')}
          name="level"
        >
          <Radio.Group
            onChange={(e) => handleLevelChange(e.target.value as Level)}
          >
            <Radio value="global">{t('namespaceAdd.levelGlobal')}</Radio>
            <Radio value="organization">{t('namespaceAdd.levelOrganization')}</Radio>
            <Radio value="personal">{t('namespaceAdd.levelPersonal')}</Radio>
          </Radio.Group>
        </Form.Item>

        {/* ── レベル別ガイダンス ── */}
        <Alert
          type="info"
          showIcon
          message={levelGuidance[level]}
          style={{ marginBottom: 16, fontSize: 12 }}
        />

        <Divider style={{ margin: '8px 0 16px' }} />

        {/* ── 接頭辞 ── */}
        <Form.Item
          label={t('namespaceAdd.labelPrefix')}
          name="prefix"
          rules={[{ validator: validatePrefix }]}
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('namespaceAdd.extraPrefix')}
            </Text>
          }
        >
          <Input placeholder="例: CorpA" maxLength={64} />
        </Form.Item>

        {/* ── URI ── */}
        {level === 'organization' ? (
          /* organization レベル: 自動生成プレビュー（読み取り専用） */
          <Form.Item
            label={t('namespaceAdd.labelUriAuto')}
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('namespaceAdd.extraUriAuto', { orgCd: MOCK_ORG_CD, deptCd: MOCK_DEPT_CD, uriGuidance: uriGuidance[level] })}
              </Text>
            }
          >
            <Input
              value={autoUri || t('namespaceAdd.uriAutoPlaceholder')}
              readOnly
              style={{
                backgroundColor: '#f5f5f5',
                color: autoUri ? '#333' : '#aaa',
                cursor: 'default',
              }}
              prefix={<LinkOutlined style={{ color: '#aaa' }} />}
            />
          </Form.Item>
        ) : (
          /* global / personal レベル: 手入力 */
          <Form.Item
            label={t('namespaceAdd.labelUri')}
            name="uri"
            rules={[{ validator: validateUri }]}
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {uriGuidance[level]}
              </Text>
            }
          >
            <Input placeholder="例: https://www.corpa.co.jp/" maxLength={512} />
          </Form.Item>
        )}

        {/* ── 表示名（任意） ── */}
        <Form.Item
          label={t('namespaceAdd.labelDisplayName')}
          name="displayName"
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('namespaceAdd.extraDisplayName')}
            </Text>
          }
        >
          <Input placeholder="例: CorpA 社内用語" maxLength={128} />
        </Form.Item>

        {/* ── 説明（任意） ── */}
        <Form.Item label={t('namespaceAdd.labelDescription')} name="description">
          <Input.TextArea
            placeholder={t('namespaceAdd.placeholderDescription')}
            autoSize={{ minRows: 3, maxRows: 6 }}
            maxLength={1000}
            showCount
          />
        </Form.Item>

        {/* ── 親名前空間（組織レベルのみ） ── */}
        {level === 'organization' && (
          <Form.Item
            label={t('namespaceAdd.labelParentNamespace')}
            name="parentNamespace"
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('namespaceAdd.extraParentNamespace')}
              </Text>
            }
          >
            <Select
              placeholder={t('namespaceAdd.placeholderParentNamespace')}
              allowClear
              showSearch
              optionFilterProp="label"
              options={parentOptions}
            />
          </Form.Item>
        )}

        {/* ── ORCID自動入力（個人レベルのみ） ── */}
        {level === 'personal' && (
          <Form.Item
            label={t('namespaceAdd.labelOrcid')}
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('namespaceAdd.extraOrcid')}
              </Text>
            }
          >
            <Button icon={<LinkOutlined />} onClick={handleOrcidAutoFill}>
              {t('namespaceAdd.btnOrcidAutoFill')}
            </Button>
          </Form.Item>
        )}

        {/* ── フッターボタン ── */}
        <Divider style={{ margin: '8px 0 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button type="primary" icon={<CheckOutlined />} onClick={handleSubmit}>
            {t('namespaceAdd.btnRegister')}
          </Button>
          <Button icon={<CloseOutlined />} onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default NamespaceAddDialog;
