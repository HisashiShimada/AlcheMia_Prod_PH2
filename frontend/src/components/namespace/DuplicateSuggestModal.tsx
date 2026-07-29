'use client';

import React, { useState } from 'react';
import { Modal, Radio, Space, Button } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

// ──────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────

/** 重複候補1件 */
export interface DuplicateCandidate {
  /** 名前空間プレフィックス */
  prefix: string;
  /** ローカル名（qname の localName 部分） */
  localName: string;
  /** 表示名 */
  displayName: string;
  /** 型 */
  type: string;
  /** 単位（任意） */
  unitHint?: string;
  /** 説明 */
  description: string;
  /** スコープラベル（チーム名・部署名など） */
  scopeLabel: string;
}

/** 重複がある用語1件分のデータ */
export interface DuplicateTermEntry {
  /** 元の用語の localName */
  localName: string;
  /** 候補一覧 */
  candidates: DuplicateCandidate[];
}

export interface DuplicateSuggestModalProps {
  open: boolean;
  /** 重複が検出された用語リスト */
  entries: DuplicateTermEntry[];
  /** モーダルを閉じる（キャンセル） */
  onClose: () => void;
  /**
   * 確定ボタン押下時
   * key: localName, value: 選択された候補の prefix
   */
  onConfirm: (selections: Record<string, string>) => void;
}

// ──────────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────────
const DuplicateSuggestModal: React.FC<DuplicateSuggestModalProps> = ({
  open,
  entries,
  onClose,
  onConfirm,
}) => {
  const [selections, setSelections] = useState<Record<string, string>>({});

  // entries / open が変わったときにリセット
  React.useEffect(() => {
    setSelections({});
  }, [entries, open]);

  const allSelected = entries.length > 0 && entries.every((e) => selections[e.localName] !== undefined);

  return (
    <Modal
      open={open}
      title={
        <span style={{ fontSize: 16, fontWeight: 600 }}>
          <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
          警告　共有先配下の複数階層に同一の内容が登録されています。
        </span>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#888', fontSize: 13 }}>
            {allSelected ? '選択した内容に統一されます。' : ''}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={onClose}>キャンセル</Button>
            <Button
              type="primary"
              disabled={!allSelected}
              onClick={() => onConfirm(selections)}
            >
              登録
            </Button>
          </div>
        </div>
      }
      onCancel={onClose}
      maskClosable={false}
      keyboard={false}
      width={520}
    >
      <p style={{ color: '#555', fontSize: 14, marginBottom: 20 }}>
        いずれか1つを選択してください。
      </p>

      {entries.map((entry) => {
        const currentValue = selections[entry.localName];

        return (
          <div key={entry.localName} style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 10, fontSize: 14 }}>
              <strong>analysis:{entry.localName}</strong>
              <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>共有先: 株式会社サンプルテック</span>
            </div>

            <Radio.Group
              value={currentValue}
              onChange={(e) =>
                setSelections((prev) => ({ ...prev, [entry.localName]: e.target.value }))
              }
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                {entry.candidates.map((c) => (
                  <Radio
                    key={c.prefix}
                    value={c.prefix}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      width: '100%',
                      border: '1px solid #e8e8e8',
                      borderRadius: 6,
                      padding: '10px 12px',
                      background: currentValue === c.prefix ? '#f5f5f5' : '#fff',
                      cursor: 'pointer',
                      margin: 0,
                    }}
                  >
                    <div style={{ paddingLeft: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        analysis:{c.localName}
                      </div>
                      <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>
                        説明: {c.description || '—'}　型: {c.type}　単位: {c.unitHint ?? '—'}
                      </div>
                      <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
                        共有元: {c.scopeLabel.replace(/（[^）]*）/g, '').trim()}
                      </div>
                    </div>
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </div>
        );
      })}
    </Modal>
  );
};

export default DuplicateSuggestModal;
