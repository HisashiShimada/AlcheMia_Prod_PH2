'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Modal, Select, Tag, Typography, Space, message } from 'antd';

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
  organizationId?: string; // 組織ID（authMiddleware 経由で取得できない場合の補完用）
  onClose: () => void;
  onCreated: (teamName: string, members: string[], departmentUnitId?: string) => void;
}

const TeamAddDialog: React.FC<TeamAddDialogProps> = ({
  open,
  parentTeamLabel,
  parentDepartmentCd,
  onClose,
  onCreated,
}) => {
  const [teamName, setTeamName]   = useState('');
  const [members, setMembers]     = useState<string[]>([]);
  const [loading, setLoading]     = useState(false);
  const [userOptions, setUserOptions] = useState<{ value: string; label: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // ── ダイアログが開いたときにユーザー一覧を取得
  useEffect(() => {
    if (!open) return;
    setUsersLoading(true);
    fetch('/api/v1/department-units/users', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<OrgUser[]>;
      })
      .then((data) => {
        setUserOptions(data.map((u) => ({ value: u.userId, label: u.userName })));
      })
      .catch(() => {
        // 未認証などでAPIが失敗した場合は空リストのまま
        setUserOptions([]);
      })
      .finally(() => setUsersLoading(false));
  }, [open]);

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
          body: JSON.stringify({ userIds: members }),
        });
        if (!memRes.ok) {
          message.warning('チームは作成しましたが、メンバーの設定に失敗しました');
        }
      }

      message.success(`チーム「${created.unitName}」をDBに保存しました`);
      onCreated(created.unitName, members, created.departmentUnitId);
      handleReset();
    } catch {
      message.error('チームの作成中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTeamName('');
    setMembers([]);
  };

  const handleCancel = () => {
    handleReset();
    onClose();
  };

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
            <Tag color="blue">{parentTeamLabel}</Tag>
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

        {/* メンバー（検索付きプルダウン） */}
        <div>
          <Text strong>メンバー（任意）</Text>
          <Select
            mode="multiple"
            showSearch
            allowClear
            loading={usersLoading}
            placeholder={usersLoading ? '読み込み中...' : '名前で検索して選択...'}
            value={members}
            onChange={(vals) => setMembers(vals)}
            options={userOptions}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            style={{ width: '100%', marginTop: 4 }}
            notFoundContent="候補が見つかりません"
            disabled={loading}
          />
          <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
            メンバーはあとから「編集」で追加・変更できます
          </Text>
        </div>
      </Space>
    </Modal>
  );
};

export default TeamAddDialog;
