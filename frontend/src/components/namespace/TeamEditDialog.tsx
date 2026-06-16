'use client';

import React, { useState, useEffect } from 'react';
import { Button, Modal, Select, Tag, Typography, Space, Divider } from 'antd';

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

interface TeamEditDialogProps {
  open: boolean;
  teamLabel: string;            // 編集対象チームのラベル
  initialMembers?: string[];    // 既存メンバー（モックデータ）
  onClose: () => void;
  onSaved: (members: string[]) => void;
}

const TeamEditDialog: React.FC<TeamEditDialogProps> = ({
  open,
  teamLabel,
  initialMembers = [],
  onClose,
  onSaved,
}) => {
  const [members, setMembers] = useState<string[]>(initialMembers);

  // ダイアログを開くたびに初期値をリセット
  useEffect(() => {
    if (open) {
      setMembers(initialMembers);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = () => {
    onSaved(members);
    onClose();
  };

  return (
    <Modal
      open={open}
      title="編集"
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          キャンセル
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
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
            プルダウンで追加・× で削除できます
          </Text>
        </div>
      </Space>
    </Modal>
  );
};

export default TeamEditDialog;
