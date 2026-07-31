'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Modal, Select, Tag, Typography, Space, Divider, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { OrgUser, TeamAddDialogProps } from '@/types/namespace';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

/** ユーザー一覧 API レスポンス行 */
interface OrgUserApiRow {
  user_id: string;
  user_name: string;
  email?: string;
}

/** グループ作成 API レスポンス */
interface CreateGroupApiResponse {
  success: boolean;
  data: {
    organization_group_cd: string;
    organization_group_name: string;
  };
}

const TeamAddDialog: React.FC<TeamAddDialogProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const { t } = useLanguage();
  const [groupCd, setGroupCd]           = useState('');
  const [groupName, setGroupName]       = useState('');
  const [parentGroupCd, setParentGroupCd] = useState<string | undefined>(undefined);
  const [members, setMembers]           = useState<OrgUser[]>([]);
  const [addTarget, setAddTarget]       = useState<string | undefined>(undefined);
  const [loading, setLoading]           = useState(false);
  const [allUsers, setAllUsers]         = useState<OrgUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [parentGroups, setParentGroups] = useState<{ value: string; label: string }[]>([]);

  // ── ダイアログが開いたときにユーザー一覧・既存グループ一覧を取得
  useEffect(() => {
    if (!open) return;

    // ユーザー一覧取得
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

    // 既存グループ一覧（親グループ選択用）
    fetch('/api/v1/organization-groups', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ success: boolean; data: { organization_group_cd: string; organization_group_name: string }[] }>;
      })
      .then(({ data }) =>
        setParentGroups(
          data.map((g) => ({
            value: g.organization_group_cd,
            label: `${g.organization_group_name} (${g.organization_group_cd})`,
          }))
        )
      )
      .catch(() => setParentGroups([]));
  }, [open]);

  // メンバーを追加
  const handleAddMember = (userId: string) => {
    if (!userId) return;
    const user = allUsers.find((u) => u.userId === userId);
    if (!user) return;
    if (members.some((m) => m.userId === userId)) {
      message.warning(t('teamAdd.memberDuplicate'));
      return;
    }
    setMembers((prev) => [...prev, user]);
    setAddTarget(undefined);
  };

  // メンバーを削除
  const handleRemoveMember = (userId: string) => {
    setMembers((prev) => prev.filter((u) => u.userId !== userId));
  };

  const handleCreate = async () => {
    if (!groupCd.trim()) {
      message.error(t('teamAdd.groupCdRequired'));
      return;
    }
    if (!groupName.trim()) {
      message.error(t('teamAdd.groupNameRequired'));
      return;
    }
    setLoading(true);
    try {
      // 1. グループを DB に作成
      const res = await fetch('/api/v1/organization-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          organization_group_cd:   groupCd.trim(),
          organization_group_name: groupName.trim(),
          parent_group_cd: parentGroupCd ?? null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        message.error(t('teamAdd.groupCreateFailed', { message: (err as any).error?.message ?? res.status }));
        return;
      }

      const result = await res.json() as CreateGroupApiResponse;
      const createdCd   = result.data.organization_group_cd;
      const createdName = result.data.organization_group_name;

      // 2. メンバーを設定（選択がある場合）
      if (members.length > 0) {
        const memRes = await fetch(
          `/api/v1/organization-groups/${encodeURIComponent(createdCd)}/members`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userIds: members.map((m) => m.userId) }),
          }
        );
        if (!memRes.ok) {
          message.warning(t('teamAdd.memberSetFailed'));
        }
      }

      message.success(t('teamAdd.createSuccess', { name: createdName }));
      onCreated(createdCd, createdName);
      handleReset();
    } catch {
      message.error(t('teamAdd.createError'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setGroupCd('');
    setGroupName('');
    setParentGroupCd(undefined);
    setMembers([]);
    setAddTarget(undefined);
  };

  const handleCancel = () => {
    handleReset();
    onClose();
  };

  // 追加候補（既に登録済みのメンバーは除外）
  const memberIds = new Set(members.map((m) => m.userId));
  const addOptions = allUsers
    .filter((u) => !memberIds.has(u.userId))
    .map((u) => ({ value: u.userId, label: u.userName }));

  return (
    <Modal
      open={open}
      title="グループを作成"
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
          キャンセル
        </Button>,
        <Button
          key="create"
          type="primary"
          loading={loading}
          disabled={!groupCd.trim() || !groupName.trim()}
          onClick={handleCreate}
        >
          作成
        </Button>,
      ]}
      width={480}
      maskClosable={false}
    >
      <Space orientation="vertical" style={{ width: '100%' }} size={16}>

        {/* グループCD */}
        <div>
          <Text strong>
            グループCD <Text type="danger">*</Text>
          </Text>
          <Input
            style={{ marginTop: 4 }}
            placeholder="グループCDを入力（例: grp_001）"
            value={groupCd}
            onChange={(e) => setGroupCd(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* グループ名 */}
        <div>
          <Text strong>
            グループ名 <Text type="danger">*</Text>
          </Text>
          <Input
            style={{ marginTop: 4 }}
            placeholder="グループ名を入力..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* 親グループ（任意） */}
        <div>
          <Text strong>親グループ</Text>
          <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>（任意）</Text>
          <Select
            style={{ width: '100%', marginTop: 4 }}
            placeholder="親グループを選択（省略可）"
            value={parentGroupCd}
            onChange={(val) => setParentGroupCd(val)}
            options={parentGroups}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            disabled={loading}
          />
        </div>

        <Divider style={{ margin: '0' }} />

        {/* 現在のメンバー（追加済み） */}
        <div>
          <Text strong>メンバー（任意）</Text>
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

        {/* メンバーを追加 */}
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

export default TeamAddDialog;
