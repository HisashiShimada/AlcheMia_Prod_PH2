'use client';

/**
 * 電子署名管理モーダル
 *
 * @description
 * プロジェクト管理画面から呼び出される電子署名管理モーダル。
 * MAIMLファイルのDocument全体に対する電子署名（XMLDSig）操作を提供する。
 *
 * 暗号化管理（EncryptionManagementModal）とは独立した専用モーダルで、
 * 署名はDocument全体に対する操作のため、要素の選択は不要。
 */

import React from 'react';
import { Modal, App } from 'antd';
import SignatureManagement from './SignatureManagement';

interface SignatureManagementModalProps {
  /** モーダルの表示状態 */
  open: boolean;
  /** 対象プロジェクト名 */
  projectName: string;
  /** 閉じるコールバック */
  onClose: () => void;
}

const SignatureManagementModal: React.FC<SignatureManagementModalProps> = ({
  open,
  projectName,
  onClose,
}) => {
  return (
    <App>
      <Modal
        open={open}
        onCancel={onClose}
        title={`電子署名管理: ${projectName}`}
        width={600}
        footer={null}
        destroyOnHidden
      >
        <SignatureManagement projectName={projectName} />
      </Modal>
    </App>
  );
};

export default SignatureManagementModal;
