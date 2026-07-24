'use client';

/**
 * 暗号化管理モーダル
 *
 * @description
 * プロジェクト管理画面から呼び出される暗号化管理モーダル。
 * 画面よりやや小さいサイズ（90vw × 85vh）でMAIML暗号化操作を提供する。
 */

import React from 'react';
import { Modal } from 'antd';
import EncryptionManagement from './EncryptionManagement';

interface EncryptionManagementModalProps {
  /** モーダルの表示状態 */
  open: boolean;
  /** 対象プロジェクト名 */
  projectName: string;
  /** 閉じるコールバック */
  onClose: () => void;
}

const EncryptionManagementModal: React.FC<EncryptionManagementModalProps> = ({
  open,
  projectName,
  onClose,
}) => {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={`暗号化管理: ${projectName}`}
      width="90vw"
      style={{ top: 20 }}
      footer={null}
      destroyOnHidden
      styles={{ body: { height: '82vh', padding: 0, overflow: 'hidden' } }}
    >
      <EncryptionManagement projectName={projectName} onClose={onClose} />
    </Modal>
  );
};

export default EncryptionManagementModal;
