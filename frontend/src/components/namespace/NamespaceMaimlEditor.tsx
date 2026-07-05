'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Modal, Tooltip, Typography, Tag, Checkbox, Input,
} from 'antd';
import { extractUsedPrefixes } from '@/utils/validationUtils';
import {
  UserOutlined, TeamOutlined, BankOutlined,
  ShopOutlined, RightOutlined, DownOutlined, SearchOutlined,
} from '@ant-design/icons';
import scopeTreeRaw from '../../../mock/namespace/uncertainty-scope.json';
import type { SectionKey, SectionDef, NsItem, MaimlScopeNode, NamespaceMaimlEditorProps } from '@/types/namespace';

const { Text } = Typography;

// ──────────────────────────────────────────────
// モック: ログイン中ユーザーの所属チームキー
// 本番実装では認証APIから取得する
// ──────────────────────────────────────────────
const CURRENT_USER_TEAM_KEY = 'rd-materials'; // 材料グループ（研究開発部 配下）
const CURRENT_USER_KEY      = 'user-001';     // 山田 太郎（ログイン中ユーザー）

// ──────────────────────────────────────────────
// uncertainty-scope.json から名前空間アイテムを構築
// ユーザーの所属チームキーを渡すと、所属部署・所属チームのみにフィルタリングする
// グローバルセクションは含まない
// ──────────────────────────────────────────────
const buildAllNamespaces = (userTeamKey: string): NsItem[] => {
  const tree = scopeTreeRaw as MaimlScopeNode[];
  const result: NsItem[] = [];
  let order = 1;

  // 組織（company ノードの namespaces 配列を個別の NsItem として追加）
  const companyNode = tree.find((n) => n.key === 'company');
  if (companyNode) {
    const nsList = companyNode.namespaces && companyNode.namespaces.length > 0
      ? companyNode.namespaces
      : [{ key: companyNode.key, prefix: companyNode.prefix ?? companyNode.label, uri: companyNode.uri ?? '' }];
    for (const ns of nsList) {
      result.push({
        key: ns.key,
        prefix: ns.prefix,
        uri: ns.uri,
        order: order++, auto: true, sectionKey: 'organization',
        groupLabel: companyNode.label, groupUri: companyNode.uri ?? '',
        deleted: false,
      });
    }
  }

  // 部署・チーム: ユーザーの所属チームが属する部署のみ表示
  if (companyNode?.children) {
    for (const dept of companyNode.children) {
      // このdeptの配下にユーザーのチームが存在するか確認
      const userTeamNode = dept.children?.find((t) => t.key === userTeamKey);
      if (!userTeamNode) continue; // 所属部署でなければスキップ

      // 所属部署のPrefixを追加
      if (dept.prefix && dept.uri) {
        result.push({
          key: dept.key, prefix: dept.prefix, uri: dept.uri,
          order: order++, auto: true, sectionKey: 'department',
          groupLabel: dept.label, groupUri: dept.uri,
          deleted: false,
        });
      }

      // 所属チームのPrefixのみ追加
      if (userTeamNode.prefix && userTeamNode.uri) {
        result.push({
          key: userTeamNode.key, prefix: userTeamNode.prefix, uri: userTeamNode.uri,
          order: order++, auto: true, sectionKey: 'team',
          groupLabel: userTeamNode.label, groupUri: userTeamNode.uri,
          deleted: false,
        });
      }
    }
  }

  // 個人: ログインユーザー自身のノードのみ追加（user.key が CURRENT_USER_KEY と一致するユーザー）
  const personalNode = tree.find((n) => n.key === 'personal');
  if (personalNode?.children) {
    for (const user of personalNode.children) {
      // ログインユーザーのみ（user.key で厳密に絞り込む）
      if (user.key !== CURRENT_USER_KEY) continue;
      if (user.children) {
        for (const ns of user.children) {
          if (ns.prefix && ns.uri) {
            result.push({
              key: ns.key, prefix: ns.prefix, uri: ns.uri,
              order: order++, auto: true, sectionKey: 'personal',
              groupLabel: user.label, groupUri: user.uri ?? ns.uri,
              deleted: false,
            });
          }
        }
      }
    }
  }

  return result;
};

