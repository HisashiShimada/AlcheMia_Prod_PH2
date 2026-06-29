'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button, Input, Modal, Select, Tag, Typography, Space, Divider, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import membersMockRaw from '../../../mock/namespace/department-unit-members.json';
import { generateNamespaceUri } from '../../utils/namespaceUriGenerator';

const { Text } = Typography;

interface OrgUser {
  userId: string;
  userName: string;
  departmentUnitId: string | null;
}

interface TeamAddDialogProps {
  open: boolean;
  parentTeamLabel: string; // 親ノードのラベル（追加先表示用）
  parentDepartmentCd?: string; // 親ノードの部署CD（DB保存用）
  /** ログイン組織CD（URI自動生成に使用） */
  organizationCd?: string;
  organizationId?: string; // 組織ID（authMiddleware 経由で取得できない場合の補完用）
  onClose: () => void;
  onCreated: (teamName: string, members: string[], departmentUnitId?: string) => void;
}

const TeamAddDialog: React.FC<TeamAddDialogProps> = ({
  open,
  parentTeamLabel,
  parentDepartmentCd,
  organizationCd = 'ORG',
  onClose,
  onCreated,
}) => {
  const [teamName, setTeamName]         = useState('');
  const [nsPrefix, setNsPrefix]         = useState('');
  const [members, setMembers]           = useState<OrgUser[]>([]);
  const [addTarget, setAddTarget]       = useState<string | undefined>(undefined);
  const [loading, setLoading]           = useState(false);
  const [allUsers, setAllUsers]         = useState<OrgUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // ── ダイアログが開いたときにユーザー一覧を取得
  useEffect(() => {
    if (!open) return;
    setAddTarget(undefined);
    setUsersLoading(true);
    fetch('/api/v1/department-units/users', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<OrgUser[]>;
      })
      .then((data) => setAllUsers(data))
      .catch(() => {
        // APIが失敗した場合はモックデータをフォールバックとして使用
        const mockMembers = (membersMockRaw as Record<string, OrgUser[]>)['rd-materials'] ?? [];
        setAllUsers(mockMembers);
      })
      .finally(() => setUsersLoading(false));
  }, [open]);

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

  // メンバーを削除
  const handleRemoveMember = (userId: string) => {
    setMembers((prev) => prev.filter((u) => u.userId !== userId));
  };

  // チーム名・部署CDからURIをリアルタイムに自動生成
  const autoUri = useMemo(
    () => generateNamespaceUri(organizationCd, parentDepartmentCd, teamName || undefined),
    [organizationCd, parentDepartmentCd, teamName],
  );

  const handleCreate = async () => {
    if (!teamName.trim()) return;
    setLoading(true);
    try {
      // 1. チームを DB に作成
      const res = await fetch('/api/v1/department-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          unitName:     teamName.trim(),
          departmentCd: parentDepartmentCd ?? null,
          nsPrefix:     nsPrefix.trim() || undefined,
          nsUri:        autoUri,
          layer:        1,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        message.error(`チームの作成に失敗しました: ${(err as any).error ?? res.status}`);
        return;
      }

      const created = await res.json() as { departmentUnitId: string; unitName: string };

      // 2. メンバーを設定（選択がある場合）
      if (members.length > 0) {
        const memRes = await fetch(`/api/v1/department-units/${created.departmentUnitId}/members`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userIds: members.map((m) => m.userId) }),
        });
        if (!memRes.ok) {
          message.warning('チームは作成しましたが、メンバーの設定に失敗しました');
        }
      }

      message.success(`チーム「${created.unitName}」をDBに保存しました`);
      onCreated(created.unitName, members.map((m) => m.userId), created.departmentUnitId);
      handleReset();
    } catch {
      message.error('チームの作成中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTeamName('');
    setNsPrefix('');
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
      title="チームを追加"
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
          キャンセル
        </Button>,
        <Button
          key="create"
          type="primary"
          loading={loading}
          disabled={!teamName.trim()}
          onClick={handleCreate}
        >
          作成
        </Button>,
      ]}
      width={480}
      maskClosable={false}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={16}>

        {/* 追加先 */}
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>追加先</Text>
          <div style={{ marginTop: 4 }}>
            <Tag color="blue">研究開発部</Tag>
          </div>
        </div>

        {/* チーム名 */}
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

        {/* 名前空間Prefix */}
        <div>
          <Text strong>名前空間Prefix</Text>
          <Input
            style={{ marginTop: 4 }}
            placeholder="例: materials（任意）"
            value={nsPrefix}
            onChange={(e) => setNsPrefix(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* 名前空間URI（自動生成・読み取り専用） */}
        <div>
          <span>
            <Text strong>名前空間URI</Text>
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>（自動生成）</Text>
          </span>
          <div
            style={{
              marginTop: 4,
              padding: '6px 11px',
              background: '#f5f5f5',
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: 12,
              color: autoUri ? '#333' : '#bbb',
              wordBreak: 'break-all',
            }}
          >
            {autoUri || '（チーム名を入力すると自動生成されます）'}
          </div>
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
