'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Divider,
  Empty,
  Popconfirm,
  Spin,
  Table,
  Typography,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getOrganizationGroups,
  getGroupMembers,
  deleteOrganizationGroup,
} from '@/services/organizationGroupApiService';
import TeamAddDialog from './TeamAddDialog';
import TeamEditDialog from './TeamEditDialog';
import type { Team, TeamMember } from '@/types/team';

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

  // ──── チーム一覧を取得
  const loadTeams = useCallback(() => {
    setLoading(true);
    getOrganizationGroups()
      .then((rows) => {
        const converted: Team[] = rows.map((row) => ({
          groupCd:       row.organization_group_cd,
          unitName:      row.organization_group_name,
          parentGroupCd: row.parent_group_cd,
          layer:         row.layer,
          ownerUserId:   row.chief_user_id,
          ownerName:     '',
          members:       [],
        }));
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
  }, [t]);

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
          prev && prev.groupCd === groupCd ? { ...prev, members } : prev
        );
        setTeams((prev) =>
          prev.map((t) => (t.groupCd === groupCd ? { ...t, members } : t))
        );
      })
      .catch(() => {
        message.warning(t('teamManagement.memberFetchFailed'));
      })
      .finally(() => setMembersLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeam?.groupCd]);

  // ──── チーム作成後のコールバック
  const handleTeamCreated = useCallback((groupCd: string, groupName: string) => {
    const newTeam: Team = {
      groupCd,
      unitName:  groupName,
      ownerName: '',
      members:   [],
    };
    setTeams((prev) => [...prev, newTeam]);
    setSelectedTeam(newTeam);
    setAddDialogOpen(false);
  }, []);

  // ──── チーム編集後のコールバック
  const handleTeamSaved = useCallback((
    memberIds: string[],
    newTeamName?: string,
    newOwnerUserId?: string,
  ) => {
    if (!editTarget) return;

    setTeams((prev) =>
      prev.map((t) => {
        if (t.groupCd !== editTarget.groupCd) return t;
        const updatedName = newTeamName ?? t.unitName;
        const updatedMembers: TeamMember[] = memberIds.map((id) => {
          const existing = t.members.find((m) => m.userId === id);
          return existing ?? { userId: id, userName: id };
        });
        const newOwnerMember = updatedMembers.find((m) => m.userId === newOwnerUserId);
        return {
          ...t,
          unitName:    updatedName,
          members:     updatedMembers,
          ownerUserId: newOwnerUserId ?? t.ownerUserId,
          ownerName:   newOwnerMember?.userName ?? t.ownerName,
        };
      }),
    );
    setSelectedTeam((prev) => {
      if (!prev || prev.groupCd !== editTarget.groupCd) return prev;
      const updatedMembers: TeamMember[] = memberIds.map((id) => {
        const existing = prev.members.find((m) => m.userId === id);
        return existing ?? { userId: id, userName: id };
      });
      const newOwnerMember = updatedMembers.find((m) => m.userId === newOwnerUserId);
      return {
        ...prev,
        unitName:    newTeamName ?? prev.unitName,
        members:     updatedMembers,
        ownerUserId: newOwnerUserId ?? prev.ownerUserId,
        ownerName:   newOwnerMember?.userName ?? prev.ownerName,
      };
    });
    setEditDialogOpen(false);
    setEditTarget(null);
  }, [editTarget]);

  // ──── チーム削除
  const handleTeamDelete = useCallback(async (team: Team) => {
    try {
      await deleteOrganizationGroup(team.groupCd);
      setTeams((prev) => prev.filter((t) => t.groupCd !== team.groupCd));
      setSelectedTeam((prev) => (prev?.groupCd === team.groupCd ? null : prev));
      message.success(t('teamManagement.deleteSuccess', { name: team.unitName }));
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      if (detail) {
        message.error(t('teamManagement.deleteFailed', { detail }));
      } else {
        message.error(t('teamManagement.deleteError'));
      }
    }
  }, [t]);

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
          width: 260,
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
              return (
                <div
                  key={team.groupCd}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#e6f4ff' : 'transparent',
                    borderLeft: isSelected ? '3px solid #1677ff' : '3px solid transparent',
                    transition: 'background 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 4,
                  }}
                  onClick={() => setSelectedTeam(team)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#52c41a',
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
                        {team.unitName}
                      </Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 14 }}>
                      {t('teamManagement.memberCount', { count: String(team.members.length) })}
                    </Text>
                  </div>

                  {/* 削除ボタン */}
                  <Popconfirm
                    title={t('teamManagement.deleteConfirmTitle', { name: team.unitName })}
                    description={t('teamManagement.deleteConfirmDesc')}
                    okText={t('teamManagement.deleteOk')}
                    cancelText={t('teamManagement.deleteCancel')}
                    okButtonProps={{ danger: true }}
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      handleTeamDelete(team);
                    }}
                    onCancel={(e) => e?.stopPropagation()}
                  >
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                      style={{ flexShrink: 0 }}
                    />
                  </Popconfirm>
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
            {/* グループ名＋編集ボタン */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <Title level={5} style={{ margin: 0 }}>
                {selectedTeam.unitName}
              </Title>
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
                  <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {selectedTeam.parentGroupCd}
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
          teamLabel={editTarget.unitName}
          teamGroupCd={editTarget.groupCd}
          teamOwnerUserId={editTarget.ownerUserId}
          onClose={() => {
            setEditDialogOpen(false);
            setEditTarget(null);
          }}
          onSaved={handleTeamSaved}
        />
      )}
    </div>
  );
};

export default TeamManagementPanel;
