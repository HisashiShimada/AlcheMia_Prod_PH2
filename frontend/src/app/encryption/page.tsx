/**
 * 暗号化管理ページ
 *
 * @description
 * MAIMLファイルの暗号化・復号化・鍵管理を行う画面。
 * URLパラメータ: ?project=<projectName>
 */

import EncryptionManagement from '@/components/encryption/EncryptionManagement';

interface EncryptionPageProps {
  searchParams: Promise<{ project?: string }>;
}

export default async function EncryptionPage({ searchParams }: EncryptionPageProps) {
  const params = await searchParams;
  const projectName = params.project ?? 'sample-project';

  return <EncryptionManagement projectName={projectName} />;
}
