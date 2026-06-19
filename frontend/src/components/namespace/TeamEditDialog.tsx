'use client';

import React, { useState, useEffect } from 'react';
import { Button, Modal, Select, Tag, Typography, Space, Divider, message } from 'antd';

const { Text } = Typography;

interface OrgUser {
  userId: string;
  userName: string;
  departmentUnitId: string | null;
}

interface TeamEditDialogProps {
  open: boolean;
  teamLabel: string;           // 編集対象チームのラベル
  teamUnitId?: string;         // 編集対象チームの department_unit_id
  onClose: () => void;
  onSaved: (members: string[]) => void;
}

const TeamEditDialog: React.FC<TeamEditDialogProps> = ({
  open,
  teamLabel,
  teamUnitId,
  onClose,
  onSaved,
}) => {
  const [members, setMembers]         = useState<string[]>([]);
  const [loading, setLoading]         = useState(false);
  const [userOptions, setUserOptions] = useState<{ value: string; label: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // ── ダイアログが開いたとき: ユーザー一覧 + 既存メンバーを取得
  useEffect(() => {
    if (!open) return;

    // 全ユーザー一覧を取得
    setUsersLoading(true);
    fetch('/api/v1/department-units/users', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<OrgUser[]>;
      })
      .then((data) => {
        setUserOptions(data.map((u) => ({ value: u.userId, label: u.userName })));
      })
      .catch(() => setUserOptions([]))
      .finally(() => setUsersLoading(false));

    // 既存メンバーを取得（teamUnitId がある場合のみ）
    if (teamUnitId) {
      fetch(`/api/v1/department-units/${teamUnitId}/members`, { credentials: 'include' })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<OrgUser[]>;
        })
        .then((data) => {
          setMembers(data.map((u) => u.userId));
        })
        .catch(() => setMembers([]));
    } else {
      setMembers([]);
    }
  }, [open, teamUnitId]);

  const handleSave = async () => {
    if (!teamUnitId) {
      // unitId が未設定の場合はフロントエンドのみ更新（モック動作）
      message.warning('チームIDが未設定のため、DBへの保存をスキップしました');
      onSaved(members);
      onClose();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/department-units/${teamUnitId}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userIds: members }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        message.error(`メンバーの更新に失敗しました: ${(err as any).error ?? res.status}`);
        return;
      }

      message.success(`「${teamLabel}」のメンバーをDBに保存しました（${members.length}名）`);
      onSaved(members);
      onClose();
    } catch {
      message.error('メンバーの更新中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="編集"
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
        {/* チーム名（読み取り専用） */}
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>チーム</Text>
          <div style={{ marginTop: 4 }}>
            <Tag color="blue" style={{ fontSize: 13, padding: '2px 10px' }}>
              {teamLabel}
            </Tag>
          </div>
        </div>

        <Divider style={{ margin: '0' }} />

        {/* メンバー（検索付きプルダウン） */}
        <div>
          <Text strong>メンバー</Text>
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
            プルダウンで追加・× で削除できます
          </Text>
        </div>
      </Space>
    </Modal>
  );
};

export default TeamEditDialog;
