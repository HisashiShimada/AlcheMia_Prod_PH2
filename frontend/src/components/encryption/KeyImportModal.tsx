'use client';

/**
 * 鍵インポートモーダル
 *
 * @description
 * .key / .pem / .pfx 形式の外部ファイルを取り込んでシステムに保存するモーダル。
 */

import React, { useState } from 'react';
import { Modal, Form, Input, Upload, Typography, Alert, message } from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { EncryptionKey } from '@/types/encryption';
import * as encryptionService from '@/services/encryptionService';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;
const { Dragger } = Upload;

interface KeyImportModalProps {
  open: boolean;
  onClose: () => void;
  /** インポート完了後に鍵一覧を再取得するコールバック */
  onImported: (key: EncryptionKey) => void;
}

const ACCEPT_EXTENSIONS = '.key,.pem,.pfx';

const KeyImportModal: React.FC<KeyImportModalProps> = ({ open, onClose, onImported }) => {
  const { t } = useLanguage();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // ---------------------------------------------------------------------------
  // ファイル変更ハンドラ
  // ---------------------------------------------------------------------------

  const handleBeforeUpload = (file: UploadFile) => {
    const name = (file.name ?? '').toLowerCase();
    const valid = ['.key', '.pem', '.pfx'].some((ext) => name.endsWith(ext));
    if (!valid) {
      message.error(t('encryption.keyImport.invalidFormat'));
      return Upload.LIST_IGNORE;
    }
    setFileList([file]);
    return false; // 自動アップロードしない
  };

  // ---------------------------------------------------------------------------
  // インポート処理
  // ---------------------------------------------------------------------------

  const handleOk = async () => {
    if (fileList.length === 0) {
      message.warning(t('encryption.keyImport.fileRequired'));
      return;
    }

    let values: { password?: string } = {};
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const uploadFile = fileList[0];
    const rawFile = uploadFile.originFileObj as File | undefined;
    if (!rawFile) {
      message.error(t('encryption.keyImport.readFailed'));
      return;
    }

    setLoading(true);
    try {
      // ファイルをBase64に変換
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // data:...;base64,<content> の base64部分のみ取得
          const base64 = result.split(',')[1] ?? result;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(rawFile);
      });

      const imported = await encryptionService.importKey(rawFile.name, fileContent, values.password);
      message.success(t('encryption.keyImport.success', { keyName: imported.keyName }));
      form.resetFields();
      setFileList([]);
      onImported(imported);
      onClose();
    } catch {
      message.error(t('encryption.keyImport.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setFileList([]);
    onClose();
  };

  // ---------------------------------------------------------------------------
  // パスワード入力欄の表示判定
  // ---------------------------------------------------------------------------

  const selectedFileName = (fileList[0]?.name ?? '').toLowerCase();
  const requiresPassword = selectedFileName.endsWith('.key') || selectedFileName.endsWith('.pfx');

  // ---------------------------------------------------------------------------
  // レンダリング
  // ---------------------------------------------------------------------------

  return (
    <Modal
      title={
        <span>
          <UploadOutlined style={{ marginRight: 8 }} />
          鍵のインポート
        </span>
      }
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="インポート"
      cancelText="キャンセル"
      confirmLoading={loading}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        message=".key（エクスポート済み）、.pem、.pfx 形式のファイルをインポートできます。"
        style={{ marginBottom: 16, fontSize: 12 }}
      />

      {/* ファイル選択 */}
      <Dragger
        accept={ACCEPT_EXTENSIONS}
        fileList={fileList}
        beforeUpload={handleBeforeUpload}
        onRemove={() => setFileList([])}
        maxCount={1}
        style={{ marginBottom: 16 }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">クリックまたはドラッグでファイルを選択</p>
        <p className="ant-upload-hint">
          対応形式: .key / .pem / .pfx
        </p>
      </Dragger>

      {/* ファイルが選択されている場合のみフォーム表示 */}
      {fileList.length > 0 && (
        <Form form={form} layout="vertical" size="middle">
          {requiresPassword && (
            <Form.Item
              name="password"
              label={
                <span>
                  パスワード
                  <Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>
                    （.key / .pfx ファイルのパスワード保護を解除）
                  </Text>
                </span>
              }
              rules={[
                { required: true, message: 'パスワードを入力してください' },
              ]}
            >
              <Input.Password placeholder="ファイルのパスワード" />
            </Form.Item>
          )}
        </Form>
      )}
    </Modal>
  );
};

export default KeyImportModal;
