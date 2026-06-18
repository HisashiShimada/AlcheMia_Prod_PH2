'use client';

import React, { useState } from 'react';
import { Modal, Button, Space, Select, Upload, Alert, Typography, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

const { Dragger } = Upload;
const { Text } = Typography;

/**
 * UncertaintyImportModalのProps型定義
 */
interface UncertaintyImportModalProps {
  open: boolean;
  onClose: () => void;
}

type ImportFormat = 'CSV' | 'JSON' | 'XML';

/**
 * 不確かさ基準インポートモーダルコンポーネント
 */
export default function UncertaintyImportModal({
  open,
  onClose,
}: UncertaintyImportModalProps) {
  const [importFormat, setImportFormat] = useState<ImportFormat>('CSV');
  const [targetScope, setTargetScope] = useState<string>('研究開発部 › 計測チーム');

  const handleImport = () => {
    message.success('インポート処理を開始します（デモ）');
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={520}
      title="不確かさ基準のインポート"
      footer={
        <Space>
          <Button onClick={onClose}>キャンセル</Button>
          <Button type="primary" onClick={handleImport}>
            インポート実行
          </Button>
        </Space>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Text style={{ fontSize: 13, color: '#555' }}>
          JIS K 0200 附属書B の標準不確かさ基準、または既存のエクスポートファイルをインポートします。
        </Text>

        {/* インポート形式 */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#444', marginBottom: 8 }}>
            インポート形式
          </div>
          <Space>
            {(['CSV', 'JSON', 'XML'] as ImportFormat[]).map((fmt) => (
              <Button
                key={fmt}
                size="small"
                type={importFormat === fmt ? 'primary' : 'default'}
                onClick={() => setImportFormat(fmt)}
              >
                {fmt}
              </Button>
            ))}
          </Space>
        </div>

        {/* ドロップエリア */}
        <Dragger
          beforeUpload={() => false}
          showUploadList={false}
          style={{ background: '#fafafa' }}
        >
          <p style={{ fontSize: 13, color: '#555', margin: 0 }}>
            クリックしてファイルを選択、またはここにドラッグ＆ドロップ
          </p>
          <p style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
            対応形式：CSV / JSON / XML（最大 10 MB）
          </p>
        </Dragger>

        <Alert
          type="warning"
          showIcon
          message="注意"
          description="インポート時に既存不確かさ基準と key が重複する場合は上書き確認ダイアログが表示されます。"
        />

        {/* 取り込み先スコープ */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#444', marginBottom: 6 }}>
            取り込み先スコープ
          </div>
          <Select
            style={{ width: '100%' }}
            value={targetScope}
            onChange={setTargetScope}
            options={[
              { value: '研究開発部 › 計測チーム', label: '研究開発部 › 計測チーム' },
              { value: '研究開発部 › 材料グループ', label: '研究開発部 › 材料グループ' },
              { value: '株式会社サンプルテック', label: '株式会社サンプルテック' },
              { value: 'Personal › 山田 太郎', label: 'Personal › 山田 太郎' },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
}
