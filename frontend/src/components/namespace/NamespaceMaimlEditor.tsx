'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Modal, Tooltip, Typography, Tag, Checkbox,
} from 'antd';
import { extractUsedPrefixes } from '@/utils/validationUtils';
import {
  LockOutlined, UserOutlined, TeamOutlined, BankOutlined, GlobalOutlined,
  ShopOutlined, RightOutlined, DownOutlined,
} from '@ant-design/icons';
import scopeTreeRaw from '../../../mock/namespace/uncertainty-scope.json';

const { Text } = Typography;

// ──────────────────────────────────────────────
// モック: ログイン中ユーザーの所属チームキー
// 本番実装では認証APIから取得する
// ──────────────────────────────────────────────
const CURRENT_USER_TEAM_KEY = 'rd-materials'; // 材料グループ（研究開発部 配下）

// ──────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────
type SectionKey = 'global' | 'organization' | 'department' | 'team' | 'personal';

interface NsItem {
  key: string;
  prefix: string;
  uri: string;
  order: number;
  auto: boolean;
  sectionKey: SectionKey;
  /** 部署名・チーム名・ユーザー名 */
  groupLabel: string;
  /** セクションヘッダー行に表示するURI */
  groupUri: string;
  deleted: boolean;
}

interface ScopeNode {
  key: string;
  label: string;
  count: number;
  icon?: string;
  prefix?: string;
  uri?: string;
  description?: string;
  /** 組織ノードが持つ複数の名前空間定義 */
  namespaces?: { key: string; prefix: string; uri: string }[];
  children?: ScopeNode[];
}

export interface NamespaceMaimlEditorProps {
  open: boolean;
  onClose: () => void;
  /** MaiMLファイルのXML文字列。渡された場合、使用中のprefixをOFFにしようとすると確認ダイアログを表示する */
  maimlXml?: string;
}

