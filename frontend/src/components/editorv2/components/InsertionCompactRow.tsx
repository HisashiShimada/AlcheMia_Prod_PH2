'use client';

import React from 'react';
import { Space, Tag, Tooltip, Button, Popconfirm, Typography } from 'antd';
import {
  RightOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  FileImageOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

// ----------------------------------------
// 型定義（InsertionListPanel と共用）
// ----------------------------------------

export type InsertionFileType = 'maiml' | 'non-maiml';
export type InsertionLocation = 'document' | 'method' | 'result' | 'property' | 'content' | 'other';
export type InsertionStatus = 'valid' | 'warning' | 'error';

export interface InsertionItem {
  id: string;
  uri: string;
  hash: string;
  hashMethod: string;
  uuid: string | null;
  format: string;
  fileType: InsertionFileType;
  insertionLocation: InsertionLocation;
  status: InsertionStatus;
  description: string;
}

export interface InsertionCompactRowProps {
  item: InsertionItem;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRevalidate?: () => void;
}

// ----------------------------------------
// ヘルパー定数
// ----------------------------------------

const locationLabel: Record<InsertionLocation, string> = {
  document: '<document>',
  method: '<method>',
  result: '<result>',
  property: '<property>',
  content: '<content>',
  other: 'その他',
};

const locationColor: Record<InsertionLocation, string> = {
  document: 'blue',
  method: 'geekblue',
  result: 'green',
  property: 'orange',
  content: 'cyan',
  other: 'default',
};

// ----------------------------------------
// ステータス別のスタイル
// ----------------------------------------

const rowBg: Record<InsertionStatus, string> = {
  valid: '#fff',
  warning: '#fffbe6',
  error: '#fff2f0',
};

const rowBorderLeft: Record<InsertionStatus, string> = {
  valid: 'none',
  warning: '3px solid #faad14',
  error: '3px solid #ff4d4f',
};

// ----------------------------------------
// InsertionCompactRow
// ----------------------------------------

/**
 * InsertionCompactRow
 * 縮約表示モードで Insertion 1件を表示するアコーディオン行。
 * - 閉じた状態: ステータス + 種別 + URI + 記述場所 + ハッシュ状態 を1行で表示
 * - 展開状態: 詳細パネル（URI全文・ハッシュ・UUID・フォーマット + アクション）を追加表示
 */
const InsertionCompactRow: React.FC<InsertionCompactRowProps> = ({
  item,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onRevalidate,
}) => {
  // ----------------------------------------
  // ステータスアイコン
  // ----------------------------------------
  const statusIcon = (() => {
    switch (item.status) {
      case 'valid':
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 14 }} />;
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14', fontSize: 14 }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 14 }} />;
    }
  })();

  // ----------------------------------------
  // 種別タグ
  // ----------------------------------------
  const fileTypeTag = item.fileType === 'maiml' ? (
    <Tag
      icon={<FileTextOutlined />}
      color="blue"
      style={{ fontSize: 11, margin: 0, flexShrink: 0, minWidth: 60, textAlign: 'center' }}
    >
      MaiML
    </Tag>
  ) : (
    <Tag
      icon={<FileImageOutlined />}
      color="green"
      style={{ fontSize: 11, margin: 0, flexShrink: 0, minWidth: 60, textAlign: 'center' }}
    >
      非MaiML
    </Tag>
  );

  // ----------------------------------------
  // ハッシュ状態テキスト
  // ----------------------------------------
  const hashStatus = (() => {
    if (!item.hash) {
      return <Text type="warning" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>⚠ 未設定</Text>;
    }
    switch (item.status) {
      case 'valid':
        return <Text style={{ fontSize: 11, color: '#52c41a', whiteSpace: 'nowrap' }}>✓ {item.hashMethod}</Text>;
      case 'warning':
        return <Text style={{ fontSize: 11, color: '#faad14', whiteSpace: 'nowrap' }}>⚠ 要再計算</Text>;
      case 'error':
        return <Text type="danger" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>✗ 未検出</Text>;
    }
  })();

  // ----------------------------------------
  // ステータス別のエラー/警告メッセージ
  // ----------------------------------------
  const statusMessage = (() => {
    switch (item.status) {
      case 'warning':
        return 'ファイルは存在しますが、ハッシュ値が一致しません。ファイルが更新されている可能性があります。';
      case 'error':
        return 'URIが示すファイルが存在しません。パスを確認してください。';
      default:
        return null;
    }
  })();

  // ----------------------------------------
  // 展開パネル内アクションボタン
  // ----------------------------------------
  const detailActions = (
    <div
      style={{
        display: 'flex',
        gap: 6,
        marginTop: 10,
        paddingTop: 10,
        borderTop: `1px solid ${item.status === 'error' ? '#ffccc7' : item.status === 'warning' ? '#ffe58f' : '#d6e4ff'}`,
      }}
    >
      {item.status === 'warning' && (
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onRevalidate?.();
          }}
          style={{ background: '#faad14', borderColor: '#faad14', color: '#fff' }}
        >
          ハッシュを再計算
        </Button>
      )}
      <Button
        type="primary"
        size="small"
        icon={<EditOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        {item.status === 'error' ? '編集して修正' : '編集'}
      </Button>
      {item.status === 'error' && onRevalidate && (
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onRevalidate();
          }}
        >
          再検証
        </Button>
      )}
      <Popconfirm
        title="このInsertionを削除しますか？"
        description="削除後は元に戻せません。"
        onConfirm={(e) => {
          e?.stopPropagation();
          onDelete();
        }}
        onCancel={(e) => e?.stopPropagation()}
        okText="削除"
        cancelText="キャンセル"
        okButtonProps={{ danger: true }}
      >
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={(e) => e.stopPropagation()}
        >
          削除
        </Button>
      </Popconfirm>
    </div>
  );

  // ----------------------------------------
  // 展開パネル
  // ----------------------------------------
  const expandedPanel = (
    <div
      style={{
        background: item.status === 'error' ? '#fff2f0' : item.status === 'warning' ? '#fffbe6' : '#f8fbff',
        borderTop: `1px solid ${item.status === 'error' ? '#ffccc7' : item.status === 'warning' ? '#ffe58f' : '#d6e4ff'}`,
        padding: '12px 32px 14px 32px',
        fontSize: 12,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px 20px',
        }}
      >
        {/* URI */}
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 600, marginBottom: 2 }}>URI（全文）</div>
          <Text code style={{ fontSize: 11, wordBreak: 'break-all' }}>{item.uri}</Text>
        </div>

        {/* ハッシュ値 */}
        <div>
          <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 600, marginBottom: 2 }}>
            ハッシュ値（{item.hashMethod}）
          </div>
          <Text
            code
            style={{
              fontSize: 11,
              color: item.status === 'warning' ? '#faad14' : undefined,
              wordBreak: 'break-all',
            }}
          >
            {item.hash ? `${item.hash.slice(0, 40)}…` : '—'}
          </Text>
        </div>

        {/* フォーマット */}
        <div>
          <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 600, marginBottom: 2 }}>フォーマット</div>
          {item.format ? (
            <Tag style={{ fontSize: 11 }}>{item.format}</Tag>
          ) : (
            <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
          )}
        </div>

        {/* UUID（MaiMLのみ） */}
        <div>
          <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 600, marginBottom: 2 }}>UUID</div>
          {item.uuid ? (
            <Text code style={{ fontSize: 11 }}>{item.uuid}</Text>
          ) : (
            <Text type="secondary" style={{ fontSize: 11 }}>— （非MaiMLのため不要）</Text>
          )}
        </div>

        {/* 記述場所 */}
        <div>
          <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 600, marginBottom: 2 }}>記述場所</div>
          <Tag color={locationColor[item.insertionLocation]} style={{ fontSize: 11 }}>
            {locationLabel[item.insertionLocation]} 直下
          </Tag>
        </div>

        {/* エラー/警告メッセージ */}
        {statusMessage && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 600, marginBottom: 2 }}>
              {item.status === 'error' ? 'エラー詳細' : '警告詳細'}
            </div>
            <Text
              style={{
                fontSize: 12,
                color: item.status === 'error' ? '#ff4d4f' : '#faad14',
              }}
            >
              {statusMessage}
            </Text>
          </div>
        )}
      </div>

      {detailActions}
    </div>
  );

  // ----------------------------------------
  // レンダリング
  // ----------------------------------------
  return (
    <li
      style={{
        borderBottom: '1px solid #f0f0f0',
        background: rowBg[item.status],
        borderLeft: rowBorderLeft[item.status],
      }}
    >
      {/* 縮約行 */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          cursor: 'pointer',
          background: isExpanded
            ? (item.status === 'error' ? '#fff0ef' : item.status === 'warning' ? '#fffbe6' : '#f0f5ff')
            : rowBg[item.status],
          transition: 'background 0.15s',
          minWidth: 0,
        }}
        className="insertion-compact-row"
      >
        {/* 展開アイコン */}
        <RightOutlined
          style={{
            fontSize: 10,
            color: '#8c8c8c',
            flexShrink: 0,
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(90deg)' : 'none',
          }}
        />

        {/* ステータスアイコン */}
        <Tooltip title={item.status === 'valid' ? '正常' : item.status === 'warning' ? '警告' : 'エラー'}>
          <span style={{ flexShrink: 0 }}>{statusIcon}</span>
        </Tooltip>

        {/* 種別タグ */}
        {fileTypeTag}

        {/* URI（省略） */}
        <Tooltip title={item.uri}>
          <Text
            code
            style={{
              fontSize: 11,
              flex: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              color: item.status === 'error' ? '#ff4d4f' : undefined,
              fontWeight: item.status === 'error' ? 600 : undefined,
            }}
          >
            {item.uri}
          </Text>
        </Tooltip>

        {/* 説明テキスト */}
        <Text
          type={item.status === 'error' ? 'danger' : item.status === 'warning' ? undefined : 'secondary'}
          style={{
            fontSize: 11,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
            color: item.status === 'warning' ? '#faad14' : undefined,
          }}
        >
          {item.status === 'error'
            ? '✗ ファイルが見つかりません'
            : item.status === 'warning'
              ? '⚠ ハッシュ再計算が必要'
              : item.description || ''}
        </Text>

        {/* 記述場所タグ */}
        <Tag
          color={locationColor[item.insertionLocation]}
          style={{ fontSize: 11, margin: 0, flexShrink: 0 }}
        >
          {locationLabel[item.insertionLocation]}
        </Tag>

        {/* ハッシュ状態 */}
        <span style={{ flexShrink: 0, width: 80, textAlign: 'right' }}>
          {hashStatus}
        </span>

        {/* 操作ボタン（ホバー時のみ表示 → CSS で制御） */}
        <Space
          size={4}
          style={{ flexShrink: 0 }}
          className="insertion-compact-row-actions"
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip title="編集">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            />
          </Tooltip>
          <Tooltip title="削除">
            <Popconfirm
              title="このInsertionを削除しますか？"
              description="削除後は元に戻せません。"
              onConfirm={(e) => {
                e?.stopPropagation();
                onDelete();
              }}
              onCancel={(e) => e?.stopPropagation()}
              okText="削除"
              cancelText="キャンセル"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      </div>

      {/* 展開パネル */}
      {isExpanded && expandedPanel}

      {/* ホバー時に操作ボタンを表示するCSS */}
      <style>{`
        .insertion-compact-row-actions { opacity: 0; transition: opacity 0.15s; }
        .insertion-compact-row:hover .insertion-compact-row-actions { opacity: 1; }
      `}</style>
    </li>
  );
};

export default InsertionCompactRow;
