'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Modal, Select, Tag, Typography, Space, Divider, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getOrgUsersForGroups,
  getGroupMembers,
  updateOrganizationGroup,
  updateGroupMembers,
  updateGroupChief,
  updateOrganizationGroupStatus,
} from '@/services/organizationGroupApiService';
import type { OrgUser, GroupEditDialogProps } from '@/types/group';

const { Text } = Typography;

const GroupEditDialog: React.FC<GroupEditDialogProps> = ({
  open,
  groupLabel,
  groupCd,
  ownerUserId: ownerUserIdProp,
  isActive: isActiveProp = true,
  onClose,
  onSaved,
}) => {
  const { t } = useLanguage();

  const [groupName, setGroupName]         = useState('');
  const [isActive, setIsActive]           = useState<boolean>(true);
  const [members, setMembers]             = useState<OrgUser[]>([]);
  const [addTarget, setAddTarget]         = useState<string | undefined>(undefined);
  const [ownerUserId, setOwnerUserId]     = useState<string | undefined>(undefined);
  const [loading, setLoading]             = useState(false);
  const [allUsers, setAllUsers]           = useState<OrgUser[]>([]);
  const [usersLoading, setUsersLoading]   = useState(false);

  // ── ダイアログが開いたとき: ユーザー一覧 + 既存メンバーを取得
  useEffect(() => {
    if (!open) return;

    setGroupName(groupLabel);
    setIsActive(isActiveProp);
    setAddTarget(undefined);
    setOwnerUserId(ownerUserIdProp);

    setUsersLoading(true);
    getOrgUsersForGroups()
      .then((users) => setAllUsers(users))
      .catch(() => setAllUsers([]))
      .finally(() => setUsersLoading(false));

    if (groupCd) {
      getGroupMembers(groupCd)
        .then((data) => setMembers(data))
        .catch(() => setMembers([]));
    } else {
      setMembers([]);
    }
  }, [open, groupCd, groupLabel, ownerUserIdProp, isActiveProp]);

  // メンバーを削除（削除されたメンバーが代表者の場合はクリア）
  const handleRemoveMember = (userId: string) => {
    setMembers((prev) => prev.filter((u) => u.userId !== userId));
    if (ownerUserId === userId) {
      setOwnerUserId(undefined);
    }
  };

  const handleAddMember = (userId: string) => {
    if (!userId) return;
    const user = allUsers.find((u) => u.userId === userId);
    if (!user) return;
    if (members.some((m) => m.userId === userId)) {
      message.warning(t('groupEditDialog.addMemberDuplicate'));
      return;
    }
    setMembers((prev) => [...prev, user]);
    setAddTarget(undefined);
  };

  const handleSave = async () => {
    if (!groupName.trim()) {
      message.error(t('groupEditDialog.groupNameRequired'));
      return;
    }

    if (!groupCd) {
      message.warning(t('groupEditDialog.noGroupCd'));
      onSaved(members.map((m) => m.userId), groupName.trim(), ownerUserId, isActive);
      onClose();
      return;
    }

    setLoading(true);
    try {
      // 1. グループ名を更新（変更があった場合のみ）
      if (groupName.trim() !== groupLabel) {
        await updateOrganizationGroup(groupCd, {
          organization_group_name: groupName.trim(),
        });
      }

      // 2. メンバーを更新
      await updateGroupMembers(groupCd, members.map((m) => m.userId));

      // 3. 代表者を更新（変更があった場合のみ）
      if (ownerUserId && ownerUserId !== ownerUserIdProp) {
        await updateGroupChief(groupCd, ownerUserId);
      }

      // 4. アクティブ状態を更新（変更があった場合のみ）
      if (isActive !== isActiveProp) {
        await updateOrganizationGroupStatus(groupCd, isActive);
      }

      message.success(
        t('groupEditDialog.saveSuccess', {
          name: groupName.trim(),
          count: String(members.length),
        })
      );
      onSaved(members.map((m) => m.userId), groupName.trim(), ownerUserId, isActive);
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      if (detail) {
        message.error(t('groupEditDialog.saveFailed', { detail }));
      } else {
        message.error(t('groupEditDialog.saveError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const memberIds   = new Set(members.map((m) => m.userId));
  const addOptions  = allUsers
    .filter((u) => !memberIds.has(u.userId))
    .map((u) => ({ value: u.userId, label: u.userName }));
  const ownerOptions = members.map((m) => ({ value: m.userId, label: m.userName }));

  return (
    <Modal
      open={open}
      title={t('groupEditDialog.title')}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={loading}>
          {t('groupEditDialog.cancelBtn')}
        </Button>,
        <Button key="save" type="primary" loading={loading} onClick={handleSave}>
          {t('groupEditDialog.saveBtn')}
        </Button>,
      ]}
      width={480}
      maskClosable={false}
    >
      <Space orientation="vertical" style={{ width: '100%' }} size={16}>
        {/* グループ名（編集可能） */}
        <div>
          <Text strong>{t('groupEditDialog.groupNameLabel')} <Text type="danger">*</Text></Text>
          <Input style={{ marginTop: 4 }} placeholder={t('groupEditDialog.groupNamePlaceholder')}
            value={groupName} onChange={(e) => setGroupName(e.target.value)} disabled={loading} />
        </div>
        {/* アクティブ判定 */}
        <div>
          <Text strong>{t('groupEditDialog.isActiveLabel')}</Text>
          <Select style={{ width: '100%', marginTop: 4 }} value={isActive}
            onChange={(val: boolean) => setIsActive(val)}
            options={[
              { value: true,  label: t('groupEditDialog.isActiveOptionActive') },
              { value: false, label: t('groupEditDialog.isActiveOptionInactive') },
            ]}
            disabled={loading} />
        </div>
        <Divider style={{ margin: '0' }} />
        {/* 代表者 */}
        <div>
          <Text strong>{t('groupEditDialog.chiefLabel')}</Text>
          <Select style={{ width: '100%', marginTop: 4 }}
            placeholder={members.length === 0
              ? t('groupEditDialog.chiefPlaceholderNoMember')
              : t('groupEditDialog.chiefPlaceholder')}
            value={ownerUserId}
            onChange={(val) => setOwnerUserId(val)}
            options={ownerOptions}
            allowClear
            disabled={loading || members.length === 0}
            notFoundContent={t('groupEditDialog.chiefNoMembers')}
          />
          {members.length === 0 && (
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              {t('groupEditDialog.chiefHint')}
            </Text>
          )}
        </div>
        <Divider style={{ margin: '0' }} />
        {/* 現在のメンバー */}
        <div>
          <Text strong>{t('groupEditDialog.currentMembersLabel')}</Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            {t('groupEditDialog.membersCount', { count: String(members.length) })}
          </Text>
          <div style={{ marginTop: 8, minHeight: 40, padding: '8px 10px', background: '#fafafa',
            border: '1px solid #f0f0f0', borderRadius: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {members.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('groupEditDialog.noMembers')}
              </Text>
            ) : (
              members.map((m) => (
                <Tag key={m.userId} icon={<UserOutlined />} closable
                  onClose={() => handleRemoveMember(m.userId)}
                  style={{ fontSize: 13, padding: '2px 8px', margin: 0 }}>
                  {m.userName}
                </Tag>
              ))
            )}
          </div>
          <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
            {t('groupEditDialog.memberRemoveHint')}
          </Text>
        </div>
        <Divider style={{ margin: '0' }} />
        {/* メンバーを追加 */}
        <div>
          <Text strong>{t('groupEditDialog.addMemberLabel')}</Text>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Select showSearch allowClear loading={usersLoading}
              placeholder={usersLoading
                ? t('groupEditDialog.addMemberLoading')
                : t('groupEditDialog.addMemberPlaceholder')}
              value={addTarget} onChange={(val) => setAddTarget(val)} options={addOptions}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              style={{ flex: 1 }}
              notFoundContent={usersLoading
                ? t('groupEditDialog.addMemberLoading')
                : t('groupEditDialog.addMemberNotFound')}
              disabled={loading} />
            <Button type="primary" disabled={!addTarget || loading}
              onClick={() => addTarget && handleAddMember(addTarget)}>
              {t('groupEditDialog.addBtn')}
            </Button>
          </div>
        </div>
      </Space>
    </Modal>
  );
};

export default GroupEditDialog;

