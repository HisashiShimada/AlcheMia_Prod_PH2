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
import type { OrgUser, TeamEditDialogProps } from '@/types/team';

const { Text } = Typography;

const TeamEditDialog: React.FC<TeamEditDialogProps> = ({
  open,
  teamLabel,
  teamGroupCd,
  teamOwnerUserId,
  teamIsActive = true,
  onClose,
  onSaved,
}) => {
  const { t } = useLanguage();

  const [teamName, setTeamName]           = useState('');
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

    setTeamName(teamLabel);
    setIsActive(teamIsActive);
    setAddTarget(undefined);
    setOwnerUserId(teamOwnerUserId);

    // 全ユーザー一覧を取得
    setUsersLoading(true);
    getOrgUsersForGroups()
      .then((users) => setAllUsers(users))
      .catch(() => setAllUsers([]))
      .finally(() => setUsersLoading(false));

    // 既存メンバーを取得（teamGroupCd がある場合のみ）
    if (teamGroupCd) {
      getGroupMembers(teamGroupCd)
        .then((data) => setMembers(data))
        .catch(() => setMembers([]));
    } else {
      setMembers([]);
    }
  }, [open, teamGroupCd, teamLabel, teamOwnerUserId, teamIsActive]);

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
      message.warning(t('teamEditDialog.addMemberDuplicate'));
      return;
    }
    setMembers((prev) => [...prev, user]);
    setAddTarget(undefined);
  };

  const handleSave = async () => {
    if (!teamName.trim()) {
      message.error(t('teamEditDialog.groupNameRequired'));
      return;
    }

    if (!teamGroupCd) {
      message.warning(t('teamEditDialog.noGroupCd'));
      onSaved(members.map((m) => m.userId), teamName.trim(), ownerUserId, isActive);
      onClose();
      return;
    }

    setLoading(true);
    try {
      // 1. グループ名を更新（変更があった場合のみ）
      if (teamName.trim() !== teamLabel) {
        await updateOrganizationGroup(teamGroupCd, {
          organization_group_name: teamName.trim(),
        });
      }

      // 2. メンバーを更新
      await updateGroupMembers(teamGroupCd, members.map((m) => m.userId));

      // 3. 代表者を更新（変更があった場合のみ）
      if (ownerUserId && ownerUserId !== teamOwnerUserId) {
        await updateGroupChief(teamGroupCd, ownerUserId);
      }

      // 4. アクティブ状態を更新（変更があった場合のみ）
      if (isActive !== teamIsActive) {
        await updateOrganizationGroupStatus(teamGroupCd, isActive);
      }

      message.success(
        t('teamEditDialog.saveSuccess', {
          name: teamName.trim(),
          count: String(members.length),
        })
      );
      onSaved(members.map((m) => m.userId), teamName.trim(), ownerUserId, isActive);
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      if (detail) {
        message.error(t('teamEditDialog.saveFailed', { detail }));
      } else {
        message.error(t('teamEditDialog.saveError'));
      }
    } finally {
      setLoading(false);
    }
  };

  // 追加候補（既に登録済みのメンバーは除外）
  const memberIds  = new Set(members.map((m) => m.userId));
  const addOptions = allUsers
    .filter((u) => !memberIds.has(u.userId))
    .map((u) => ({ value: u.userId, label: u.userName }));

  // 代表者選択肢（現在のメンバー一覧から生成）
  const ownerOptions = members.map((m) => ({ value: m.userId, label: m.userName }));

  return (
    <Modal
      open={open}
      title={t('teamEditDialog.title')}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={loading}>
          {t('teamEditDialog.cancelBtn')}
        </Button>,
        <Button key="save" type="primary" loading={loading} onClick={handleSave}>
          {t('teamEditDialog.saveBtn')}
        </Button>,
      ]}
      width={480}
      maskClosable={false}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={16}>

        {/* グループ名（編集可能） */}
        <div>
          <Text strong>
            {t('teamEditDialog.groupNameLabel')} <Text type="danger">*</Text>
          </Text>
          <Input
            style={{ marginTop: 4 }}
            placeholder={t('teamEditDialog.groupNamePlaceholder')}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* アクティブ判定 */}
        <div>
          <Text strong>{t('teamEditDialog.isActiveLabel')}</Text>
          <Select
            style={{ width: '100%', marginTop: 4 }}
            value={isActive}
            onChange={(val: boolean) => setIsActive(val)}
            options={[
              { value: true,  label: t('teamEditDialog.isActiveOptionActive') },
              { value: false, label: t('teamEditDialog.isActiveOptionInactive') },
            ]}
            disabled={loading}
          />
        </div>

        <Divider style={{ margin: '0' }} />

        {/* 代表者 */}
        <div>
          <Text strong>{t('teamEditDialog.chiefLabel')}</Text>
          <Select
            style={{ width: '100%', marginTop: 4 }}
            placeholder={
              members.length === 0
                ? t('teamEditDialog.chiefPlaceholderNoMember')
                : t('teamEditDialog.chiefPlaceholder')
            }
            value={ownerUserId}
            onChange={(val) => setOwnerUserId(val)}
            options={ownerOptions}
            allowClear
            disabled={loading || members.length === 0}
            notFoundContent={t('teamEditDialog.chiefNoMembers')}
          />
          {members.length === 0 && (
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              {t('teamEditDialog.chiefHint')}
            </Text>
          )}
        </div>

        <Divider style={{ margin: '0' }} />

        {/* 現在のメンバー */}
        <div>
          <Text strong>{t('teamEditDialog.currentMembersLabel')}</Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            {t('teamEditDialog.membersCount', { count: String(members.length) })}
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
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('teamEditDialog.noMembers')}
              </Text>
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
            {t('teamEditDialog.memberRemoveHint')}
          </Text>
        </div>

        <Divider style={{ margin: '0' }} />

        {/* メンバーを追加 */}
        <div>
          <Text strong>{t('teamEditDialog.addMemberLabel')}</Text>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Select
              showSearch
              allowClear
              loading={usersLoading}
              placeholder={
                usersLoading
                  ? t('teamEditDialog.addMemberLoading')
                  : t('teamEditDialog.addMemberPlaceholder')
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
                  ? t('teamEditDialog.addMemberLoading')
                  : t('teamEditDialog.addMemberNotFound')
              }
              disabled={loading}
            />
            <Button
              type="primary"
              disabled={!addTarget || loading}
              onClick={() => addTarget && handleAddMember(addTarget)}
            >
              {t('teamEditDialog.addBtn')}
            </Button>
          </div>
        </div>

      </Space>
    </Modal>
  );
};

export default TeamEditDialog;
