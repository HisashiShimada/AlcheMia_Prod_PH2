'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Modal, Select, Tag, Typography, Space, Divider, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { OrgUser, TeamEditDialogProps } from '@/types/namespace';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

/** ユーザー一覧 API レスポンス行 */
interface OrgUserApiRow {
  user_id: string;
  user_name: string;
  email?: string;
}

/** メンバー一覧 API レスポンス行 */
interface MemberApiRow {
  user_id: string;
  user_name: string;
  email?: string;
}

const TeamEditDialog: React.FC<TeamEditDialogProps> = ({
  open,
  teamLabel,
  teamGroupCd,
  teamOwnerUserId,

  onClose,
  onSaved,
}) => {
  const { t } = useLanguage();
  const [teamName, setTeamName]           = useState('');
  const [members, setMembers]             = useState<OrgUser[]>([]);
  const [addTarget, setAddTarget]         = useState<string | undefined>(undefined);
  const [ownerUserId, setOwnerUserId]     = useState<string | undefined>(undefined);
  const [loading, setLoading]             = useState(false);
  const [allUsers, setAllUsers]           = useState<OrgUser[]>([]);
  const [usersLoading, setUsersLoading]   = useState(false);

  // ── ダイアログが開いたとき: ユーザー一覧 + 既存メンバーを取得
  useEffect(() => {
    if (!open) return;

    setTeamName(teamLabel);
    setAddTarget(undefined);
    setOwnerUserId(teamOwnerUserId);

    // 全ユーザー一覧を取得
    setUsersLoading(true);
    fetch('/api/v1/organization-groups/users', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ success: boolean; data: OrgUserApiRow[] }>;
      })
      .then(({ data }) =>
        setAllUsers(data.map((u) => ({ userId: u.user_id, userName: u.user_name, email: u.email })))
      )
      .catch(() => setAllUsers([]))
      .finally(() => setUsersLoading(false));

    // 既存メンバーを取得（teamGroupCd がある場合のみ）
    if (teamGroupCd) {
      fetch(
        `/api/v1/organization-groups/${encodeURIComponent(teamGroupCd)}/members`,
        { credentials: 'include' }
      )
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<{ success: boolean; data: MemberApiRow[] }>;
        })
        .then(({ data }) =>
          setMembers(data.map((m) => ({ userId: m.user_id, userName: m.user_name, email: m.email })))
        )
        .catch(() => setMembers([]));
    } else {
      setMembers([]);
    }
  }, [open, teamGroupCd, teamLabel, teamOwnerUserId]);


  // メンバーを削除（削除されたメンバーが代表者の場合はクリア）
  const handleRemoveMember = (userId: string) => {
    setMembers((prev) => prev.filter((u) => u.userId !== userId));
    if (ownerUserId === userId) {
      setOwnerUserId(undefined);
    }
  };

  // メンバーを追加
  const handleAddMember = (userId: string) => {
    if (!userId) return;
    const user = allUsers.find((u) => u.userId === userId);
    if (!user) return;
    if (members.some((m) => m.userId === userId)) {
      message.warning(t('teamEdit.memberDuplicate'));
      return;
    }
    setMembers((prev) => [...prev, user]);
    setAddTarget(undefined);
  };

  const handleSave = async () => {
    if (!teamName.trim()) {
      message.error(t('teamEdit.groupNameRequired'));
      return;
    }

    if (!teamGroupCd) {
      message.warning(t('teamEdit.groupCdMissing'));
      onSaved(members.map((m) => m.userId), teamName.trim(), ownerUserId);
      onClose();
      return;
    }

    setLoading(true);
    try {
      // 1. グループ名を更新（変更があった場合のみ）
      if (teamName.trim() !== teamLabel) {
        const nameRes = await fetch(
          `/api/v1/organization-groups/${encodeURIComponent(teamGroupCd)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ organization_group_name: teamName.trim() }),
          }
        );
        if (!nameRes.ok) {
          const err = await nameRes.json().catch(() => ({}));
          message.error(t('teamEdit.nameUpdateFailed', { message: (err as any).error?.message ?? nameRes.status }));
          return;
        }
      }

      // 2. メンバーを更新
      const memRes = await fetch(
        `/api/v1/organization-groups/${encodeURIComponent(teamGroupCd)}/members`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userIds: members.map((m) => m.userId) }),
        }
      );
      if (!memRes.ok) {
        const err = await memRes.json().catch(() => ({}));
        message.error(t('teamEdit.memberUpdateFailed', { message: (err as any).error?.message ?? memRes.status }));
        return;
      }

      // 3. 代表者を更新（変更があった場合のみ）
      if (ownerUserId && ownerUserId !== teamOwnerUserId) {
        const chiefRes = await fetch(
          `/api/v1/organization-groups/${encodeURIComponent(teamGroupCd)}/chief`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ chiefUserId: ownerUserId }),
          }
        );
        if (!chiefRes.ok) {
          const err = await chiefRes.json().catch(() => ({}));
          message.error(t('teamEdit.chiefUpdateFailed', { message: (err as any).error?.message ?? chiefRes.status }));
          return;
        }
      }


      message.success(t('teamEdit.saveSuccess', { name: teamName.trim(), count: members.length }));
      onSaved(members.map((m) => m.userId), teamName.trim(), ownerUserId);
      onClose();
    } catch {
      message.error(t('teamEdit.saveError'));
    } finally {
      setLoading(false);
    }
  };

  // 追加候補（既に登録済みのメンバーは除外）
  const memberIds = new Set(members.map((m) => m.userId));
  const addOptions = allUsers
    .filter((u) => !memberIds.has(u.userId))
    .map((u) => ({ value: u.userId, label: u.userName }));

  // 代表者選択肢（現在のメンバー一覧から生成）
  const ownerOptions = members.map((m) => ({ value: m.userId, label: m.userName }));

  return (
    <Modal
      open={open}
      title="グループを編集"
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
      <Space orientation="vertical" style={{ width: '100%' }} size={16}>

        {/* ── グループ名（編集可能） ── */}
        <div>
          <Text strong>
            グループ名 <Text type="danger">*</Text>
          </Text>
          <Input
            style={{ marginTop: 4 }}
            placeholder="グループ名を入力..."
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            disabled={loading}
          />
        </div>

        <Divider style={{ margin: '0' }} />

        {/* ── 代表者 ── */}
        <div>
          <Text strong>代表者</Text>
          <Select
            style={{ width: '100%', marginTop: 4 }}
            placeholder={
              members.length === 0
                ? 'メンバーを追加してから選択してください'
                : '代表者を選択...'
            }
            value={ownerUserId}
            onChange={(val) => setOwnerUserId(val)}
            options={ownerOptions}
            allowClear
            disabled={loading || members.length === 0}
            notFoundContent="メンバーがいません"
          />
          {members.length === 0 && (
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              メンバーを追加すると選択できるようになります
            </Text>
          )}
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
