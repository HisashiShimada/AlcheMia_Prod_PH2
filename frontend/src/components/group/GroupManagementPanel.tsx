'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { App, Button, Divider, Empty, Modal, Spin, Table, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getOrganizationGroups,
  getGroupMembers,
  updateOrganizationGroupStatus,
} from '@/services/organizationGroupApiService';
import GroupAddDialog from './GroupAddDialog';
import GroupEditDialog from './GroupEditDialog';
import type { OrganizationGroupRow, Group, GroupMember } from '@/types/group';

const { Text, Title } = Typography;

const GroupManagementPanel: React.FC<{ tabActivatedAt?: number }> = ({ tabActivatedAt }) => {
  const { t } = useLanguage();
  const { message } = App.useApp();
  const [groups, setGroups]               = useState<Group[]>([]);
  const [loading, setLoading]             = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [addDialogOpen,  setAddDialogOpen]  = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget,     setEditTarget]     = useState<Group | null>(null);
  const [statusModalOpen,       setStatusModalOpen]       = useState(false);
  const [statusModalTarget,     setStatusModalTarget]     = useState<Group | null>(null);
  const [statusModalNextActive, setStatusModalNextActive] = useState(false);
  const [statusChanging,        setStatusChanging]        = useState(false);

  const rowToGroup = useCallback((row: OrganizationGroupRow): Group => ({
    groupCd:       row.organization_group_cd,
    groupName:     row.organization_group_name,
    parentGroupCd: row.parent_group_cd,
    layer:         row.layer,
    ownerUserId:   row.chief_user_id,
    ownerName:     row.chief_user_name ?? '',
    members:       [],
    memberCount:   row.member_count ?? 0,
    isActive:      row.is_active,
    namespaceUri:  row.namespace_uri ?? null,
  }), []);

  const loadGroups = useCallback(() => {
    setLoading(true);
    getOrganizationGroups()
      .then((rows) => {
        const converted: Group[] = rows.map(rowToGroup);
        setGroups(converted);
        if (converted.length > 0) setSelectedGroup((prev) => prev ?? converted[0]);
      })
      .catch(() => { setGroups([]); message.error(t('groupManagement.fetchFailed')); })
      .finally(() => setLoading(false));
  }, [rowToGroup, t]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  // タブ切り替え時（tabActivatedAt 変化時）にグループ一覧を最新化する
  useEffect(() => {
    if (tabActivatedAt === undefined) return;
    loadGroups();
  // loadGroups は useCallback で安定しているため依存配列から除外
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabActivatedAt]);

  useEffect(() => {
    if (!selectedGroup) return;
    const groupCd = selectedGroup.groupCd;
    setMembersLoading(true);
    getGroupMembers(groupCd)
      .then((data) => {
        const members: GroupMember[] = data.map((m) => ({ userId: m.userId, userName: m.userName }));
        setSelectedGroup((prev) =>
          prev && prev.groupCd === groupCd ? { ...prev, members, memberCount: members.length } : prev);
        setGroups((prev) =>
          prev.map((g) => (g.groupCd === groupCd ? { ...g, members, memberCount: members.length } : g)));
      })
      .catch(() => message.warning(t('groupManagement.memberFetchFailed')))
      .finally(() => setMembersLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup?.groupCd]);

  const refreshGroupDetail = useCallback(async (groupCd: string) => {
    setLoading(true); setMembersLoading(true);
    try {
      const rows = await getOrganizationGroups();
      const converted: Group[] = rows.map(rowToGroup);
      setGroups(converted);
      const target = converted.find((g) => g.groupCd === groupCd) ?? null;
      if (!target) { setSelectedGroup(null); return; }
      const memberData = await getGroupMembers(groupCd);
      const members: GroupMember[] = memberData.map((m) => ({ userId: m.userId, userName: m.userName }));
      const detail: Group = { ...target, members, memberCount: members.length };
      setGroups((prev) => prev.map((g) => (g.groupCd === groupCd ? detail : g)));
      setSelectedGroup(detail);
    } catch { message.error(t('groupManagement.fetchFailed')); }
    finally { setLoading(false); setMembersLoading(false); }
  }, [rowToGroup, t]);

  const handleGroupCreated = useCallback((groupCd: string, _n: string, _o: string, _on: string, _a: boolean, _p?: string | null) => {
    setAddDialogOpen(false); refreshGroupDetail(groupCd);
  }, [refreshGroupDetail]);

  const handleGroupSaved = useCallback((_m: string[], _n?: string, _o?: string, _a?: boolean) => {
    if (!editTarget) return;
    const { groupCd } = editTarget;
    setEditDialogOpen(false); setEditTarget(null); refreshGroupDetail(groupCd);
  }, [editTarget, refreshGroupDetail]);

  const openStatusModal = useCallback((group: Group, nextActive: boolean) => {
    setStatusModalTarget(group); setStatusModalNextActive(nextActive); setStatusModalOpen(true);
  }, []);

  const handleStatusChange = useCallback(async () => {
    if (!statusModalTarget) return;
    setStatusChanging(true);
    const { groupCd, groupName } = statusModalTarget;
    const nextActive = statusModalNextActive;
    try {
      await updateOrganizationGroupStatus(groupCd, nextActive);
      message.success(nextActive
        ? t('groupManagement.activateSuccess', { name: groupName })
        : t('groupManagement.deactivateSuccess', { name: groupName }));
      setStatusModalOpen(false); setStatusModalTarget(null);
      await refreshGroupDetail(groupCd);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      if (detail) message.error(t('groupManagement.statusChangeFailed', { detail }));
      else        message.error(t('groupManagement.statusChangeError'));
    } finally { setStatusChanging(false); }
  }, [statusModalTarget, statusModalNextActive, refreshGroupDetail, t]);

  const memberColumns = [{
    title: t('groupManagement.colUserName'), dataIndex: 'userName', key: 'userName',
    render: (name: string) => (
      <span><UserOutlined style={{ marginRight: 6, color: '#8c8c8c' }} />{name}</span>
    ),
  }];

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', width: '100%' }}>
      {/* ── 左ペイン: グループ一覧 ── */}
      <div style={{ width: '30%', minWidth: 280, maxWidth: 420, flexShrink: 0,
        borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text strong style={{ fontSize: 14 }}>{t('groupManagement.groupListTitle')}</Text>
          <Button size="small" type="primary" icon={<PlusOutlined />}
            onClick={() => setAddDialogOpen(true)}>
            {t('groupManagement.createGroupBtn')}
          </Button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <Spin size="small" />
            </div>
          ) : groups.length === 0 ? (
            <div style={{ padding: '24px 16px', color: '#8c8c8c', fontSize: 13, textAlign: 'center' }}>
              {t('groupManagement.noGroups')}
            </div>
          ) : (
            groups.map((group) => {
              const isSelected = selectedGroup?.groupCd === group.groupCd;
              const isActive   = group.isActive !== false;
              return (
                <div key={group.groupCd}
                  style={{ padding: '8px 12px', cursor: 'pointer',
                    backgroundColor: isSelected ? '#e6f4ff' : 'transparent',
                    borderLeft: isSelected ? '3px solid #1677ff' : '3px solid transparent',
                    transition: 'background 0.15s', opacity: isActive ? 1 : 0.55 }}
                  onClick={() => setSelectedGroup(group)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%',
                      backgroundColor: isActive ? '#52c41a' : '#d9d9d9', flexShrink: 0 }} />
                    <Text strong={isSelected} style={{ fontSize: 13, flex: 1, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {group.groupName}
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 14 }}>
                    {t('groupManagement.memberCount', { count: String(group.memberCount) })}
                  </Text>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 右ペイン: グループ詳細 ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selectedGroup ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%',
            overflow: 'hidden', padding: '20px 24px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <Title level={5} style={{ margin: 0 }}>{selectedGroup.groupName}</Title>
              {selectedGroup.isActive === false && (
                <Tag color="default">{t('groupManagement.inactiveLabel')}</Tag>
              )}
              <Button size="small" icon={<EditOutlined />}
                onClick={() => { setEditTarget(selectedGroup); setEditDialogOpen(true); }}>
                {t('groupManagement.editBtn')}
              </Button>
              {selectedGroup.isActive !== false ? (
                <Button size="small" danger onClick={() => openStatusModal(selectedGroup, false)}>
                  {t('groupManagement.deactivateBtn')}
                </Button>
              ) : (
                <Button size="small" style={{ color: '#52c41a', borderColor: '#52c41a' }}
                  onClick={() => openStatusModal(selectedGroup, true)}>
                  {t('groupManagement.activateBtn')}
                </Button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 8, marginBottom: 16 }}>
              <Text type="secondary">{t('groupManagement.groupCdLabel')}</Text>
              <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{selectedGroup.groupCd}</Text>
              <Text type="secondary">{t('groupManagement.chiefLabel')}</Text>
              <Text>{selectedGroup.ownerName || t('groupManagement.chiefNotSet')}</Text>
              {selectedGroup.parentGroupCd && (
                <>
                  <Text type="secondary">{t('groupManagement.parentGroupLabel')}</Text>
                  <Text>
                    {groups.find((g) => g.groupCd === selectedGroup.parentGroupCd)?.groupName
                      ?? selectedGroup.parentGroupCd}
                  </Text>
                </>
              )}
              {selectedGroup.namespaceUri && (
                <>
                  <Text type="secondary">{t('groupManagement.namespaceUriLabel')}</Text>
                  <Text style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
                    {selectedGroup.namespaceUri}
                  </Text>
                </>
              )}
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ marginBottom: 8 }}>
              <Text strong>
                {t('groupManagement.membersLabel')}
                <Text type="secondary" style={{ fontWeight: 400, marginLeft: 6 }}>
                  {t('groupManagement.membersCount', { count: String(selectedGroup.members.length) })}
                </Text>
              </Text>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {membersLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                  <Spin size="small" />
                </div>
              ) : (
                <Table<GroupMember>
                  size="small"
                  dataSource={selectedGroup.members}
                  columns={memberColumns}
                  rowKey="userId"
                  pagination={false}
                  locale={{ emptyText: t('groupManagement.noMembers') }}
                />
              )}
            </div>
          </div>
        ) : (
          <Empty description={t('groupManagement.selectPrompt')} style={{ marginTop: 80 }} />
        )}
      </div>

      {/* ── グループ作成ダイアログ ── */}
      <GroupAddDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onCreated={handleGroupCreated}
      />

      {/* ── グループ編集ダイアログ ── */}
      {editTarget && (
        <GroupEditDialog
          open={editDialogOpen}
          groupLabel={editTarget.groupName}
          groupCd={editTarget.groupCd}
          ownerUserId={editTarget.ownerUserId}
          isActive={editTarget.isActive !== false}
          onClose={() => { setEditDialogOpen(false); setEditTarget(null); }}
          onSaved={handleGroupSaved}
        />
      )}

      {/* ── アクティブ状態変更確認モーダル ── */}
      <Modal
        open={statusModalOpen}
        title={statusModalNextActive
          ? t('groupManagement.activateConfirmTitle', { name: statusModalTarget?.groupName ?? '' })
          : t('groupManagement.deactivateConfirmTitle', { name: statusModalTarget?.groupName ?? '' })}
        okText={statusModalNextActive
          ? t('groupManagement.activateOk')
          : t('groupManagement.deactivateOk')}
        cancelText={t('groupManagement.statusChangeCancel')}
        okButtonProps={{ danger: !statusModalNextActive, loading: statusChanging }}
        onOk={handleStatusChange}
        onCancel={() => {
          if (statusChanging) return;
          setStatusModalOpen(false); setStatusModalTarget(null);
        }}
        maskClosable={!statusChanging}
      >
        <p>
          {statusModalNextActive
            ? t('groupManagement.activateConfirmDesc')
            : t('groupManagement.deactivateConfirmDesc')}
        </p>
      </Modal>
    </div>
  );
};

export default GroupManagementPanel;

