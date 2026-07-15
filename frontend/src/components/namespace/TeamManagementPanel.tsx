'use client';

import React, { useState, useEffect } from 'react';
import {
  Button,
  Divider,
  Empty,
  Spin,
  Table,
  Typography,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  UserOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import TeamAddDialog from './TeamAddDialog';
import TeamEditDialog from './TeamEditDialog';
import teamsMockRaw from '../../../mock/namespace/department-unit-members.json';
import type { Team, TeamMember } from '@/types/namespace';

const { Text, Title } = Typography;

// ──────────────────────────────────────────────
// ダミーデータ（API実装後に差し替え）
// ──────────────────────────────────────────────
const DUMMY_TEAMS: Team[] = [
  {
    departmentUnitId: 'rd-materials',
    unitName: '材料解析チーム',
    departmentName: '研究開発部',
    ownerName: '山田 太郎（自分）',
    ownerUserId: 'user-001',
    nsPrefix: 'materials',
    nsUri: 'https://example.org/ns/materials/',
    nsDisplayName: '材料科学名前空間',
    members: (teamsMockRaw as Record<string, TeamMember[]>)['rd-materials'] ?? [],
  },
  {
    departmentUnitId: 'data-proc',
    unitName: 'データ処理班',
    departmentName: '情報システム部',
    ownerName: '山田 太郎（自分）',
    ownerUserId: 'user-001',
    nsPrefix: 'dp',
    nsUri: 'https://example.org/ns/dp/',
    nsDisplayName: 'データ処理名前空間',
    members: [],
  },
];

// ──────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────

const TeamManagementPanel: React.FC = () => {
  const [teams, setTeams]               = useState<Team[]>([]);
  const [loading, setLoading]           = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // チーム追加ダイアログ
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // チーム編集ダイアログ
  const [editDialogOpen,  setEditDialogOpen]  = useState(false);
  const [editTarget,      setEditTarget]      = useState<Team | null>(null);

  // ──── チーム一覧を取得（API未実装時はダミーデータ）
  const loadTeams = () => {
    setLoading(true);
    fetch('/api/v1/department-units/my-teams', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Team[]>;
      })
      .then((data) => {
        setTeams(data);
        if (data.length > 0 && !selectedTeam) {
          setSelectedTeam(data[0]);
        }
      })
      .catch(() => {
        setTeams(DUMMY_TEAMS);
        if (DUMMY_TEAMS.length > 0) {
          setSelectedTeam((prev) => prev ?? DUMMY_TEAMS[0]);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTeams();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ──── チーム作成後のコールバック
  const handleTeamCreated = (teamName: string, memberIds: string[], unitId?: string) => {
    const newTeam: Team = {
      departmentUnitId: unitId ?? `new-${Date.now()}`,
      unitName: teamName,
      ownerName: '自分（代表者）',
      members: [],
    };
    setTeams((prev) => [...prev, newTeam]);
    setSelectedTeam(newTeam);
    setAddDialogOpen(false);
    message.success(`チーム「${teamName}」を作成しました`);
  };

  // ──── チーム編集後のコールバック
  const handleTeamSaved = (memberIds: string[], newTeamName?: string, newOwnerUserId?: string) => {
    if (!editTarget) return;

    setTeams((prev) =>
      prev.map((t) => {
        if (t.departmentUnitId !== editTarget.departmentUnitId) return t;
        const updatedName = newTeamName ?? t.unitName;
        const updatedMembers: TeamMember[] = memberIds.map((id) => {
          const existing = t.members.find((m) => m.userId === id);
          return existing ?? { userId: id, userName: id, departmentUnitId: t.departmentUnitId };
        });
        // 代表者情報を更新
        const newOwnerMember = updatedMembers.find((m) => m.userId === newOwnerUserId);
        return {
          ...t,
          unitName: updatedName,
          members: updatedMembers,
          ownerUserId: newOwnerUserId ?? t.ownerUserId,
          ownerName: newOwnerMember?.userName ?? t.ownerName,
        };
      }),
    );
    setSelectedTeam((prev) => {
      if (!prev || prev.departmentUnitId !== editTarget.departmentUnitId) return prev;
      const updatedMembers: TeamMember[] = memberIds.map((id) => {
        const existing = prev.members.find((m) => m.userId === id);
        return existing ?? { userId: id, userName: id, departmentUnitId: prev.departmentUnitId };
      });
      const newOwnerMember = updatedMembers.find((m) => m.userId === newOwnerUserId);
      return {
        ...prev,
        unitName: newTeamName ?? prev.unitName,
        members: updatedMembers,
        ownerUserId: newOwnerUserId ?? prev.ownerUserId,
        ownerName: newOwnerMember?.userName ?? prev.ownerName,
      };
    });
    setEditDialogOpen(false);
    setEditTarget(null);
  };

  // メンバーテーブルの列定義
  const memberColumns = [
    {
      title: 'ユーザー名',
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

      {/* ── 左ペイン: チーム一覧 ── */}
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
        {/* 見出し＋チーム作成ボタン */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text strong style={{ fontSize: 14 }}>チーム一覧</Text>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddDialogOpen(true)}
          >
            チームを作成
          </Button>
        </div>

        {/* チームリスト */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <Spin size="small" />
            </div>
          ) : teams.length === 0 ? (
            <div style={{ padding: '24px 16px', color: '#8c8c8c', fontSize: 13, textAlign: 'center' }}>
              チームがありません
            </div>
          ) : (
            teams.map((team) => {
              const isSelected = selectedTeam?.departmentUnitId === team.departmentUnitId;
              return (
                <div
                  key={team.departmentUnitId}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#e6f4ff' : 'transparent',
                    borderLeft: isSelected ? '3px solid #1677ff' : '3px solid transparent',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => setSelectedTeam(team)}
                >
                  <div style={{ width: '100%' }}>
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
                      {team.members.length}名
                    </Text>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 右ペイン: チーム詳細 ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selectedTeam ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '20px 24px', width: '100%' }}>
            {/* チーム名＋編集ボタン */}
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
                編集
              </Button>
            </div>

            {/* チーム情報 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                rowGap: 8,
                marginBottom: 16,
              }}
            >
              <Text type="secondary">所属先</Text>
              <Text>{selectedTeam.departmentName}</Text>

              <Text type="secondary">代表者</Text>
              <Text>{selectedTeam.ownerName}</Text>

              <Text type="secondary">名前空間URI</Text>
              <div>
                {selectedTeam.nsUri ? (
                  <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    <LinkOutlined style={{ marginRight: 4, color: '#aaa' }} />
                    {selectedTeam.nsUri}
                  </Text>
                ) : (
                  <Text type="secondary">未設定</Text>
                )}
              </div>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* メンバー一覧 */}
            <div style={{ marginBottom: 8 }}>
              <Text strong>
                メンバー
                <Text type="secondary" style={{ fontWeight: 400, marginLeft: 6 }}>
                  （{selectedTeam.members.length}名）
                </Text>
              </Text>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
              <Table<TeamMember>
                size="small"
                dataSource={selectedTeam.members}
                columns={memberColumns}
                rowKey="userId"
                pagination={false}
                locale={{ emptyText: 'メンバーがいません' }}
              />
            </div>
          </div>
        ) : (
          <Empty description="チームを選択してください" style={{ marginTop: 80 }} />
        )}
      </div>

      {/* ── チーム作成ダイアログ ── */}
      <TeamAddDialog
        open={addDialogOpen}
        parentTeamLabel="自分の部署"
        onClose={() => setAddDialogOpen(false)}
        onCreated={handleTeamCreated}
      />

      {/* ── チーム編集ダイアログ ── */}
      {editTarget && (
        <TeamEditDialog
          open={editDialogOpen}
          teamLabel={editTarget.unitName}
          teamUnitId={editTarget.departmentUnitId}
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
