'use client';

import React from 'react';
import { Modal, theme, App } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import ExperimentWorkerMenu from '@/components/menus/ExperimentWorkerMenu';
import { User } from '@/types/auth';

/**
 * 作業者画面オーバーレイのProps
 */
interface WorkerScreenOverlayProps {
  /** モーダルの表示状態 */
  open: boolean;
  /** モーダルを閉じるコールバック */
  onClose: () => void;
  /** ログインユーザー情報（ExperimentWorkerMenu に渡す） */
  user: User;
  /** 固定するプロジェクトID（プロジェクト管理画面で選択中のプロジェクト） */
  fixedProjectId?: string;
  /** 固定するプロジェクト名（タイトル表示用） */
  fixedProjectName?: string;
}

/**
 * 作業者画面オーバーレイコンポーネント
 *
 * プロジェクト管理画面から呼び出し、作業者画面（ExperimentWorkerMenu）を
 * Modal で表示する。
 *
 * 仕様:
 * - 遷移元で選択中のプロジェクトに固定（プロジェクト変更不可）
 * - メソッド・タスクのドロップダウンは操作可能
 * - 「選択」「承認依頼」などのボタンはすべて disabled
 * - Header / SubHeader は非表示
 */
const WorkerScreenOverlay: React.FC<WorkerScreenOverlayProps> = ({
  open,
  onClose,
  user,
  fixedProjectId,
  fixedProjectName,
}) => {
  const { token } = theme.useToken();

  const titleLabel = fixedProjectName
    ? `作業者画面 - ${fixedProjectName}`
    : '作業者画面';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <span>
          <UserOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
          {titleLabel}
        </span>
      }
      footer={null}
      width="80vw"
      style={{ top: 40 }}
      styles={{
        body: {
          height: 'calc(80vh - 55px)', // タイトルバー分を除いた高さ
          padding: 0,
          overflow: 'hidden',
        },
      }}
      destroyOnClose
      centered={false}
    >
      <App>
        <ExperimentWorkerMenu
          user={user}
          onLogout={() => {/* オーバーレイ内ではログアウト不要 */}}
          onNavigate={() => {/* オーバーレイ内では画面遷移不要 */}}
          overlayMode
          fixedProjectId={fixedProjectId}
          readOnly
        />
      </App>
    </Modal>
  );
};

export default WorkerScreenOverlay;