// ──────────────────────────────────────────────
// uncertainty-scope.json から名前空間アイテムを構築
// ユーザーの所属チームキーを渡すと、所属部署・所属チームのみにフィルタリングする
// ──────────────────────────────────────────────
const buildAllNamespaces = (userTeamKey: string): NsItem[] => {
  const tree = scopeTreeRaw as ScopeNode[];
  const result: NsItem[] = [];
  let order = 1;

  // グローバル
  const globalNode = tree.find((n) => n.key === 'global');
  if (globalNode?.children) {
    for (const child of globalNode.children) {
      if (child.prefix && child.uri) {
        result.push({
          key: child.key, prefix: child.prefix, uri: child.uri,
          order: order++, auto: true, sectionKey: 'global',
          groupLabel: 'グローバル', groupUri: globalNode.uri ?? child.uri,
          deleted: false,
        });
      }
    }
  }

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

  // 個人
  const personalNode = tree.find((n) => n.key === 'personal');
  if (personalNode?.children) {
    for (const user of personalNode.children) {
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

  // MaiMLファイルで実際に使用中のprefixセット（maimlXmlが渡された場合のみ有効）
  const usedPrefixes = useMemo<Set<string>>(
    () => new Set(maimlXml ? extractUsedPrefixes(maimlXml) : []),
    [maimlXml],
  );

  // アコーディオン開閉状態（デフォルト全展開）
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'section-global':       true,
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
      // ONにする場合は即座に適用
      setItems((prev) =>
        prev.map((it) => it.sectionKey === sectionKey ? { ...it, deleted: false } : it),
      );
      return;
    }

    // OFFにしようとしている場合
    const usedInSection = getUsedPrefixesInSection(sectionKey);

    if (usedInSection.length > 0) {
      // 使用中のprefixがある場合は確認ダイアログを表示
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
      // 使用中でなければ即座にOFF
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
  // セクションが全ONかどうか（後方互換）
  const isSectionAllOn = (sectionKey: SectionKey) =>
    getSectionCheckState(sectionKey).allOn;

  // disabled 判定・理由（グローバルのみロック）
  const isSectionDisabled = (sectionKey: SectionKey): boolean => {
    return sectionKey === 'global';
  };
  const disabledReason = (sectionKey: SectionKey): string => {
    if (sectionKey === 'global') return 'グローバル名前空間は変更できません';
    return '';
  };

  // アイコン
  const sectionIcon = (sectionKey: SectionKey) => {
    switch (sectionKey) {
      case 'personal':     return <UserOutlined   style={{ color: '#fa8c16', marginRight: 6 }} />;
      case 'team':         return <TeamOutlined   style={{ color: '#722ed1', marginRight: 6 }} />;
      case 'department':   return <BankOutlined   style={{ color: '#52c41a', marginRight: 6 }} />;
      case 'organization': return <ShopOutlined   style={{ color: '#13c2c2', marginRight: 6 }} />;
      case 'global':       return <GlobalOutlined style={{ color: '#1677ff', marginRight: 6 }} />;
    }
  };

  // ──── セクション定義: グローバル→組織→部署→チーム→個人
  type SectionDef = {
    id: string;
    sectionKey: SectionKey;
    label: string;
    uri: string;
    /** 中に表示する行の情報 */
    childRows: { label: string; prefix?: string; uri?: string; itemKey?: string }[];
  };

  const sections = useMemo<SectionDef[]>(() => {
    const result: SectionDef[] = [];

    // 1. グローバル（prefix + uri の行一覧）
    const globalItems = items.filter((it) => it.sectionKey === 'global');
    if (globalItems.length > 0) {
      result.push({
        id: 'section-global',
        sectionKey: 'global',
        label: 'グローバル',
        uri: globalItems[0]?.groupUri ?? '',
        childRows: globalItems.map((it) => ({ label: it.prefix, prefix: it.prefix, uri: it.uri, itemKey: it.key })),
      });
    }

    // 2. 組織（会社名を表示）
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

    // 3. 部署（階層全体を1セクション、中身は部署名のみ）
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

    // 4. チーム（階層全体を1セクション、中身はチーム名のみ）
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

    // 5. 個人（prefix + uri の行一覧）
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

  // ──── セクションヘッダー行
  const renderSectionHeader = (section: SectionDef) => {
    const isGlobal   = section.sectionKey === 'global';
    const isDisabled = isSectionDisabled(section.sectionKey);
    const reason     = disabledReason(section.sectionKey);
    const sectionOn  = isSectionAllOn(section.sectionKey);
    const isOpen     = expanded[section.id] ?? true;

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

        {/* ロック or チェックボックス */}
        {isGlobal ? (
          <Tooltip title={reason}>
            <LockOutlined style={{ color: '#bbb', fontSize: 16, flexShrink: 0 }} />
          </Tooltip>
        ) : (
          <Tooltip title={isDisabled ? reason : (sectionOn ? '全てOFFにする' : '全てONにする')}>
            <Checkbox
              checked={sectionOn}
              indeterminate={getSectionCheckState(section.sectionKey).someOn}
              disabled={isDisabled}
              style={{ flexShrink: 0 }}
              onChange={(e) => {
                e.nativeEvent.stopPropagation();
                handleSectionToggle(section.sectionKey, e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </Tooltip>
        )}
      </div>
    );
  };

  // 行単位の ON/OFF トグル
  const handleItemToggle = useCallback((itemKey: string, checked: boolean) => {
    setItems((prev) =>
      prev.map((it) => it.key === itemKey ? { ...it, deleted: !checked } : it),
    );
  }, []);

  // ──── セクション内子行（チェックボックスでON/OFF、OFF行はグレーアウト）
  const renderChildRow = (row: { label: string; prefix?: string; uri?: string; itemKey?: string }, idx: number, sectionKey: SectionKey) => {
    const itemOn = row.itemKey
      ? items.find((it) => it.key === row.itemKey)?.deleted === false
      : true;
    const isGlobalRow = sectionKey === 'global';
    const isOff = !isGlobalRow && !itemOn;

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
          cursor: isGlobalRow ? 'default' : 'pointer',
        }}
        onClick={() => {
          if (!isGlobalRow && row.itemKey) handleItemToggle(row.itemKey, !itemOn);
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
        {/* チェックボックス（グローバル行には表示しない・右端に配置） */}
        {!isGlobalRow && row.itemKey && (
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
      <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>
        スイッチをON/OFFで各名前空間の適用状態を個別に切り替えられます。
      </Text>

      {/* 縦並びアコーディオン */}
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sections.map((section) => {
          const isOpen = expanded[section.id] ?? true;
          return (
            <div key={section.id}>
              {renderSectionHeader(section)}
              {isOpen && (
                <div style={{ border: '1px solid #e8e8e8', borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'hidden' }}>
                  {section.childRows.map((row, idx) =>
                    renderChildRow(row, idx, section.sectionKey)
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12, textAlign: 'right' }}>
        ON: {onCount} 件 / OFF: {offCount} 件
      </Text>
    </Modal>
  );
};

export default NamespaceMaimlEditor;