// ──────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────
const NamespaceMaimlEditor: React.FC<NamespaceMaimlEditorProps> = ({ open, onClose, maimlXml }) => {
  const [items, setItems] = useState<NsItem[]>(() => buildAllNamespaces(CURRENT_USER_TEAM_KEY));

  // 検索キーワード
  const [searchText, setSearchText] = useState('');

  // MaiMLファイルで実際に使用中のprefixセット（maimlXmlが渡された場合のみ有効）
  const usedPrefixes = useMemo<Set<string>>(
    () => new Set(maimlXml ? extractUsedPrefixes(maimlXml) : []),
    [maimlXml],
  );

  // アコーディオン開閉状態（デフォルト全展開）
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'section-organization': true,
    'section-department':   true,
    'section-team':         true,
    'section-personal':     true,
  });

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // セクション内のONアイテムのうち、MaiMLで使用中のprefixを返す
  const getUsedPrefixesInSection = useCallback(
    (sectionKey: SectionKey): string[] => {
      return items
        .filter((it) => it.sectionKey === sectionKey && !it.deleted)
        .map((it) => it.prefix)
        .filter((prefix) => usedPrefixes.has(prefix));
    },
    [items, usedPrefixes],
  );

  // 実際にOFFにする処理
  const doSectionOff = useCallback((sectionKey: SectionKey) => {
    setItems((prev) =>
      prev.map((it) => it.sectionKey === sectionKey ? { ...it, deleted: true } : it),
    );
  }, []);

  // セクション単位で一括 ON/OFF（OFFにする前に使用中チェック）
  const handleSectionToggle = useCallback((sectionKey: SectionKey, checked: boolean) => {
    if (checked) {
      setItems((prev) =>
        prev.map((it) => it.sectionKey === sectionKey ? { ...it, deleted: false } : it),
      );
      return;
    }

    const usedInSection = getUsedPrefixesInSection(sectionKey);

    if (usedInSection.length > 0) {
      const prefixList = usedInSection.map((p) => `「${p}」`).join('、');
      Modal.confirm({
        title: '名前空間をOFFにしてよろしいですか？',
        content: (
          <div>
            <p>
              {prefixList} は現在MaiMLファイル内で使用中です。
            </p>
            <p style={{ color: '#ff4d4f', marginTop: 8 }}>
              OFFにするとMaiMLファイルの名前空間解決に影響する可能性があります。
            </p>
          </div>
        ),
        okText: 'OFFにする',
        okType: 'danger',
        cancelText: 'キャンセル',
        onOk: () => doSectionOff(sectionKey),
      });
    } else {
      doSectionOff(sectionKey);
    }
  }, [getUsedPrefixesInSection, doSectionOff]);

  // セクションの ON/OFF 状態を計算
  const getSectionCheckState = (sectionKey: SectionKey): { allOn: boolean; someOn: boolean } => {
    const sectionItems = items.filter((it) => it.sectionKey === sectionKey);
    const onCount = sectionItems.filter((it) => !it.deleted).length;
    return {
      allOn: onCount === sectionItems.length,
      someOn: onCount > 0 && onCount < sectionItems.length,
    };
  };
  const isSectionAllOn = (sectionKey: SectionKey) =>
    getSectionCheckState(sectionKey).allOn;

  // アイコン
  const sectionIcon = (sectionKey: SectionKey) => {
    switch (sectionKey) {
      case 'personal':     return <UserOutlined   style={{ color: '#fa8c16', marginRight: 6 }} />;
      case 'team':         return <TeamOutlined   style={{ color: '#722ed1', marginRight: 6 }} />;
      case 'department':   return <BankOutlined   style={{ color: '#52c41a', marginRight: 6 }} />;
      case 'organization': return <ShopOutlined   style={{ color: '#13c2c2', marginRight: 6 }} />;
      default:             return null;
    }
  };

  // ──── セクション定義
  const sections = useMemo<SectionDef[]>(() => {
    const result: SectionDef[] = [];

    // 1. 組織（会社名を表示）
    const orgItems = items.filter((it) => it.sectionKey === 'organization');
    if (orgItems.length > 0) {
      result.push({
        id: 'section-organization',
        sectionKey: 'organization',
        label: orgItems[0]?.groupLabel ?? '組織',
        uri: orgItems[0]?.groupUri ?? '',
        childRows: orgItems.map((it) => ({ label: it.groupLabel, prefix: it.prefix, uri: it.uri, itemKey: it.key })),
      });
    }

    // 2. 部署
    const deptItems = items.filter((it) => it.sectionKey === 'department');
    if (deptItems.length > 0) {
      const deptUri = deptItems[0]?.groupUri ?? '';
      const uniqueDepts = Array.from(new Map(deptItems.map((it) => [it.groupLabel, it])).values());
      result.push({
        id: 'section-department',
        sectionKey: 'department',
        label: deptItems[0]?.groupLabel ?? '部署',
        uri: deptUri,
        childRows: uniqueDepts.map((it) => ({ label: it.groupLabel, prefix: it.prefix, uri: it.uri, itemKey: it.key })),
      });
    }

    // 3. チーム
    const teamItems = items.filter((it) => it.sectionKey === 'team');
    if (teamItems.length > 0) {
      const teamUri = teamItems[0]?.groupUri ?? '';
      const uniqueTeams = Array.from(new Map(teamItems.map((it) => [it.groupLabel, it])).values());
      result.push({
        id: 'section-team',
        sectionKey: 'team',
        label: teamItems[0]?.groupLabel ?? 'チーム',
        uri: teamUri,
        childRows: uniqueTeams.map((it) => ({ label: it.groupLabel, prefix: it.prefix, uri: it.uri, itemKey: it.key })),
      });
    }

    // 4. 個人（ログインユーザーのみ）
    const personalItems = items.filter((it) => it.sectionKey === 'personal');
    if (personalItems.length > 0) {
      result.push({
        id: 'section-personal',
        sectionKey: 'personal',
        label: personalItems[0]?.groupLabel ?? '個人',
        uri: personalItems[0]?.groupUri ?? '',
        childRows: personalItems.map((it) => ({ label: it.prefix, prefix: it.prefix, uri: it.uri, itemKey: it.key })),
      });
    }

    return result;
  }, [items]);

  // ──── 検索フィルター適用済みセクション一覧
  const filteredSections = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((section) => {
        // セクション名・URIがヒット or 子行がヒットする行のみ残す
        const sectionHit =
          section.label.toLowerCase().includes(q) ||
          section.uri.toLowerCase().includes(q);
        const filteredRows = section.childRows.filter(
          (row) =>
            (row.prefix ?? '').toLowerCase().includes(q) ||
            (row.uri ?? '').toLowerCase().includes(q) ||
            row.label.toLowerCase().includes(q),
        );
        if (!sectionHit && filteredRows.length === 0) return null;
        return { ...section, childRows: sectionHit ? section.childRows : filteredRows };
      })
      .filter(Boolean) as SectionDef[];
  }, [sections, searchText]);

  // ──── セクションヘッダー行
  const renderSectionHeader = (section: SectionDef) => {
    const sectionOn = isSectionAllOn(section.sectionKey);
    const isOpen    = expanded[section.id] ?? true;

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: '#f5f5f5',
          borderRadius: isOpen ? '6px 6px 0 0' : 6,
          border: '1px solid #e8e8e8',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => toggleExpand(section.id)}
      >
        {/* 展開アイコン */}
        <span style={{ fontSize: 11, color: '#8c8c8c', flexShrink: 0, width: 12 }}>
          {isOpen ? <DownOutlined /> : <RightOutlined />}
        </span>

        {/* アイコン + セクション名 */}
        <span style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {sectionIcon(section.sectionKey)}
          {section.label}
        </span>

        {/* URI */}
        <Text
          type="secondary"
          style={{
            fontSize: 12, flex: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontFamily: 'monospace',
          }}
          title={section.uri}
          onClick={(e) => e.stopPropagation()}
        >
          {section.uri}
        </Text>

        {/* チェックボックス */}
        <Tooltip title={sectionOn ? '全てOFFにする' : '全てONにする'}>
          <Checkbox
            checked={sectionOn}
            indeterminate={getSectionCheckState(section.sectionKey).someOn}
            style={{ flexShrink: 0 }}
            onChange={(e) => {
              e.nativeEvent.stopPropagation();
              handleSectionToggle(section.sectionKey, e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </Tooltip>
      </div>
    );
  };

  // 行単位の ON/OFF トグル
  const handleItemToggle = useCallback((itemKey: string, checked: boolean) => {
    setItems((prev) =>
      prev.map((it) => it.key === itemKey ? { ...it, deleted: !checked } : it),
    );
  }, []);

  // ──── セクション内子行
  const renderChildRow = (row: { label: string; prefix?: string; uri?: string; itemKey?: string }, idx: number) => {
    const itemOn = row.itemKey
      ? items.find((it) => it.key === row.itemKey)?.deleted === false
      : true;
    const isOff = !itemOn;

    return (
      <div
        key={idx}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '5px 12px 5px 16px',
          borderBottom: '1px solid #f5f5f5',
          background: isOff ? '#fafafa' : '#fff',
          opacity: isOff ? 0.5 : 1,
          cursor: 'pointer',
        }}
        onClick={() => {
          if (row.itemKey) handleItemToggle(row.itemKey, !itemOn);
        }}
      >
        <Tag
          color={isOff ? 'default' : 'blue'}
          style={{ minWidth: 90, textAlign: 'center', flexShrink: 0, fontWeight: 600 }}
        >
          {row.prefix ?? row.label}
        </Tag>
        <Text
          type="secondary"
          style={{
            fontSize: 12, flex: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            textDecoration: isOff ? 'line-through' : 'none',
          }}
        >
          {row.uri ?? ''}
        </Text>
        {row.itemKey && (
          <Checkbox
            checked={itemOn}
            onChange={(e) => {
              e.stopPropagation();
              handleItemToggle(row.itemKey!, e.target.checked);
            }}
            style={{ flexShrink: 0 }}
          />
        )}
      </div>
    );
  };

  const onCount  = items.filter((it) => !it.deleted).length;
  const offCount = items.filter((it) => it.deleted).length;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={<span style={{ fontSize: 16, fontWeight: 600 }}>このMaiMLファイルに設定されている名前空間</span>}
      width={700}
      style={{ top: 40 }}
      styles={{ body: { padding: '12px 16px', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' } }}
      footer={null}
      maskClosable={false}
    >
      {/* 検索欄 */}
      <Input
        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
        placeholder="Prefix・URI・セクション名で検索"
        allowClear
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ marginBottom: 10 }}
      />

      <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>
        スイッチをON/OFFで各名前空間の適用状態を個別に切り替えられます。
      </Text>

      {/* 縦並びアコーディオン */}
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filteredSections.length === 0 ? (
          <Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: '16px 0' }}>
            該当する名前空間が見つかりません
          </Text>
        ) : (
          filteredSections.map((section) => {
            const isOpen = expanded[section.id] ?? true;
            return (
              <div key={section.id}>
                {renderSectionHeader(section)}
                {isOpen && (
                  <div style={{ border: '1px solid #e8e8e8', borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'hidden' }}>
                    {section.childRows.map((row, idx) => renderChildRow(row, idx))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12, textAlign: 'right' }}>
        ON: {onCount} 件 / OFF: {offCount} 件
      </Text>
    </Modal>
  );
};

export default NamespaceMaimlEditor;
