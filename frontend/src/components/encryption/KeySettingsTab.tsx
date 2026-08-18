'use client';

/**
 * 鍵設定タブコンテナ
 *
 * @description
 * 暗号化管理モーダルの大枠タブ「鍵設定」の内容を担うコンテナコンポーネント。
 * 「暗号化用の鍵」セクションと「復号化用の鍵」セクションを縦に並べて表示する。
 */

import React from 'react';
import { Typography } from 'antd';
import type { EncryptionKey, EncryptionConfig } from '@/types/encryption';
import EncryptionKeyPanel from './EncryptionKeyPanel';
import DecryptionKeyPanel from './DecryptionKeyPanel';
import type { DecryptionKeyState } from './DecryptionKeyPanel';

const { Text } = Typography;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface KeySettingsTabProps {
  /** 利用可能な鍵一覧 */
  keys: EncryptionKey[];
  /** 暗号化設定（EncryptionKeyPanel に渡す） */
  encryptionConfig: EncryptionConfig;
  /** 暗号化設定変更コールバック */
  onEncryptionConfigChange: (config: EncryptionConfig) => void;
  /** 復号化用の鍵選択状態 */
  decryptionKeyState: DecryptionKeyState;
  /** 復号化用の鍵選択状態変更コールバック */
  onDecryptionKeyChange: (state: DecryptionKeyState) => void;
}

// ---------------------------------------------------------------------------
// コンポーネント
// ---------------------------------------------------------------------------

const KeySettingsTab: React.FC<KeySettingsTabProps> = ({
  keys,
  encryptionConfig,
  onEncryptionConfigChange,
  decryptionKeyState,
  onDecryptionKeyChange,
}) => {
  return (
    <div style={{ padding: '16px', overflowY: 'auto', height: '100%' }}>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
        ここで設定した鍵は、このMAIMLファイルの暗号化・復号化操作に共通して使用されます。
      </Text>

      {/* 暗号化用の鍵 */}
      <EncryptionKeyPanel
        config={encryptionConfig}
        keys={keys}
        onConfigChange={onEncryptionConfigChange}
      />

      {/* 復号化用の鍵 */}
      <DecryptionKeyPanel
        keys={keys}
        value={decryptionKeyState}
        onChange={onDecryptionKeyChange}
      />
    </div>
  );
};

export default KeySettingsTab;
