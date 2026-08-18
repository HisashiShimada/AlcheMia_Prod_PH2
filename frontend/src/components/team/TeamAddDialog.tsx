'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Modal, Select, Tag, Typography, Space, Divider, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getOrgUsersForGroups,
  getOrganizationGroups,
  createOrganizationGroup,
  updateGroupMembers,
} from '@/services/organizationGroupApiService';
import type { OrgUser, TeamAddDialogProps } from '@/types/team';
import type { User } from '@/types/auth';

const { Text } = Typography;

const TeamAddDialog: React.FC<TeamAddDialogProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const { t } = useLanguage();

  // ── ログインユーザー（代表者として固定表示）
  // localStorage の 'userInfo' キーに User 型オブジェクトが保存されている
  const userInfo: User | null = (() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('userInfo');
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  })();
  const chiefUserId  = userInfo?.id ?? '';

  const [groupCd, setGroupCd]             = useState('');
  const [groupName, setGroupName]         = useState('');
  const [isActive, setIsActive]           = useState<boolean>(true);
  const [parentGroupCd, setParentGroupCd] = useState<string | undefined>(undefined);
  const [members, setMembers]             = useState<OrgUser[]>([]);
  const [addTarget, setAddTarget]         = useState<string | undefined>(undefined);
  const [loading, setLoading]             = useState(false);
  const [allUsers, setAllUsers]           = useState<OrgUser[]>([]);
  const [usersLoading, setUsersLoading]   = useState(false);
  const [parentGroups, setParentGroups]   = useState<{ value: string; label: string }[]>([]);
  // ログインユーザーの表示名（代表者タグ用）
  const [chiefUserName, setChiefUserName] = useState<string>('');

  // ── ダイアログが開いたときにユーザー一覧・既存グループ一覧を取得
  useEffect(() => {
    if (!open) return;

    // ユーザー一覧取得
    setUsersLoading(true);
    getOrgUsersForGroups()
      .then((users) => {
        setAllUsers(users);
        // 代表者の表示名を設定
        const chief = users.find((u) => u.userId === chiefUserId);
        setChiefUserName(chief?.userName ?? userInfo?.displayName ?? chiefUserId);
      })
      .catch(() => {
        setAllUsers([]);
        setChiefUserName(userInfo?.displayName ?? chiefUserId);
      })
      .finally(() => setUsersLoading(false));

    // 既存グループ一覧（親グループ選択用）— 非アクティブグループは除外
    getOrganizationGroups()
      .then((groups) =>
        setParentGroups(
          groups
            .filter((g) => g.is_active !== false)
            .map((g) => ({
              value: g.organization_group_cd,
              label: `${g.organization_group_name} (${g.organization_group_cd})`,
            }))
        )
      )
      .catch(() => setParentGroups([]));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // メンバーを追加
  const handleAddMember = (userId: string) => {
    if (!userId) return;
    const user = allUsers.find((u) => u.userId === userId);
    if (!user) return;
    if (members.some((m) => m.userId === userId)) {
      message.warning(t('teamAddDialog.addMemberDuplicate'));
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
      message.error(t('teamAddDialog.groupCdRequired'));
      return;
    }
    if (!groupName.trim()) {
      message.error(t('teamAddDialog.groupNameRequired'));
      return;
    }
    setLoading(true);
    try {
      // 1. グループを DB に作成（バックエンド側で代表者を自動メンバー登録する）
      const created = await createOrganizationGroup({
        organization_group_cd:   groupCd.trim(),
        organization_group_name: groupName.trim(),
        parent_group_cd: parentGroupCd ?? null,
      });

      const createdCd   = created.organization_group_cd;
      const createdName = created.organization_group_name;

      // 2. 追加メンバーを設定（代表者は除いた追加分のみ）
      // ※ バックエンドで代表者が自動登録されるため、代表者を含めて送ってもバックエンド側で保護される
      if (members.length > 0) {
        try {
          // 代表者 chiefUserId をマージして送信（重複は Service 層で吸収される）
          const memberIds = [...new Set([...members.map((m) => m.userId), chiefUserId])].filter(Boolean);
          await updateGroupMembers(createdCd, memberIds);
        } catch {
          message.warning(t('teamAddDialog.memberSetFailed'));
        }
      }

      message.success(t('teamAddDialog.createSuccess', { name: createdName }));
      onCreated(createdCd, createdName, chiefUserId, chiefUserName, isActive, parentGroupCd ?? null);
      handleReset();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      if (detail) {
        message.error(t('teamAddDialog.createFailed', { detail }));
      } else {
        message.error(t('teamAddDialog.createError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setGroupCd('');
    setGroupName('');
    setIsActive(true);
    setParentGroupCd(undefined);
    setMembers([]);
    setAddTarget(undefined);
  };

  const handleCancel = () => {
    handleReset();
    onClose();
  };

  // 追加候補（既に登録済みのメンバー・代表者は除外）
  const memberIds  = new Set(members.map((m) => m.userId));
  const addOptions = allUsers
    .filter((u) => !memberIds.has(u.userId) && u.userId !== chiefUserId)
    .map((u) => ({ value: u.userId, label: u.userName }));

  return (
    <Modal
      open={open}
      title={t('teamAddDialog.title')}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
          {t('teamAddDialog.cancelBtn')}
        </Button>,
        <Button
          key="create"
          type="primary"
          loading={loading}
          disabled={!groupCd.trim() || !groupName.trim()}
          onClick={handleCreate}
        >
          {t('teamAddDialog.createBtn')}
        </Button>,
      ]}
      width={480}
      maskClosable={false}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={16}>

        {/* グループCD */}
        <div>
          <Text strong>
            {t('teamAddDialog.groupCdLabel')} <Text type="danger">*</Text>
          </Text>
          <Input
            style={{ marginTop: 4 }}
            placeholder={t('teamAddDialog.groupCdPlaceholder')}
            value={groupCd}
            onChange={(e) => setGroupCd(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* グループ名 */}
        <div>
          <Text strong>
            {t('teamAddDialog.groupNameLabel')} <Text type="danger">*</Text>
          </Text>
          <Input
            style={{ marginTop: 4 }}
            placeholder={t('teamAddDialog.groupNamePlaceholder')}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* 親グループ（任意） */}
        <div>
          <Text strong>{t('teamAddDialog.parentGroupLabel')}</Text>
          <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
            {t('teamAddDialog.parentGroupOptional')}
          </Text>
          <Select
            style={{ width: '100%', marginTop: 4 }}
            placeholder={t('teamAddDialog.parentGroupPlaceholder')}
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

        {/* アクティブ判定 */}
        <div>
          <Text strong>{t('teamAddDialog.isActiveLabel')}</Text>
          <Select
            style={{ width: '100%', marginTop: 4 }}
            value={isActive}
            onChange={(val: boolean) => setIsActive(val)}
            options={[
              { value: true,  label: t('teamAddDialog.isActiveOptionActive') },
              { value: false, label: t('teamAddDialog.isActiveOptionInactive') },
            ]}
            disabled={loading}
          />
        </div>

        <Divider style={{ margin: '0' }} />

        {/* 現在のメンバー（代表者固定 + 追加済み） */}
        <div>
          <Text strong>{t('teamAddDialog.membersLabel')}</Text>
          {/* 代表者 + 追加メンバー数を表示 */}
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            {t('teamAddDialog.membersCount', { count: String(members.length + 1) })}
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
            {/* 代表者タグ（削除不可・固定表示） */}
            <Tag
              icon={<LockOutlined />}
              color="blue"
              style={{ fontSize: 13, padding: '2px 8px', margin: 0 }}
            >
              {chiefUserName || chiefUserId}
            </Tag>
            {/* 追加メンバータグ */}
            {members.map((m) => (
              <Tag
                key={m.userId}
                icon={<UserOutlined />}
                closable
                onClose={() => handleRemoveMember(m.userId)}
                style={{ fontSize: 13, padding: '2px 8px', margin: 0 }}
              >
                {m.userName}
              </Tag>
            ))}
          </div>
          <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
            {t('teamAddDialog.memberRemoveHint')}
          </Text>
        </div>

        {/* メンバーを追加 */}
        <div>
          <Text strong>{t('teamAddDialog.addMemberLabel')}</Text>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Select
              showSearch
              allowClear
              loading={usersLoading}
              placeholder={
                usersLoading
                  ? t('teamAddDialog.addMemberLoading')
                  : t('teamAddDialog.addMemberPlaceholder')
              }
              value={addTarget}
              onChange={(val) => setAddTarget(val)}
              options={addOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ flex: 1 }}
              notFoundContent={
                usersLoading
                  ? t('teamAddDialog.addMemberLoading')
                  : t('teamAddDialog.addMemberNotFound')
              }
              disabled={loading}
            />
            <Button
              type="primary"
              disabled={!addTarget || loading}
              onClick={() => addTarget && handleAddMember(addTarget)}
            >
              {t('teamAddDialog.addBtn')}
            </Button>
          </div>
        </div>

      </Space>
    </Modal>
  );
};

export default TeamAddDialog;
