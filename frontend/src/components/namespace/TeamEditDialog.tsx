'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Modal, Select, Tag, Typography, Space, Divider, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import membersMockRaw from '../../../mock/namespace/department-unit-members.json';
import type { OrgUser, TeamEditDialogProps } from '@/types/namespace';

const { Text } = Typography;

const TeamEditDialog: React.FC<TeamEditDialogProps> = ({
  open,
  teamLabel,
  teamUnitId,
  onClose,
  onSaved,
}) => {
  const [teamName, setTeamName]           = useState('');
  const [members, setMembers]             = useState<OrgUser[]>([]);
  const [addTarget, setAddTarget]         = useState<string | undefined>(undefined);
  const [loading, setLoading]             = useState(false);
  const [allUsers, setAllUsers]           = useState<OrgUser[]>([]);
  const [usersLoading, setUsersLoading]   = useState(false);

  // ── ダイアログが開いたとき: ユーザー一覧 + 既存メンバーを取得
  useEffect(() => {
    if (!open) return;

    setTeamName(teamLabel);
    setAddTarget(undefined);

    // 全ユーザー一覧を取得
    setUsersLoading(true);
    fetch('/api/v1/department-units/users', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<OrgUser[]>;
      })
      .then((data) => setAllUsers(data))
      .catch(() => setAllUsers([]))
      .finally(() => setUsersLoading(false));

    // 既存メンバーを取得（teamUnitId がある場合のみ）
    if (teamUnitId) {
      fetch(`/api/v1/department-units/${teamUnitId}/members`, { credentials: 'include' })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<OrgUser[]>;
        })
        .then((data) => setMembers(data))
        .catch(() => {
          // APIが失敗した場合はモックデータをフォールバックとして使用
          const mockMembers = (membersMockRaw as Record<string, OrgUser[]>)[teamUnitId] ?? [];
          setMembers(mockMembers);
          // モックメンバーを allUsers に補完
          if (mockMembers.length > 0) {
            setAllUsers((prev) => {
              const existing = new Set(prev.map((u) => u.userId));
              const additions = mockMembers.filter((u) => !existing.has(u.userId));
              return additions.length > 0 ? [...prev, ...additions] : prev;
            });
          }
        });
    } else {
      setMembers([]);
    }
  }, [open, teamUnitId, teamLabel]);

  // メンバーを削除
  const handleRemoveMember = (userId: string) => {
    setMembers((prev) => prev.filter((u) => u.userId !== userId));
  };

  // メンバーを追加
  const handleAddMember = (userId: string) => {
    if (!userId) return;
    const user = allUsers.find((u) => u.userId === userId);
    if (!user) return;
    if (members.some((m) => m.userId === userId)) {
      message.warning('このメンバーは既に追加されています');
      return;
    }
    setMembers((prev) => [...prev, user]);
    setAddTarget(undefined);
  };

  const handleSave = async () => {
    if (!teamName.trim()) {
      message.error('チーム名を入力してください');
      return;
    }

    if (!teamUnitId) {
      message.warning('チームIDが未設定のため、DBへの保存をスキップしました');
      onSaved(members.map((m) => m.userId), teamName.trim());
      onClose();
      return;
    }

    setLoading(true);
    try {
      // 1. チーム名を更新
      if (teamName.trim() !== teamLabel) {
        const nameRes = await fetch(`/api/v1/department-units/${teamUnitId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ unitName: teamName.trim() }),
        });
        if (!nameRes.ok) {
          const err = await nameRes.json().catch(() => ({}));
          message.error(`チーム名の更新に失敗しました: ${(err as any).error ?? nameRes.status}`);
          return;
        }
      }

      // 2. メンバーを更新
      const memRes = await fetch(`/api/v1/department-units/${teamUnitId}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userIds: members.map((m) => m.userId) }),
      });

      if (!memRes.ok) {
        const err = await memRes.json().catch(() => ({}));
        message.error(`メンバーの更新に失敗しました: ${(err as any).error ?? memRes.status}`);
        return;
      }

      message.success(`「${teamName.trim()}」を保存しました（メンバー: ${members.length}名）`);
      onSaved(members.map((m) => m.userId), teamName.trim());
      onClose();
    } catch {
      message.error('保存中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 追加候補（既に登録済みのメンバーは除外）
  const memberIds = new Set(members.map((m) => m.userId));
  const addOptions = allUsers
    .filter((u) => !memberIds.has(u.userId))
    .map((u) => ({ value: u.userId, label: u.userName }));

  return (
    <Modal
      open={open}
      title="チームを編集"
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={loading}>
          キャンセル
        </Button>,
        <Button key="save" type="primary" loading={loading} onClick={handleSave}>
          保存
        </Button>,
      ]}
      width={480}
      maskClosable={false}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={16}>

        {/* ── チーム名（編集可能） ── */}
        <div>
          <Text strong>
            チーム名 <Text type="danger">*</Text>
          </Text>
          <Input
            style={{ marginTop: 4 }}
            placeholder="チーム名を入力..."
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            disabled={loading}
          />
        </div>

        <Divider style={{ margin: '0' }} />

        {/* ── 現在のメンバー ── */}
        <div>
          <Text strong>現在のメンバー</Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            （{members.length}名）
          </Text>
          <div
            style={{
              marginTop: 8,
              minHeight: 40,
              padding: '8px 10px',
              background: '#fafafa',
              border: '1px solid #f0f0f0',
              borderRadius: 6,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            {members.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>メンバーがいません</Text>
            ) : (
              members.map((m) => (
                <Tag
                  key={m.userId}
                  icon={<UserOutlined />}
                  closable
                  onClose={() => handleRemoveMember(m.userId)}
                  style={{ fontSize: 13, padding: '2px 8px', margin: 0 }}
                >
                  {m.userName}
                </Tag>
              ))
            )}
          </div>
          <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
            × でメンバーを削除できます
          </Text>
        </div>

        <Divider style={{ margin: '0' }} />

        {/* ── メンバーを追加 ── */}
        <div>
          <Text strong>メンバーを追加</Text>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Select
              showSearch
              allowClear
              loading={usersLoading}
              placeholder={usersLoading ? '読み込み中...' : '名前で検索して選択...'}
              value={addTarget}
              onChange={(val) => setAddTarget(val)}
              options={addOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ flex: 1 }}
              notFoundContent={usersLoading ? '読み込み中...' : '候補が見つかりません'}
              disabled={loading}
            />
            <Button
              type="primary"
              disabled={!addTarget || loading}
              onClick={() => addTarget && handleAddMember(addTarget)}
            >
              追加
            </Button>
          </div>
        </div>

      </Space>
    </Modal>
  );
};

export default TeamEditDialog;
