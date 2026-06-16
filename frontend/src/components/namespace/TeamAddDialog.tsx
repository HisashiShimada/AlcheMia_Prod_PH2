'use client';

import React, { useState } from 'react';
import { Button, Input, Modal, Select, Tag, Typography, Space } from 'antd';

const { Text } = Typography;

// ──── モックユーザー候補（実際はAPIから取得）────
const MOCK_USERS = [
  { value: '山田 太郎', label: '山田 太郎' },
  { value: '鈴木 花子', label: '鈴木 花子' },
  { value: '田中 一郎', label: '田中 一郎' },
  { value: '佐藤 美咲', label: '佐藤 美咲' },
  { value: '高橋 健二', label: '高橋 健二' },
  { value: '伊藤 直樹', label: '伊藤 直樹' },
  { value: '渡辺 さくら', label: '渡辺 さくら' },
  { value: '中村 浩二', label: '中村 浩二' },
];

interface TeamAddDialogProps {
  open: boolean;
  parentTeamLabel: string; // 親ノードのラベル（追加先表示用）
  onClose: () => void;
  onCreated: (teamName: string, members: string[]) => void;
}

const TeamAddDialog: React.FC<TeamAddDialogProps> = ({
  open,
  parentTeamLabel,
  onClose,
  onCreated,
}) => {
  const [teamName, setTeamName] = useState('');
  const [members, setMembers]   = useState<string[]>([]);

  const handleCreate = () => {
    onCreated(teamName.trim(), members);
    handleReset();
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
        <Button key="cancel" onClick={handleCancel}>
          キャンセル
        </Button>,
        <Button
          key="create"
          type="primary"
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
          />
        </div>

        {/* メンバー（検索付きプルダウン） */}
        <div>
          <Text strong>メンバー（任意）</Text>
          <Select
            mode="multiple"
            showSearch
            allowClear
            placeholder="名前で検索して選択..."
            value={members}
            onChange={(vals) => setMembers(vals)}
            options={MOCK_USERS}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            style={{ width: '100%', marginTop: 4 }}
            notFoundContent="候補が見つかりません"
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
