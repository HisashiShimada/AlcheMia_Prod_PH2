'use client';

import React, { useState, useEffect } from 'react';
import { App, Button, Input, Modal, Select, Tag, Typography, Space, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getOrgUsersForGroups,
  getOrganizationGroups,
  createOrganizationGroup,
  updateGroupMembers,
} from '@/services/organizationGroupApiService';
import type { OrgUser, GroupAddDialogProps } from '@/types/group';
import type { User } from '@/types/auth';

const { Text } = Typography;

const GroupAddDialog: React.FC<GroupAddDialogProps> = ({ open, onClose, onCreated }) => {
  const { t } = useLanguage();
  const { message } = App.useApp();

  const userInfo: User | null = (() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('userInfo');
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  })();
  const chiefUserId = userInfo?.id ?? '';

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
  const [chiefUserName, setChiefUserName] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setUsersLoading(true);
    getOrgUsersForGroups()
      .then((users) => {
        setAllUsers(users);
        const chief = users.find((u) => u.userId === chiefUserId);
        setChiefUserName(chief?.userName ?? userInfo?.displayName ?? chiefUserId);
      })
      .catch(() => {
        setAllUsers([]);
        setChiefUserName(userInfo?.displayName ?? chiefUserId);
      })
      .finally(() => setUsersLoading(false));

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

  const handleAddMember = (userId: string) => {
    if (!userId) return;
    const user = allUsers.find((u) => u.userId === userId);
    if (!user) return;
    if (members.some((m) => m.userId === userId)) {
      message.warning(t('groupAddDialog.addMemberDuplicate'));
      return;
    }
    setMembers((prev) => [...prev, user]);
    setAddTarget(undefined);
  };

  const handleRemoveMember = (userId: string) => {
    setMembers((prev) => prev.filter((u) => u.userId !== userId));
  };

  const handleReset = () => {
    setGroupCd('');
    setGroupName('');
    setIsActive(true);
    setParentGroupCd(undefined);
    setMembers([]);
    setAddTarget(undefined);
  };

  const handleCancel = () => { handleReset(); onClose(); };

  const handleCreate = async () => {
    if (!groupCd.trim()) { message.error(t('groupAddDialog.groupCdRequired')); return; }
    if (!groupName.trim()) { message.error(t('groupAddDialog.groupNameRequired')); return; }
    setLoading(true);
    try {
      const created = await createOrganizationGroup({
        organization_group_cd:   groupCd.trim(),
        organization_group_name: groupName.trim(),
        parent_group_cd: parentGroupCd ?? null,
      });
      const createdCd   = created.organization_group_cd;
      const createdName = created.organization_group_name;
      if (members.length > 0) {
        try {
          const memberIds = [...new Set([...members.map((m) => m.userId), chiefUserId])].filter(Boolean);
          await updateGroupMembers(createdCd, memberIds);
        } catch {
          message.warning(t('groupAddDialog.memberSetFailed'));
        }
      }
      message.success(t('groupAddDialog.createSuccess', { name: createdName }));
      onCreated(createdCd, createdName, chiefUserId, chiefUserName, isActive, parentGroupCd ?? null);
      handleReset();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      if (detail) { message.error(t('groupAddDialog.createFailed', { detail })); }
      else        { message.error(t('groupAddDialog.createError')); }
    } finally {
      setLoading(false);
    }
  };

  const memberIdSet = new Set(members.map((m) => m.userId));
  const addOptions  = allUsers
    .filter((u) => !memberIdSet.has(u.userId) && u.userId !== chiefUserId)
    .map((u) => ({ value: u.userId, label: u.userName }));

  return (
    <Modal
      open={open}
      title={t('groupAddDialog.title')}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
          {t('groupAddDialog.cancelBtn')}
        </Button>,
        <Button key="create" type="primary" loading={loading}
          disabled={!groupCd.trim() || !groupName.trim()} onClick={handleCreate}>
          {t('groupAddDialog.createBtn')}
        </Button>,
      ]}
      width={480}
      maskClosable={false}
    >
      <Space orientation="vertical" style={{ width: '100%' }} size={16}>
        {/* グループCD */}
        <div>
          <Text strong>{t('groupAddDialog.groupCdLabel')} <Text type="danger">*</Text></Text>
          <Input style={{ marginTop: 4 }} placeholder={t('groupAddDialog.groupCdPlaceholder')}
            value={groupCd} onChange={(e) => setGroupCd(e.target.value)} disabled={loading} />
        </div>
        {/* グループ名 */}
        <div>
          <Text strong>{t('groupAddDialog.groupNameLabel')} <Text type="danger">*</Text></Text>
          <Input style={{ marginTop: 4 }} placeholder={t('groupAddDialog.groupNamePlaceholder')}
            value={groupName} onChange={(e) => setGroupName(e.target.value)} disabled={loading} />
        </div>
        {/* 親グループ（任意） */}
        <div>
          <Text strong>{t('groupAddDialog.parentGroupLabel')}</Text>
          <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
            {t('groupAddDialog.parentGroupOptional')}
          </Text>
          <Select showSearch allowClear style={{ width: '100%', marginTop: 4 }}
            placeholder={t('groupAddDialog.parentGroupPlaceholder')}
            value={parentGroupCd} onChange={(val) => setParentGroupCd(val)}
            options={parentGroups}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            disabled={loading} />
        </div>
        {/* アクティブ判定 */}
        <div>
          <Text strong>{t('groupAddDialog.isActiveLabel')}</Text>
          <Select style={{ width: '100%', marginTop: 4 }} value={isActive}
            onChange={(val: boolean) => setIsActive(val)}
            options={[
              { value: true,  label: t('groupAddDialog.isActiveOptionActive') },
              { value: false, label: t('groupAddDialog.isActiveOptionInactive') },
            ]}
            disabled={loading} />
        </div>
        <Divider style={{ margin: '0' }} />
        {/* 現在のメンバー（代表者固定 + 追加済み） */}
        <div>
          <Text strong>{t('groupAddDialog.membersLabel')}</Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            {t('groupAddDialog.membersCount', { count: String(members.length + 1) })}
          </Text>
          <div style={{ marginTop: 8, minHeight: 40, padding: '8px 10px', background: '#fafafa',
            border: '1px solid #f0f0f0', borderRadius: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <Tag icon={<LockOutlined />} color="blue"
              style={{ fontSize: 13, padding: '2px 8px', margin: 0 }}>
              {chiefUserName || chiefUserId}
            </Tag>
            {members.map((m) => (
              <Tag key={m.userId} icon={<UserOutlined />} closable
                onClose={() => handleRemoveMember(m.userId)}
                style={{ fontSize: 13, padding: '2px 8px', margin: 0 }}>
                {m.userName}
              </Tag>
            ))}
          </div>
          <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
            {t('groupAddDialog.memberRemoveHint')}
          </Text>
        </div>
        {/* メンバーを追加 */}
        <div>
          <Text strong>{t('groupAddDialog.addMemberLabel')}</Text>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Select showSearch allowClear loading={usersLoading}
              placeholder={usersLoading
                ? t('groupAddDialog.addMemberLoading')
                : t('groupAddDialog.addMemberPlaceholder')}
              value={addTarget} onChange={(val) => setAddTarget(val)} options={addOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              style={{ flex: 1 }}
              notFoundContent={usersLoading
                ? t('groupAddDialog.addMemberLoading')
                : t('groupAddDialog.addMemberNotFound')}
              disabled={loading} />
            <Button type="primary" disabled={!addTarget || loading}
              onClick={() => addTarget && handleAddMember(addTarget)}>
              {t('groupAddDialog.addBtn')}
            </Button>
          </div>
        </div>
      </Space>
    </Modal>
  );
};

export default GroupAddDialog;

