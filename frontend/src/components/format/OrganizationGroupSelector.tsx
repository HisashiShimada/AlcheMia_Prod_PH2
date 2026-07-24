'use client';

import React, { useEffect, useState } from 'react';
import { Select, Space, Typography, theme } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { createApiClient } from '@/utils/authUtils';
import { useLanguage } from '@/contexts/LanguageContext';

const { Text } = Typography;

/**
 * バックエンド GET /api/v1/organization-groups のレスポンス要素
 */
interface OrgGroupRecord {
  organization_group_cd: string;
  organization_group_name: string;
}

/**
 * OrganizationGroupSelectorのProps
 */
export interface OrganizationGroupSelectorProps {
  /** 選択中の組織グループCD */
  value: string;
  /** 選択変更ハンドラ */
  onChange: (cd: string) => void;
  /** ログインユーザーの所属グループCD一覧 */
  userGroupCds: string[];
}

/**
 * 組織グループ選択コンポーネント
 *
 * ログインユーザーが所属している組織グループのみ選択できる。
 * 所属グループが1件のみの場合はSelectをdisabledにして操作不能にする。
 */
const OrganizationGroupSelector: React.FC<OrganizationGroupSelectorProps> = ({
  value,
  onChange,
  userGroupCds,
}) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [allGroups, setAllGroups] = useState<OrgGroupRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // 組織グループ一覧を取得
  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);
      try {
        const client = createApiClient();
        const response = await client.get<{
          success: boolean;
          data: OrgGroupRecord[];
        }>('/organization-groups');

        if (response.data.success && Array.isArray(response.data.data)) {
          setAllGroups(response.data.data);
        }
      } catch (error) {
        console.error('[OrganizationGroupSelector] 組織グループ一覧取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  // ユーザーが所属しているグループのみに絞り込む
  const filteredGroups = allGroups.filter((g) =>
    userGroupCds.includes(g.organization_group_cd)
  );

  // userGroupCdsに一致するもののみ表示。未取得の場合はCD自体をラベルとして表示
  const options = userGroupCds.map((cd) => {
    const found = filteredGroups.find((g) => g.organization_group_cd === cd);
    return {
      value: cd,
      label: found
        ? `${found.organization_group_name}（${cd}）`
        : cd,
    };
  });

  const isDisabled = options.length <= 1;

  return (
    <Space size={4} style={{ alignItems: 'center' }}>
      <Text
        type="secondary"
        style={{ fontSize: token.fontSizeSM, fontWeight: token.fontWeightStrong }}
      >
        <TeamOutlined style={{ marginRight: 4 }} />
        {t('formatManagement.filter_labels.organization_group')}
      </Text>
      <Select
        style={{ minWidth: 200 }}
        value={value}
        onChange={onChange}
        options={options}
        loading={loading}
        disabled={isDisabled}
        placeholder={t('formatManagement.organization_group_placeholder')}
      />
    </Space>
  );
};

export default OrganizationGroupSelector;
