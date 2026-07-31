'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal, Descriptions, Input, Select, Tag, Button, message, Typography,
} from 'antd';
import {
  SaveOutlined, CloseOutlined, GlobalOutlined, BankOutlined, UserOutlined,
} from '@ant-design/icons';
import termsRaw from '../../../mock/namespace/terms.json';
import termDetailRaw from '../../../mock/namespace/termDetail.json';
import type { DetailTarget, DetailModalProps, TermSaved, NamespaceSaved, RawTerm, RawDetail } from '@/types/namespace';
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
// レベル表示ヘルパー
// ──────────────────────────────────────────────
const levelDisplay = (level: string) => {
  if (level === 'global')       return { icon: <GlobalOutlined />, label: 'グローバル (Global)',  color: 'blue'   };
  if (level === 'organization') return { icon: <BankOutlined />,   label: '組織 (Organization)', color: 'green'  };
  return                               { icon: <UserOutlined />,   label: '個人 (Personal)',     color: 'orange' };
};

// ──────────────────────────────────────────────
// 用語データ取得（termId から構築）
// ──────────────────────────────────────────────
const buildTermDetail = (termId: string) => {
  const terms = termsRaw as RawTerm[];
  const found = terms.find((t) => t.id === termId);
  if (!found) {
    const d = (termDetailRaw as { detail: RawDetail }).detail;
    return { qname: d.qname, localName: d.localName, namespacePrefix: d.namespacePrefix, namespaceUri: d.namespaceUri, level: d.level as 'global' | 'organization' | 'personal', displayNameJa: d.displayNameJa, displayNameEn: d.displayNameEn, description: d.description, typeHint: d.typeHint, unitHint: d.unitHint, createdAt: d.createdAt, updatedAt: d.updatedAt };
  }
  return {
    qname: found.qname, localName: found.localName,
    namespacePrefix: found.prefix,
    namespaceUri: found.prefix === 'CorpA' ? 'https://www.corpa.co.jp/' : `https://example.org/${found.prefix}/`,
    level: 'organization' as const,
    displayNameJa: found.displayName, displayNameEn: '',
    description: found.description, typeHint: found.type, unitHint: null,
    createdAt: '2026-04-15 10:30', updatedAt: '2026-05-01 09:15',
  };
};

// ──────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────
const DetailModal: React.FC<DetailModalProps> = ({ open, target, onClose, onTermSaved, onNamespaceSaved }) => {

  // ── 用語用ステート
  const { t } = useLanguage();
  const [termDetail,    setTermDetail]    = useState(() => target?.kind === 'term' ? buildTermDetail(target.termId) : buildTermDetail(''));
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

  // target が変わったら各ステートをリセット
  useEffect(() => {
    if (!target) return;
    if (target.kind === 'term') {
      const d = buildTermDetail(target.termId);
      setTermDetail(d);
      setDisplayJa(d.displayNameJa);
      setDisplayEn(d.displayNameEn);
      setEditDesc(d.description);
      setEditType(d.typeHint);
      setEditUnit(d.unitHint ?? '');
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

  const modalTitle = target.kind === 'term' ? '用語編集' : '名前空間編集';

  return (
    <Modal open={open} title={modalTitle} width={640} onCancel={onClose} footer={null} maskClosable keyboard>

      {/* ── 用語詳細 ── */}
      {target.kind === 'term' && (
        <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label="QName" contentStyle={{ background: '#fff' }}>
            <Text strong>{termDetail.qname}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="ローカル名">
            <Text code>{termDetail.localName}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="名前空間">
            {termDetail.namespacePrefix}
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>({termDetail.namespaceUri})</Text>
          </Descriptions.Item>
          <Descriptions.Item label="レベル">
            {(() => { const lv = levelDisplay(termDetail.level); return <Tag color={lv.color} icon={lv.icon}>{lv.label}</Tag>; })()}
          </Descriptions.Item>
          <Descriptions.Item label="表示名 (JA)">
            <Input value={editDisplayJa} onChange={(e) => setDisplayJa(e.target.value)} size="small" />
          </Descriptions.Item>
          <Descriptions.Item label="表示名 (EN)">
            <Input value={editDisplayEn} onChange={(e) => setDisplayEn(e.target.value)} size="small" placeholder="Sample Identifier" />
          </Descriptions.Item>
          <Descriptions.Item label="説明">
            <TextArea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} size="small" rows={3} />
          </Descriptions.Item>
          <Descriptions.Item label="型ヒント">
            <Select size="small" style={{ width: 160 }} value={editType} options={typeOptions} onChange={setEditType} />
          </Descriptions.Item>
          <Descriptions.Item label="単位ヒント">
            <Input size="small" value={editUnit} onChange={(e) => setEditUnit(e.target.value)} placeholder="—（なし）" style={{ width: 160 }} />
          </Descriptions.Item>
          <Descriptions.Item label="作成日時">
            <Text type="secondary">{termDetail.createdAt}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="更新日時">
            <Text type="secondary">{termDetail.updatedAt}</Text>
          </Descriptions.Item>
        </Descriptions>
      )}

      {/* ── 名前空間詳細 ── */}
      {target.kind === 'namespace' && (
        <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label="接頭辞 (Prefix)">
            <Input value={editPrefix} onChange={(e) => setEditPrefix(e.target.value)} size="small" placeholder="例: CorpA" />
          </Descriptions.Item>
          <Descriptions.Item label="URI">
            <Input value={editUri} onChange={(e) => setEditUri(e.target.value)} size="small" placeholder="例: https://www.corpa.co.jp/" />
          </Descriptions.Item>
          <Descriptions.Item label="レベル">
            {(() => { const lv = levelDisplay(target.level); return <Tag color={lv.color} icon={lv.icon}>{lv.label}</Tag>; })()}
          </Descriptions.Item>
          <Descriptions.Item label="用語数">
            <Text>{target.termCount} 件</Text>
          </Descriptions.Item>
          <Descriptions.Item label="表示名">
            <Input value={editNsName} onChange={(e) => setEditNsName(e.target.value)} size="small" placeholder="例: CorpA 社内用語" />
          </Descriptions.Item>
          <Descriptions.Item label="説明">
            <TextArea value={editNsDesc} onChange={(e) => setEditNsDesc(e.target.value)} size="small" rows={3} placeholder="名前空間の用途・背景を入力..." />
          </Descriptions.Item>
          {target.createdAt && (
            <Descriptions.Item label="作成日時"><Text type="secondary">{target.createdAt}</Text></Descriptions.Item>
          )}
          {target.updatedAt && (
            <Descriptions.Item label="更新日時"><Text type="secondary">{target.updatedAt}</Text></Descriptions.Item>
          )}
        </Descriptions>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button icon={<SaveOutlined />} type="primary" onClick={handleSave}>保存</Button>
        <Button icon={<CloseOutlined />} onClick={onClose}>キャンセル</Button>
      </div>
    </Modal>
  );
};

export default DetailModal;
