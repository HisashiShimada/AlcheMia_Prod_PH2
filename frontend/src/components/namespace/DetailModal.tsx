'use client';

import React, { useState, useEffect } from 'react';
import {
  App, Modal, Descriptions, Input, Select, Tag, Button, Typography,
} from 'antd';
import {
  SaveOutlined, CloseOutlined, GlobalOutlined, BankOutlined, UserOutlined,
} from '@ant-design/icons';
import type { DetailTarget, DetailModalProps, TermSaved, NamespaceSaved } from '@/types/namespace';
import { useLanguage } from '@/contexts/LanguageContext';

// re-export（既存の import 側を壊さないため）
export type { DetailTarget, TermSaved, NamespaceSaved } from '@/types/namespace';

const { TextArea } = Input;
const { Text } = Typography;

// ──────────────────────────────────────────────
// 型ヒント選択肢
// ──────────────────────────────────────────────
const typeOptions = [
  { value: 'stringType',  label: 'stringType'  },
  { value: 'floatType',   label: 'floatType'   },
  { value: 'intType',     label: 'intType'     },
  { value: 'booleanType', label: 'booleanType' },
  { value: 'dateType',    label: 'dateType'    },
  { value: 'anyType',     label: 'anyType'     },
];

// ──────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────
const DetailModal: React.FC<DetailModalProps> = ({ open, target, onClose, onTermSaved, onNamespaceSaved }) => {

  const { message } = App.useApp();
  const { t } = useLanguage();

  // ── 用語用ステート
  const [editDisplayJa, setDisplayJa]    = useState('');
  const [editDisplayEn, setDisplayEn]    = useState('');
  const [editDesc,      setEditDesc]     = useState('');
  const [editType,      setEditType]     = useState('stringType');
  const [editUnit,      setEditUnit]     = useState('');

  // ── 名前空間用ステート
  const [editPrefix,    setEditPrefix]   = useState('');
  const [editUri,       setEditUri]      = useState('');
  const [editNsName,    setEditNsName]   = useState('');
  const [editNsDesc,    setEditNsDesc]   = useState('');

  // レベル表示ヘルパー（t() を使うため関数内で定義）
  const levelDisplay = (level: string) => {
    if (level === 'global')       return { icon: <GlobalOutlined />, label: t('namespaceDetail.levelGlobal'),       color: 'blue'   };
    if (level === 'organization') return { icon: <BankOutlined />,   label: t('namespaceDetail.levelOrganization'), color: 'green'  };
    return                               { icon: <UserOutlined />,   label: t('namespaceDetail.levelPersonal'),     color: 'orange' };
  };

  // target が変わったら各ステートをリセット
  useEffect(() => {
    if (!target) return;
    if (target.kind === 'term') {
      setDisplayJa('');
      setDisplayEn('');
      setEditDesc('');
      setEditType('stringType');
      setEditUnit('');
    } else {
      setEditPrefix(target.prefix);
      setEditUri(target.uri);
      setEditNsName(target.displayName ?? '');
      setEditNsDesc(target.description ?? '');
    }
  }, [target]);

  if (!target) return null;

  // ── 保存ハンドラ
  const handleSave = () => {
    if (target.kind === 'term') {
      onTermSaved({ id: target.termId, displayName: editDisplayJa, description: editDesc, type: editType });
      message.success(t('namespaceDetail.saveTermSuccess'));
    } else {
      if (!editPrefix.trim()) { message.error(t('namespaceDetail.prefixRequired')); return; }
      if (!editUri.trim())    { message.error(t('namespaceDetail.uriRequired')); return; }
      onNamespaceSaved({
        key: target.nsKey, prefix: editPrefix.trim(), uri: editUri.trim(),
        displayName: editNsName, description: editNsDesc,
        updatedAt: new Date().toLocaleString('ja-JP', { hour12: false }),
      });
      message.success(t('namespaceDetail.saveNsSuccess'));
    }
  };

  const modalTitle = target.kind === 'term'
    ? t('namespaceDetail.titleTerm')
    : t('namespaceDetail.titleNamespace');

  return (
    <Modal open={open} title={modalTitle} width={640} onCancel={onClose} footer={null} maskClosable keyboard>

      {/* ── 用語詳細 ── */}
      {target.kind === 'term' && (
        <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label={t('namespaceDetail.labelDisplayJa')}>
            <Input value={editDisplayJa} onChange={(e) => setDisplayJa(e.target.value)} size="small" />
          </Descriptions.Item>
          <Descriptions.Item label={t('namespaceDetail.labelDisplayEn')}>
            <Input value={editDisplayEn} onChange={(e) => setDisplayEn(e.target.value)} size="small" placeholder="Sample Identifier" />
          </Descriptions.Item>
          <Descriptions.Item label={t('namespaceDetail.labelDescription')}>
            <TextArea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} size="small" rows={3} />
          </Descriptions.Item>
          <Descriptions.Item label={t('namespaceDetail.labelTypeHint')}>
            <Select size="small" style={{ width: 160 }} value={editType} options={typeOptions} onChange={setEditType} />
          </Descriptions.Item>
          <Descriptions.Item label={t('namespaceDetail.labelUnitHint')}>
            <Input size="small" value={editUnit} onChange={(e) => setEditUnit(e.target.value)} placeholder={t('namespaceDetail.placeholderUnitNone')} style={{ width: 160 }} />
          </Descriptions.Item>
        </Descriptions>
      )}

      {/* ── 名前空間詳細 ── */}
      {target.kind === 'namespace' && (
        <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label={t('namespaceDetail.labelPrefix')}>
            <Input value={editPrefix} onChange={(e) => setEditPrefix(e.target.value)} size="small" placeholder="例: CorpA" />
          </Descriptions.Item>
          <Descriptions.Item label={t('namespaceDetail.labelUri')}>
            <Input value={editUri} onChange={(e) => setEditUri(e.target.value)} size="small" placeholder="例: https://www.corpa.co.jp/" />
          </Descriptions.Item>
          <Descriptions.Item label={t('namespaceDetail.labelLevel')}>
            {(() => { const lv = levelDisplay(target.level); return <Tag color={lv.color} icon={lv.icon}>{lv.label}</Tag>; })()}
          </Descriptions.Item>
          <Descriptions.Item label={t('namespaceDetail.labelTermCount')}>
            <Text>{target.termCount}{t('namespaceDetail.termCountSuffix')}</Text>
          </Descriptions.Item>
          <Descriptions.Item label={t('namespaceDetail.labelDisplayName')}>
            <Input value={editNsName} onChange={(e) => setEditNsName(e.target.value)} size="small" placeholder="例: CorpA 社内用語" />
          </Descriptions.Item>
          <Descriptions.Item label={t('namespaceDetail.labelDescription')}>
            <TextArea value={editNsDesc} onChange={(e) => setEditNsDesc(e.target.value)} size="small" rows={3} placeholder="名前空間の用途・背景を入力..." />
          </Descriptions.Item>
          {target.createdAt && (
            <Descriptions.Item label={t('namespaceDetail.labelCreatedAt')}><Text type="secondary">{target.createdAt}</Text></Descriptions.Item>
          )}
          {target.updatedAt && (
            <Descriptions.Item label={t('namespaceDetail.labelUpdatedAt')}><Text type="secondary">{target.updatedAt}</Text></Descriptions.Item>
          )}
        </Descriptions>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button icon={<SaveOutlined />} type="primary" onClick={handleSave}>{t('common.save')}</Button>
        <Button icon={<CloseOutlined />} onClick={onClose}>{t('common.cancel')}</Button>
      </div>
    </Modal>
  );
};

export default DetailModal;
