'use client';

import React, { useState } from 'react';
import { Modal, Radio, Typography, Tag, Space, Alert } from 'antd';

const { Text } = Typography;

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
   * key: localName, value: 選択された候補の prefix:localName
   */
  onConfirm: (selections: Record<string, string>) => void;
}

// ──────────────────────────────────────────────
// 候補カード
// ──────────────────────────────────────────────
const CandidateCard: React.FC<{
  candidate: DuplicateCandidate;
  selected: boolean;
}> = ({ candidate, selected }) => {
  const borderColor = selected ? '#1677ff' : '#e8e8e8';
  const background  = selected ? '#e6f4ff' : '#fff';

  return (
    <div
      style={{
        border: `2px solid ${borderColor}`,
        borderRadius: 6,
        padding: '6px 10px',
        background,
        transition: 'all 0.15s',
        cursor: 'pointer',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
          {candidate.scopeLabel}
        </Tag>
        <Text strong style={{ fontSize: 13 }}>
          {candidate.prefix}:{candidate.localName}
        </Text>
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: '#555', paddingLeft: 4 }}>
        <Space size={12} wrap>
          <span>表示名: <Text strong>{candidate.displayName}</Text></span>
          {candidate.description && <span style={{ color: '#888' }}>説明: {candidate.description}</span>}
          <span>型: <Text code style={{ fontSize: 11 }}>{candidate.type}</Text></span>
          <span>
            単位:{' '}
            {candidate.unitHint
              ? <Text code style={{ fontSize: 11 }}>{candidate.unitHint}</Text>
              : <Text style={{ fontSize: 11, color: '#bbb' }}>未登録</Text>
            }
          </span>
        </Space>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────────
const DuplicateSuggestModal: React.FC<DuplicateSuggestModalProps> = ({
  open,
  entries,
  onClose,
  onConfirm,
}) => {
  const initSelections = (es: DuplicateTermEntry[]): Record<string, string> => {
    const init: Record<string, string> = {};
    for (const entry of es) {
      const first = entry.candidates[0];
      if (first) init[entry.localName] = `${first.prefix}:${first.localName}`;
    }
    return init;
  };

  const [selections, setSelections] = useState<Record<string, string>>(() =>
    initSelections(entries)
  );

  // entries / open が変わったときにリセット
  React.useEffect(() => {
    setSelections(initSelections(entries));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, open]);

  const allSelected = entries.every((e) => selections[e.localName] !== undefined);

  return (
    <Modal
      open={open}
      title={
        <span>
          <span style={{ color: '#faad14', marginRight: 8 }}>⚠️</span>
          類似用語が見つかりました（{entries.length}件）
        </span>
      }
      okText={`確定して共有（${entries.length}件）`}
      cancelText="キャンセル"
      okButtonProps={{
        disabled: !allSelected,
        style: allSelected
          ? { background: '#52c41a', borderColor: '#52c41a' }
          : undefined,
      }}
      onOk={() => {
        Modal.confirm({
          title: '⚠️ 注意',
          content: (
            <div style={{ lineHeight: 1.8 }}>
              <p style={{ margin: 0 }}>共有を確定すると、選択した用語の Prefix に切り替わります。</p>
              <p style={{ margin: 0 }}>現在この Prefix を使用している MaiML ファイルの用語は参照できなくなります。</p>
              <p style={{ margin: 0 }}>続行してよろしいですか？</p>
            </div>
          ),
          okText: '続行して共有',
          cancelText: 'キャンセル',
          okButtonProps: { danger: true },
          onOk: () => onConfirm(selections),
        });
      }}
      onCancel={onClose}
      maskClosable={false}
      keyboard={false}
      width={680}
    >
      <Alert
        type="info"
        showIcon
        message="選択した用語と同名の用語が既に存在します。採用する用語を1つ選択してください。"
        style={{ marginBottom: 16 }}
      />

      {entries.map((entry, idx) => {
        const currentValue = selections[entry.localName];

        return (
          <div key={entry.localName} style={{ marginBottom: idx < entries.length - 1 ? 24 : 0 }}>
            {/* セクションヘッダー */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
                paddingBottom: 6,
                borderBottom: '1px dashed #e8e8e8',
              }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                [{idx + 1}/{entries.length}]
              </Text>
              <Text strong>ローカル名: </Text>
              <Text code style={{ fontSize: 13 }}>{entry.localName}</Text>
            </div>

            {/* 候補リスト */}
            <Radio.Group
              name={`duplicate-suggest-${entry.localName}`}
              value={currentValue}
              onChange={(e) =>
                setSelections((prev) => ({ ...prev, [entry.localName]: e.target.value }))
              }
              style={{ width: '100%' }}
              className="duplicate-suggest-radio-group"
            >
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                {entry.candidates.map((c) => {
                  const val = `${c.prefix}:${c.localName}`;
                  return (
                    <Radio key={val} value={val} style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <CandidateCard candidate={c} selected={currentValue === val} />
                      </div>
                    </Radio>
                  );
                })}
              </Space>
            </Radio.Group>
          </div>
        );
      })}

      {!allSelected && (
        <div style={{ marginTop: 12, color: '#ff4d4f', fontSize: 12 }}>
          ※ まだ選択されていない用語があります（
          {entries.filter((e) => selections[e.localName] === undefined).length}件）
        </div>
      )}

      <style>{`
        .duplicate-suggest-radio-group .ant-radio-wrapper {
          width: 100%;
          display: flex !important;
          align-items: flex-start !important;
        }
        .duplicate-suggest-radio-group .ant-radio-wrapper > span:last-child {
          flex: 1;
          min-width: 0;
        }
      `}</style>
    </Modal>
  );
};

export default DuplicateSuggestModal;
