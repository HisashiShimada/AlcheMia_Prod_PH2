'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Divider,
  Empty,
  Modal,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getOrganizationGroups,
  getGroupMembers,
  updateOrganizationGroupStatus,
} from '@/services/organizationGroupApiService';
import TeamAddDialog from './TeamAddDialog';
import TeamEditDialog from './TeamEditDialog';
import type { OrganizationGroupRow, Team, TeamMember } from '@/types/team';

const { Text, Title } = Typography;

const TeamManagementPanel: React.FC = () => {
  const { t } = useLanguage();

  const [teams, setTeams]               = useState<Team[]>([]);
  const [loading, setLoading]           = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);

  // チーム追加ダイアログ
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // チーム編集ダイアログ
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget,     setEditTarget]     = useState<Team | null>(null);

  // アクティブ状態変更確認モーダル
  const [statusModalOpen,       setStatusModalOpen]       = useState(false);
  const [statusModalTarget,     setStatusModalTarget]     = useState<Team | null>(null);
  /** true: 有効化（アクティブ）、false: 無効化（非アクティブ） */
  const [statusModalNextActive, setStatusModalNextActive] = useState(false);
  const [statusChanging,        setStatusChanging]        = useState(false);

  // ──── OrganizationGroupRow → Team 変換ヘルパー
  const rowToTeam = useCallback((row: OrganizationGroupRow): Team => ({
    groupCd:       row.organization_group_cd,
    groupName:     row.organization_group_name,
    parentGroupCd: row.parent_group_cd,
    parentGroupName: row.parent_group_name ?? null,
    layer:         row.layer,
    ownerUserId:   row.chief_user_id,
    ownerName:     row.chief_user_name ?? '',
    members:       [],
    memberCount:   row.member_count ?? 0,
    isActive:      row.is_active,
    namespaceUri:  row.namespace_uri ?? null,
  }), []);

  // ──── チーム一覧を取得
  const loadTeams = useCallback(() => {
    setLoading(true);
    getOrganizationGroups()
      .then((rows) => {
        const converted: Team[] = rows.map(rowToTeam);
        setTeams(converted);
        if (converted.length > 0) {
          setSelectedTeam((prev) => prev ?? converted[0]);
        }
      })
      .catch(() => {
        setTeams([]);
        message.error(t('teamManagement.fetchFailed'));
      })
      .finally(() => setLoading(false));
  }, [rowToTeam, t]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // ──── 選択チームのメンバーを取得
  useEffect(() => {
    if (!selectedTeam) return;
    const groupCd = selectedTeam.groupCd;
    setMembersLoading(true);
    getGroupMembers(groupCd)
      .then((data) => {
        const members: TeamMember[] = data.map((m) => ({
          userId:   m.userId,
          userName: m.userName,
        }));
        setSelectedTeam((prev) =>
          prev && prev.groupCd === groupCd ? { ...prev, members, memberCount: members.length } : prev
        );
        setTeams((prev) =>
          prev.map((t) => (t.groupCd === groupCd ? { ...t, members, memberCount: members.length } : t))
        );
      })
      .catch(() => {
        message.warning(t('teamManagement.memberFetchFailed'));
      })
      .finally(() => setMembersLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeam?.groupCd]);

  // ──── 操作後の共通リフレッシュ: 一覧＋指定チームのメンバーを再取得して選択状態を更新
  const refreshTeamDetail = useCallback(async (groupCd: string) => {
    setLoading(true);
    setMembersLoading(true);
    try {
      // 1. グループ一覧を再取得（layer, namespaceUri, isActive, parentGroupCd 等を含む最新値）
      const rows = await getOrganizationGroups();
      const converted: Team[] = rows.map(rowToTeam);
      setTeams(converted);

      const target = converted.find((tm) => tm.groupCd === groupCd) ?? null;
      if (!target) {
        setSelectedTeam(null);
        return;
      }

      // 2. 対象チームのメンバー一覧を再取得
      const memberData = await getGroupMembers(groupCd);
      const members: TeamMember[] = memberData.map((m) => ({
        userId:   m.userId,
        userName: m.userName,
      }));
      const detail: Team = { ...target, members, memberCount: members.length };

      setTeams((prev) => prev.map((tm) => (tm.groupCd === groupCd ? detail : tm)));
      setSelectedTeam(detail);
    } catch {
      message.error(t('teamManagement.fetchFailed'));
    } finally {
      setLoading(false);
      setMembersLoading(false);
    }
  }, [rowToTeam, t]);

  // ──── チーム作成後のコールバック
  const handleTeamCreated = useCallback((
    groupCd: string,
    _groupName: string,
    _ownerUserId: string,
    _ownerName: string,
    _isActive: boolean,
    _parentGroupCd?: string | null,
  ) => {
    setAddDialogOpen(false);
    refreshTeamDetail(groupCd);
  }, [refreshTeamDetail]);

  // ──── チーム編集後のコールバック
  const handleTeamSaved = useCallback((
    _memberIds: string[],
    _newTeamName?: string,
    _newOwnerUserId?: string,
    _newIsActive?: boolean,
  ) => {
    if (!editTarget) return;
    const groupCd = editTarget.groupCd;
    setEditDialogOpen(false);
    setEditTarget(null);
    refreshTeamDetail(groupCd);
  }, [editTarget, refreshTeamDetail]);

  // ──── アクティブ状態変更確認モーダルを開く
  const openStatusModal = useCallback((team: Team, nextActive: boolean) => {
    setStatusModalTarget(team);
    setStatusModalNextActive(nextActive);
    setStatusModalOpen(true);
  }, []);

  // ──── チームアクティブ状態変更（論理削除 / 有効化）
  const handleStatusChange = useCallback(async () => {
    if (!statusModalTarget) return;
    setStatusChanging(true);
    const groupCd   = statusModalTarget.groupCd;
    const groupName = statusModalTarget.groupName;
    const nextActive = statusModalNextActive;
    try {
      await updateOrganizationGroupStatus(groupCd, nextActive);

      if (nextActive) {
        message.success(t('teamManagement.activateSuccess', { name: groupName }));
      } else {
        message.success(t('teamManagement.deactivateSuccess', { name: groupName }));
      }
      setStatusModalOpen(false);
      setStatusModalTarget(null);

      // 最新データをサーバーから再取得して一覧・詳細を更新
      await refreshTeamDetail(groupCd);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      if (detail) {
        message.error(t('teamManagement.statusChangeFailed', { detail }));
      } else {
        message.error(t('teamManagement.statusChangeError'));
      }
    } finally {
      setStatusChanging(false);
    }
  }, [statusModalTarget, statusModalNextActive, refreshTeamDetail, t]);

  // メンバーテーブルの列定義
  const memberColumns = [
    {
      title: t('teamManagement.colUserName'),
      dataIndex: 'userName',
      key: 'userName',
      render: (name: string) => (
        <span>
          <UserOutlined style={{ marginRight: 6, color: '#8c8c8c' }} />
          {name}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', width: '100%' }}>

      {/* ── 左ペイン: グループ一覧 ── */}
      <div
        style={{
          width: '30%',
          minWidth: 280,
          maxWidth: 420,
          flexShrink: 0,
          borderRight: '1px solid #f0f0f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 見出し＋グループ作成ボタン */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text strong style={{ fontSize: 14 }}>
            {t('teamManagement.groupListTitle')}
          </Text>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddDialogOpen(true)}
          >
            {t('teamManagement.createGroupBtn')}
          </Button>
        </div>

        {/* グループリスト */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <Spin size="small" />
            </div>
          ) : teams.length === 0 ? (
            <div style={{ padding: '24px 16px', color: '#8c8c8c', fontSize: 13, textAlign: 'center' }}>
              {t('teamManagement.noGroups')}
            </div>
          ) : (
            teams.map((team) => {
              const isSelected = selectedTeam?.groupCd === team.groupCd;
              const isActive   = team.isActive !== false;
              return (
                <div
                  key={team.groupCd}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#e6f4ff' : 'transparent',
                    borderLeft: isSelected ? '3px solid #1677ff' : '3px solid transparent',
                    transition: 'background 0.15s',
                    opacity: isActive ? 1 : 0.55,
                  }}
                  onClick={() => setSelectedTeam(team)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/* ステータスドット */}
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: isActive ? '#52c41a' : '#d9d9d9',
                        flexShrink: 0,
                      }}
                    />
                    <Text
                      strong={isSelected}
                      style={{
                        fontSize: 13,
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {team.groupName}
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 14 }}>
                    {t('teamManagement.memberCount', { count: String(team.memberCount) })}
                  </Text>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 右ペイン: グループ詳細 ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selectedTeam ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
              padding: '20px 24px',
              width: '100%',
            }}
          >
            {/* グループ名 ＋ ステータスバッジ ＋ 編集ボタン ＋ アクティブ/非アクティブ切替ボタン */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
                flexWrap: 'wrap',
              }}
            >
              <Title level={5} style={{ margin: 0 }}>
                {selectedTeam.groupName}
              </Title>

              {/* 非アクティブバッジ */}
              {selectedTeam.isActive === false && (
                <Tag color="default">
                  {t('teamManagement.inactiveLabel')}
                </Tag>
              )}

              {/* 編集ボタン */}
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditTarget(selectedTeam);
                  setEditDialogOpen(true);
                }}
              >
                {t('teamManagement.editBtn')}
              </Button>

              {/* アクティブ/非アクティブ切り替えボタン（右ペインに配置） */}
              {selectedTeam.isActive !== false ? (
                <Button
                  size="small"
                  danger
                  onClick={() => openStatusModal(selectedTeam, false)}
                >
                  {t('teamManagement.deactivateBtn')}
                </Button>
              ) : (
                <Button
                  size="small"
                  style={{ color: '#52c41a', borderColor: '#52c41a' }}
                  onClick={() => openStatusModal(selectedTeam, true)}
                >
                  {t('teamManagement.activateBtn')}
                </Button>
              )}
            </div>

            {/* グループ情報 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                rowGap: 8,
                marginBottom: 16,
              }}
            >
              <Text type="secondary">{t('teamManagement.groupCdLabel')}</Text>
              <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {selectedTeam.groupCd}
              </Text>

              <Text type="secondary">{t('teamManagement.chiefLabel')}</Text>
              <Text>
                {selectedTeam.ownerName || selectedTeam.ownerUserId || t('teamManagement.chiefNotSet')}
              </Text>

              {selectedTeam.parentGroupCd && (
                <>
                  <Text type="secondary">{t('teamManagement.parentGroupLabel')}</Text>
                  <Text style={{ fontSize: 13 }}>
                    {selectedTeam.parentGroupName || selectedTeam.parentGroupCd}
                  </Text>
                </>
              )}

              {selectedTeam.namespaceUri && (
                <>
                  <Text type="secondary">{t('teamManagement.namespaceUriLabel')}</Text>
                  <Text style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
                    {selectedTeam.namespaceUri}
                  </Text>
                </>
              )}
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* メンバー一覧 */}
            <div style={{ marginBottom: 8 }}>
              <Text strong>
                {t('teamManagement.membersLabel')}
                <Text type="secondary" style={{ fontWeight: 400, marginLeft: 6 }}>
                  {t('teamManagement.membersCount', { count: String(selectedTeam.members.length) })}
                </Text>
              </Text>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
              {membersLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                  <Spin size="small" />
                </div>
              ) : (
                <Table<TeamMember>
                  size="small"
                  dataSource={selectedTeam.members}
                  columns={memberColumns}
                  rowKey="userId"
                  pagination={false}
                  locale={{ emptyText: t('teamManagement.noMembers') }}
                />
              )}
            </div>
          </div>
        ) : (
          <Empty
            description={t('teamManagement.selectPrompt')}
            style={{ marginTop: 80 }}
          />
        )}
      </div>

      {/* ── グループ作成ダイアログ ── */}
      <TeamAddDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onCreated={handleTeamCreated}
      />

      {/* ── グループ編集ダイアログ ── */}
      {editTarget && (
        <TeamEditDialog
          open={editDialogOpen}
          teamLabel={editTarget.groupName}
          teamGroupCd={editTarget.groupCd}
          teamOwnerUserId={editTarget.ownerUserId}
          teamIsActive={editTarget.isActive !== false}
          onClose={() => {
            setEditDialogOpen(false);
            setEditTarget(null);
          }}
          onSaved={handleTeamSaved}
        />
      )}

      {/* ── アクティブ状態変更確認モーダル ── */}
      <Modal
        open={statusModalOpen}
        title={
          statusModalNextActive
            ? t('teamManagement.activateConfirmTitle', { name: statusModalTarget?.groupName ?? '' })
            : t('teamManagement.deactivateConfirmTitle', { name: statusModalTarget?.groupName ?? '' })
        }
        okText={statusModalNextActive ? t('teamManagement.activateOk') : t('teamManagement.deactivateOk')}
        cancelText={t('teamManagement.statusChangeCancel')}
        okButtonProps={{ danger: !statusModalNextActive, loading: statusChanging }}
        onOk={handleStatusChange}
        onCancel={() => {
          if (statusChanging) return;
          setStatusModalOpen(false);
          setStatusModalTarget(null);
        }}
        maskClosable={!statusChanging}
      >
        <p>
          {statusModalNextActive
            ? t('teamManagement.activateConfirmDesc')
            : t('teamManagement.deactivateConfirmDesc')}
        </p>
      </Modal>
    </div>
  );
};

export default TeamManagementPanel;
