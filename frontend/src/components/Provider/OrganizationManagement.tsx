'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  Select,
  Radio,
  Typography,
  Row,
  Col,
  Badge,
  App,
  Divider,
  theme,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { createApiClient } from '@/utils/authUtils';
import { formatDateTime } from '@/utils/dateFormatter';
import { getMenuPermission } from '@/utils/menuPermissions';

const { Text } = Typography;
const { useToken } = theme;

/**
 * 組織データの型定義（DB連携版）
 */
interface OrganizationData {
  organizationId: string;           // UUID
  organizationCd: string;            // 組織CD
  organizationDisplayName: string;   // 組織表示名
  organizationEmail: string;         // 組織E-mail
  chiefUserId: string;               // 代表者ユーザーID
  chiefUserName: string;             // 代表システム管理者名（JOIN結果）
  corporationName: string;           // 会社名（JOIN結果）
  isEntry: number;                   // 二段階認証判定
  useDeemedProgress: boolean;        // みなし進捗使用フラグ
  isActive: boolean;                 // アクティブ/非アクティブ
  updatedAt: string;                 // 更新日時
}

/**
 * 会社データの型定義
 */
interface CorporationData {
  corporationId: string;
  corporationName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 選択肢の型定義
 */
interface OptionType {
  label: string;
  value: string;
}

/**
 * 組織管理画面コンポーネント（DB連携版）
 */
export default function OrganizationManagement() {
  const { modal, message: messageApi } = App.useApp();
  const { token } = useToken();

  // 権限制御: provider メニュー（機能CD: 010000）の permission が 0 の場合は読取専用
  const isReadOnly = getMenuPermission('provider') === 0;

  const [organizations, setOrganizations] = useState<OrganizationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationData | null>(null);
  const [selectedOrganizationDisplayName, setSelectedOrganizationDisplayName] = useState<string>('');
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<string>('');
  const [selectedIsEntry, setSelectedIsEntry] = useState<string>('');
  const [selectedUseDeemedProgress, setSelectedUseDeemedProgress] = useState<string>('');
  const [form] = Form.useForm();
  const [companyOptions, setCompanyOptions] = useState<OptionType[]>([]);
  const [systemAdminOptions, setSystemAdminOptions] = useState<OptionType[]>([]);
  const [isDuplicateChecking, setIsDuplicateChecking] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [organizationCdValue, setOrganizationCdValue] = useState('');

  // 初回データ取得
  useEffect(() => {
    fetchOrganizations();
  }, []);

  // 組織データ取得
  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const client = createApiClient();
      const response = await client.get('/provider/organization');
      console.log('Organization API Response:', response.data);
      
      // 統一APIレスポンス形式 { success, data, meta } に対応
      if (response.data.success && Array.isArray(response.data.data)) {
        setOrganizations(response.data.data);
      } else {
        console.error('Unexpected response format:', response.data);
        messageApi.error('データ形式が不正です');
        setOrganizations([]);
      }
    } catch (error) {
      console.error('Organization取得エラー:', error);
      messageApi.error('組織データの取得に失敗しました');
      setOrganizations([]); // エラー時は空配列を設定
    } finally {
      setLoading(false);
    }
  };

  // 組織CDの選択肢を動的に取得
  const organizationCds = useMemo(() => {
    const uniqueCds = Array.from(new Set(organizations.map(o => o.organizationCd).filter(cd => cd)));
    return uniqueCds.sort();
  }, [organizations]);

  // 組織表示名の選択肢を動的に取得
  const organizationDisplayNames = useMemo(() => {
    const uniqueNames = Array.from(new Set(organizations.map(o => o.organizationDisplayName).filter(name => name)));
    return uniqueNames.sort();
  }, [organizations]);

  // 会社名の選択肢を動的に取得
  const companyNames = useMemo(() => {
    const uniqueNames = Array.from(new Set(organizations.map(o => o.corporationName).filter(name => name)));
    return uniqueNames.sort();
  }, [organizations]);

  // フィルタリングされた組織
  const filteredOrganizations = useMemo(() => {
    return organizations.filter(org => {
      // テキスト検索フィルター（組織CD、組織e-mail、代表システム管理者、更新日時のみ）
      const searchLower = searchText.toLowerCase();
      const matchesSearch = !searchText.trim() || (
        org.organizationCd.toLowerCase().includes(searchLower) ||
        org.organizationEmail.toLowerCase().includes(searchLower) ||
        org.chiefUserName.toLowerCase().includes(searchLower) ||
        formatDateTime(org.updatedAt).toLowerCase().includes(searchLower)
      );

      // 組織表示名フィルター
      const matchesOrganizationDisplayName = !selectedOrganizationDisplayName || org.organizationDisplayName === selectedOrganizationDisplayName;

      // 会社名フィルター
      const matchesCompanyName = !selectedCompanyCode || org.corporationName === selectedCompanyCode;

      // 二段階認証判定フィルター
      const matchesIsEntry = selectedIsEntry === '' || org.isEntry === Number(selectedIsEntry);

      // みなし進捗使用フラグフィルター
      const matchesUseDeemedProgress = selectedUseDeemedProgress === '' || org.useDeemedProgress === (selectedUseDeemedProgress === 'true');

      return matchesSearch && matchesOrganizationDisplayName && matchesCompanyName && matchesIsEntry && matchesUseDeemedProgress;
    });
  }, [organizations, searchText, selectedOrganizationDisplayName, selectedCompanyCode, selectedIsEntry, selectedUseDeemedProgress]);

  // アクティブな組織数をカウント
  const activeOrganizationCount = useMemo(() => {
    return filteredOrganizations.filter(org => org.isActive).length;
  }, [filteredOrganizations]);

  // テーブルの行選択
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  // テーブルカラム定義
  const columns: ColumnsType<OrganizationData> = [
    {
      title: (
        <div style={{ textAlign: 'center' }}>
          <Space size="middle" align="center">
            <span>組織CD</span>
            <Badge
              count={activeOrganizationCount}
              style={{
                backgroundColor: '#4169E1',
                fontSize: 14,
                height: 24,
                minWidth: 40,
                lineHeight: '24px',
                borderRadius: 12,
              }}
            />
          </Space>
        </div>
      ),
      dataIndex: 'organizationCd',
      key: 'organizationCd',
      width: 180,
      sorter: (a, b) => a.organizationCd.localeCompare(b.organizationCd),
      render: (text: string, record) => (
        <Text style={{ 
          fontWeight: 500, 
          color: !record.isActive ? 'rgba(0, 0, 0, 0.45)' : '#0093CF'
        }}>
          {text}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>組織表示名</div>,
      dataIndex: 'organizationDisplayName',
      key: 'organizationDisplayName',
      width: 150,
      sorter: (a, b) => a.organizationDisplayName.localeCompare(b.organizationDisplayName),
      render: (text: string, record) => (
        <Text style={{ 
          fontSize: 13,
          color: !record.isActive ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.85)'
        }}>
          {text}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>組織e-mail</div>,
      dataIndex: 'organizationEmail',
      key: 'organizationEmail',
      width: 250,
      sorter: (a, b) => a.organizationEmail.localeCompare(b.organizationEmail),
      render: (text: string, record) => (
        <Text style={{ 
          fontSize: 13,
          color: !record.isActive ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.85)'
        }}>
          {text}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>代表システム管理者</div>,
      dataIndex: 'chiefUserName',
      key: 'chiefUserName',
      width: 164,
      sorter: (a, b) => a.chiefUserName.localeCompare(b.chiefUserName),
      render: (text: string, record) => (
        <Text style={{ 
          fontSize: 13,
          color: !record.isActive ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.85)'
        }}>
          {text}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>会社名</div>,
      dataIndex: 'corporationName',
      key: 'corporationName',
      width: 250,
      align: 'left',
      sorter: (a, b) => a.corporationName.localeCompare(b.corporationName),
      render: (text: string, record) => (
        <Text style={{ 
          fontSize: 13,
          color: !record.isActive ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.85)'
        }}>
          {text}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>二段階認証判定</div>,
      dataIndex: 'isEntry',
      key: 'isEntry',
      width: 140,
      align: 'center',
      sorter: (a, b) => a.isEntry - b.isEntry,
      render: (value: number, record) => (
        <Text style={{ 
          fontSize: 13,
          color: !record.isActive ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.85)'
        }}>
          {value === 1 ? 'あり' : 'なし'}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>みなし進捗使用フラグ</div>,
      dataIndex: 'useDeemedProgress',
      key: 'useDeemedProgress',
      width: 174,
      align: 'center',
      sorter: (a, b) => Number(a.useDeemedProgress) - Number(b.useDeemedProgress),
      render: (value: boolean, record) => (
        <Text style={{ 
          fontSize: 13,
          color: !record.isActive ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.85)'
        }}>
          {value ? 'あり' : 'なし'}
        </Text>
      ),
    },
    {
      title: <div style={{ textAlign: 'center' }}>更新日時</div>,
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      align: 'right',
      sorter: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
      render: (text: string) => formatDateTime(text),
    },
    {
      title: '',
      key: 'action',
      width: 330,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadCertificate(record)}
            disabled={isReadOnly || !record.isActive}
          >
            証明書DL
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={isReadOnly}
          >
            編集
          </Button>
          <Button
            size="small"
            onClick={() => handleToggleActive(record)}
            danger={record.isActive}
            style={{ width: '100px' }}
            disabled={isReadOnly}
          >
            {!record.isActive ? 'アクティブ' : '非アクティブ'}
          </Button>
        </Space>
      ),
    },
  ];

  // 証明書ダウンロード
  const handleDownloadCertificate = async (org: OrganizationData) => {
    try {
      const client = createApiClient();
      
      // バックエンドAPIからクライアント証明書（.p12）を取得
      const response = await client.get(
        `/provider/organization/${org.organizationId}/certificate`,
        { responseType: 'blob' }  // バイナリデータとして取得
      );
      
      // Blobからダウンロードリンクを作成
      const blob = new Blob([response.data], { type: 'application/x-pkcs12' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // ファイル名を設定（組織CD + .p12拡張子）
      link.href = url;
      link.download = `${org.organizationCd}_certificate.p12`;
      
      // ダウンロード実行
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      messageApi.success(`${org.organizationCd}の証明書をダウンロードしました`);
    } catch (error) {
      console.error('証明書ダウンロードエラー:', error);
      messageApi.error('証明書のダウンロードに失敗しました');
    }
  };

  // 組織CD重複チェック（デバウンス付き）
  useEffect(() => {
    // 編集モードの場合はチェックしない
    if (editingOrg || !organizationCdValue || organizationCdValue.length === 0) {
      setIsDuplicate(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsDuplicateChecking(true);
      try {
        const client = createApiClient();
        const response = await client.get(
          `/provider/organization/check-cd/${organizationCdValue}`
        );
        
        // 既に存在する場合
        if (response.data.exists) {
          setIsDuplicate(true);
          form.setFields([
            {
              name: 'organizationCd',
              errors: ['この組織CDは既に使用されています']
            }
          ]);
        } else {
          setIsDuplicate(false);
          form.setFields([
            {
              name: 'organizationCd',
              errors: []
            }
          ]);
        }
      } catch (_error) {
        // エラー時は重複なしとして扱う
        setIsDuplicate(false);
      } finally {
        setIsDuplicateChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [organizationCdValue, form, editingOrg]);

  // 組織追加
  const handleAdd = () => {
    setEditingOrg(null);
    setIsDuplicate(false);
    setOrganizationCdValue('');
    form.resetFields();
    
    // 明示的にすべてのフィールドをリセット
    form.setFieldsValue({
      organizationCd: '',
      organizationDisplayName: '',
      organizationEmail: '',
      corporationId: undefined,
      isEntry: 0,                    // デフォルトは「無効」
      isActive: true,                // デフォルトは「アクティブ」
      chiefUserName: '',             // 空欄
      chiefUserEmail: '',            // 空欄
    });
    
    setIsModalVisible(true);
  };

  // システム管理者一覧を取得
  const fetchSystemAdmins = async (organizationId: string) => {
    try {
      const client = createApiClient();
      const response = await client.get(
        `/provider/organization/${organizationId}/system-admins`
      );
      
      if (response.data.success && Array.isArray(response.data.data)) {
        const options = response.data.data.map((user: { userName: string; userId: string }) => ({
          label: user.userName,    // 表示: ユーザー名
          value: user.userId,      // 値: ユーザーID
        }));
        setSystemAdminOptions(options);
      }
    } catch (error) {
      console.error('システム管理者取得エラー:', error);
      messageApi.error('システム管理者の取得に失敗しました');
      setSystemAdminOptions([]);
    }
  };

  // 組織編集
  const handleEdit = async (org: OrganizationData) => {
    setEditingOrg(org);
    
    // システム管理者一覧を取得
    await fetchSystemAdmins(org.organizationId);
    
    // corporationNameからcorporationIdに変換
    const corporationId = companyOptions.find(
      option => option.label === org.corporationName
    )?.value || undefined;
    
    form.setFieldsValue({
      ...org,
      corporationId,  // 会社IDに変換
      chiefUserId: org.chiefUserId,  // chiefUserIdを設定
    });
    setIsModalVisible(true);
  };

  // アクティブ化（一括）
  const handleActivate = () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning('アクティブにする組織を選択してください');
      return;
    }
    
    modal.confirm({
      title: '選択した組織をアクティブにしますか？',
      content: `${selectedRowKeys.length}件の組織がアクティブになります。`,
      okText: 'アクティブ化',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          const client = createApiClient();
          // 選択された各組織を順次アクティブ化
          for (const key of selectedRowKeys) {
            await client.patch(
              `/provider/organization/${key}/status`,
              { isActive: true }
            );
          }
          
          messageApi.success(`${selectedRowKeys.length}件の組織をアクティブにしました`);
          setSelectedRowKeys([]);
          await fetchOrganizations();
        } catch (error) {
          console.error('アクティブ化エラー:', error);
          messageApi.error('アクティブ化に失敗しました');
        }
      },
    });
  };

  // 非アクティブ化（一括）
  const handleDeactivate = () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning('非アクティブにする組織を選択してください');
      return;
    }
    
    modal.confirm({
      title: '選択した組織を非アクティブにしますか？',
      content: `${selectedRowKeys.length}件の組織が非アクティブになります。`,
      okText: '非アクティブ化',
      cancelText: 'キャンセル',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const client = createApiClient();
          // 選択された各組織を順次非アクティブ化
          for (const key of selectedRowKeys) {
            await client.patch(
              `/provider/organization/${key}/status`,
              { isActive: false }
            );
          }
          
          messageApi.success(`${selectedRowKeys.length}件の組織を非アクティブにしました`);
          setSelectedRowKeys([]);
          await fetchOrganizations();
        } catch (error) {
          console.error('非アクティブ化エラー:', error);
          messageApi.error('非アクティブ化に失敗しました');
        }
      },
    });
  };

  // アクティブ/非アクティブ切り替え（個別）
  const handleToggleActive = (org: OrganizationData) => {
    const actionText = org.isActive ? '非アクティブ' : 'アクティブ';
    const organizationCd = org.organizationCd;

    modal.confirm({
      title: `${organizationCd}を${actionText}にしますか？`,
      content: `この組織を${actionText}状態に変更します。`,
      okText: actionText,
      cancelText: 'キャンセル',
      okButtonProps: org.isActive ? { danger: true } : undefined,
      onOk: async () => {
        try {
          const client = createApiClient();
          await client.patch(
            `/provider/organization/${org.organizationId}/status`,
            { isActive: !org.isActive }
          );
          
          messageApi.success(`${organizationCd}を${actionText}にしました`);
          await fetchOrganizations();
        } catch (error) {
          console.error('ステータス変更エラー:', error);
          messageApi.error(`ステータスの変更に失敗しました`);
        }
      },
    });
  };

  // リロード
  const handleReload = async () => {
    setSearchText('');
    setSelectedRowKeys([]);
    setSelectedOrganizationDisplayName('');
    setSelectedCompanyCode('');
    setSelectedIsEntry('');
    setSelectedUseDeemedProgress('');
    await fetchOrganizations();
    messageApi.success('データをリロードしました');
  };

  // CSVアップロード処理
  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    handleCSVUpload(file);
    
    // input要素をリセット（同じファイルを再度選択できるように）
    event.target.value = '';
  };

  // CSVファイルをAPIにアップロード
  const handleCSVUpload = async (file: File) => {
    try {
      setLoading(true);
      const client = createApiClient();
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await client.post('/provider/organization/upload-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // バリデーションエラーのチェック（HTTPステータス200でもエラーの場合がある）
      if (response.data.success && response.data.data) {
        const result = response.data.data;
        
        if (result.failureCount > 0 && result.errors.length > 0) {
          // エラーがある場合はメッセージを表示
          const errorMessage = result.errors[0].message;
          console.error('CSV validation error:', errorMessage);
          messageApi.error(errorMessage);
          return;
        }
        
        // 成功時はログ出力のみ
        console.log(`CSV upload successful: ${result.successCount} records created`);
        messageApi.success('CSVファイルをアップロードしました');
      }
      
      await fetchOrganizations();
    } catch (error) {
      // すでにErrorオブジェクトの場合はそのまま再スロー（バリデーションエラー）
      if (error instanceof Error && !('isAxiosError' in error)) {
        messageApi.error(error.message);
        return;
      }
      
      // HTTPエラーの場合
      console.error('CSV upload error:', error);
      messageApi.error('CSVアップロードに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // CSVダウンロード（フィルタ済みデータをそのまま CSV 化）
  const handleDownload = () => {
    try {
      // フィルタ適用済みの filteredOrganizations を CSV 化
      const csvData = filteredOrganizations.map((o) => ({
        'organization_cd': o.organizationCd,
        'organization_display_name': o.organizationDisplayName,
        'organization_email': o.organizationEmail,
        'chief_user_name': o.chiefUserName,
        'chief_user_email': o.chiefUserId,
        'corporation_name': o.corporationName,
        'is_entry': o.isEntry,
        'use_deemed_progress': o.useDeemedProgress,
        'update_at': o.updatedAt,
        'is_active': o.isActive,
      }));

      // CSV 文字列を構築（ヘッダー付き）
      const headers = Object.keys(csvData[0] ?? {});
      const rows = csvData.map(row =>
        headers.map(h => {
          const val = String((row as Record<string, unknown>)[h] ?? '');
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        }).join(',')
      );
      const csvString = [headers.join(','), ...rows].join('\r\n');

      // BOM 付き UTF-8 でダウンロード
      const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const timestamp = new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .replace('T', '')
        .slice(0, 14);
      link.href = url;
      link.download = `organizations_${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      messageApi.success('CSVファイルをダウンロードしました');
    } catch (error) {
      console.error('CSV download error:', error);
      messageApi.error('CSVダウンロードに失敗しました');
    }
  };

  // モーダルOK
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      const client = createApiClient();
      
      if (editingOrg) {
        // 更新時は代表者メールアドレスをフォームデータから除外（編集では使用しない）
        const { chiefUserEmail, ...saveData } = values;
        
        // 更新
        await client.put(
          `/provider/organization/${editingOrg.organizationId}`,
          saveData
        );
        messageApi.success('組織情報を更新しました');
      } else {
        // 新規作成: organizationIdを生成して追加
        const organizationId = crypto.randomUUID();  // UUIDを生成
        
        await client.post('/provider/organization', {
          organizationId,  // 生成したUUIDを追加
          ...values,  // chiefUserEmailを含む全データを送信
        });
        messageApi.success('組織を追加しました');
      }
      
      setIsModalVisible(false);
      setOrganizationCdValue('');
      form.resetFields();
      await fetchOrganizations();
    } catch (error) {
      console.error('保存エラー:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        if (axiosError.response?.data?.error) {
          messageApi.error(axiosError.response.data.error);
        } else {
          messageApi.error('保存に失敗しました');
        }
      } else {
        messageApi.error('保存に失敗しました');
      }
    }
  };

  // モーダルキャンセル
  const handleModalCancel = () => {
    setIsModalVisible(false);
    setIsDuplicate(false);
    form.resetFields();
  };

  // 会社データ取得
  useEffect(() => {
    const fetchCorporations = async () => {
      try {
        const client = createApiClient();
        const response = await client.get('/provider/corporation');
        console.log('Corporation API Response:', response.data);

        // 統一APIレスポンス形式 { success, data, meta } に対応
        if (response.data.success && Array.isArray(response.data.data)) {
          // AntD Select 用の format に変換
          const options = response.data.data
            .filter((corp: CorporationData) => corp.isActive)  // アクティブな会社のみ
            .map((corp: CorporationData) => ({
              label: corp.corporationName,
              value: corp.corporationId,        // ← 会社ID（UUID）に変更
            }));

          setCompanyOptions(options);
        } else {
          console.error('Unexpected corporation response format:', response.data);
          messageApi.error('会社データの形式が不正です');
        }
      } catch (error) {
        console.error('会社名の取得に失敗:', error);
        messageApi.error('会社データの取得に失敗しました');
      }
    };

    fetchCorporations();
  }, [messageApi]);

  return (
    <div style={{ padding: '0 15px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: 16,
        gap: 8,
      }}>
        <label htmlFor="csv-upload">
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
          <Button
            icon={<UploadOutlined />}
            onClick={() => document.getElementById('csv-upload')?.click()}
            disabled={isReadOnly}
          >
            CSV<br />アップロード
          </Button>
        </label>
        <Button icon={<DownloadOutlined />} onClick={handleDownload}>
          CSV<br />ダウンロード
        </Button>
        <Button icon={<PlusOutlined />} onClick={handleAdd} disabled={isReadOnly}>
          追加
        </Button>
        <Button
          onClick={handleActivate}
          disabled={isReadOnly || selectedRowKeys.length === 0}
          style={{
            minWidth: 85,
            backgroundColor: !isReadOnly && selectedRowKeys.length > 0 ? '#4CAF50' : undefined,
            borderColor: !isReadOnly && selectedRowKeys.length > 0 ? '#4CAF50' : undefined,
            color: !isReadOnly && selectedRowKeys.length > 0 ? '#fff' : undefined,
          }}
        >
          アクティブ
        </Button>
        <Button
          danger
          onClick={handleDeactivate}
          disabled={isReadOnly || selectedRowKeys.length === 0}
          style={{
            minWidth: 85,
            backgroundColor: !isReadOnly && selectedRowKeys.length > 0 ? '#FFA500' : undefined,
            borderColor: !isReadOnly && selectedRowKeys.length > 0 ? '#FFA500' : undefined,
            color: !isReadOnly && selectedRowKeys.length > 0 ? '#fff' : undefined,
          }}
        >
          非アクティブ
        </Button>
        <Button icon={<ReloadOutlined />} onClick={handleReload}>
          リロード
        </Button>
      </div>

      <div
        style={{
          padding: 0,
          backgroundColor: '#fff',
          maxWidth: 3600,
          margin: '0 auto',
        }}
      >
        <Row gutter={16} style={{ marginBottom: 8 }}>
          <Col style={{ width: 400 }}>
            <Input
              placeholder="組織CD、組織e-mail、代表システム管理者、更新日時で検索"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder="組織表示名"
              value={selectedOrganizationDisplayName || undefined}
              onChange={(value) => setSelectedOrganizationDisplayName(value || '')}
              allowClear
              style={{ width: '100%' }}
              options={organizationDisplayNames.map(name => ({ label: name, value: name }))}
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder="会社名"
              value={selectedCompanyCode || undefined}
              onChange={(value) => setSelectedCompanyCode(value || '')}
              allowClear
              style={{ width: '100%' }}
              options={companyNames.map(name => ({ label: name, value: name }))}
            />
          </Col>
          <Col style={{ width: 150 }}>
            <Select
              placeholder="二段階認証判定"
              value={selectedIsEntry || undefined}
              onChange={(value) => setSelectedIsEntry(value ?? '')}
              allowClear
              style={{ width: '100%' }}
              options={[
                { label: 'なし', value: '0' },
                { label: 'あり', value: '1' },
              ]}
            />
          </Col>
          <Col style={{ width: 174 }}>
            <Select
              placeholder="みなし進捗使用フラグ"
              value={selectedUseDeemedProgress || undefined}
              onChange={(value) => setSelectedUseDeemedProgress(value ?? '')}
              allowClear
              style={{ width: '100%' }}
              options={[
                { label: 'あり', value: 'true' },
                { label: 'なし', value: 'false' },
              ]}
            />
          </Col>
        </Row>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredOrganizations}
          rowKey="organizationId"
          size="small"
          loading={loading}
          scroll={{ x: 1540 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `全 ${total} 件`,
          }}
          rowClassName={(record) => (!record.isActive ? 'inactive-row' : '')}
        />
      </div>

      <Modal
        title={editingOrg ? '組織編集' : '組織追加'}
        forceRender
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText="保存"
        cancelText="キャンセル"
      >
        <Form form={form} layout="vertical">
          {editingOrg ? (
            // 編集モーダル: 組織CDは編集不可
            <>
              <Form.Item
                name="organizationCd"
                label="組織CD"
                rules={[{ required: true, message: '組織CDを入力してください' }]}
              >
                <Input placeholder="maiml_lab_001" disabled />
              </Form.Item>

              <Form.Item
                name="organizationDisplayName"
                label="組織表示名"
                rules={[{ required: true, message: '組織表示名を入力してください' }]}
              >
                <Input placeholder="MAIML研究所" />
              </Form.Item>

              <Form.Item
                name="organizationEmail"
                label="組織e-mail"
                rules={[{ required: true, message: '組織e-mailを入力してください' }]}
              >
                <Input placeholder="sample@sample.co.jp" />
              </Form.Item>

              <Form.Item
                name="chiefUserId"
                label="代表システム管理者"
                rules={[{ required: true, message: '代表システム管理者を選択してください' }]}
              >
                <Select
                  options={systemAdminOptions}
                  placeholder="代表システム管理者を選択してください"
                  showSearch
                  filterOption={(input, option) => {
                    if (!option?.label) return false;
                    return option.label.toLowerCase().includes(input.toLowerCase());
                  }}
                />
              </Form.Item>

              <Form.Item name="corporationId" label="会社名">
                <Select
                  options={companyOptions}
                  placeholder="会社名を選択してください"
                  showSearch
                  filterOption={(input, option) => {
                    if (!option?.label) return false;
                    return option.label.toLowerCase().includes(input.toLowerCase());
                  }}
                />
              </Form.Item>

              <Form.Item
                name="isEntry"
                label="二段階認証判定"
                rules={[{ required: true, message: '二段階認証判定を選択してください' }]}
              >
                <Select
                  placeholder="二段階認証判定を選択してください"
                  options={[
                    { value: 0, label: 'なし' },
                    { value: 1, label: 'あり' },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="useDeemedProgress"
                label="みなし進捗使用フラグ"
                rules={[{ required: true, message: 'みなし進捗使用フラグを選択してください' }]}
              >
                <Select
                  placeholder="みなし進捗使用フラグを選択してください"
                  options={[
                    { value: true, label: 'あり' },
                    { value: false, label: 'なし' },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="isActive"
                label="状態"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: true, label: 'アクティブ' },
                    { value: false, label: '非アクティブ' },
                  ]}
                />
              </Form.Item>
            </>
          ) : (
            // 追加モーダル: 組織CDは編集可能
            <>
              <Divider>組織情報</Divider>

              <Form.Item
                name="organizationCd"
                label="組織CD"
                rules={[{ required: true, message: '組織CDを入力してください' }]}
              >
                <Input
                  placeholder="maiml_lab_001"
                  onChange={(e) => setOrganizationCdValue(e.target.value)}
                />
              </Form.Item>

              <Form.Item
                name="organizationDisplayName"
                label="組織表示名"
                rules={[{ required: true, message: '組織表示名を入力してください' }]}
              >
                <Input placeholder="MAIML研究所" />
              </Form.Item>

              <Form.Item
                name="organizationEmail"
                label="組織e-mail"
                rules={[{ required: true, message: '組織e-mailを入力してください' }]}
              >
                <Input placeholder="sample@sample.co.jp" />
              </Form.Item>

              <Form.Item name="corporationId" label="会社名">
                <Select
                  options={companyOptions}
                  placeholder="会社名を選択してください"
                  showSearch
                  filterOption={(input, option) => {
                    if (!option?.label) return false;
                    return option.label.toLowerCase().includes(input.toLowerCase());
                  }}
                />
              </Form.Item>

              <Form.Item
                name="isEntry"
                label="二段階認証判定"
                rules={[{ required: true, message: '二段階認証判定を選択してください' }]}
              >
                <Select
                  placeholder="なし"
                  options={[
                    { value: 0, label: 'なし' },
                    { value: 1, label: 'あり' },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="useDeemedProgress"
                label="みなし進捗使用フラグ"
                rules={[{ required: true, message: 'みなし進捗使用フラグを選択してください' }]}
              >
                <Select
                  placeholder="あり"
                  options={[
                    { value: true, label: 'あり' },
                    { value: false, label: 'なし' },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="isActive"
                label="状態"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: true, label: 'アクティブ' },
                    { value: false, label: '非アクティブ' },
                  ]}
                />
              </Form.Item>

              <Divider>代表者情報</Divider>

              <Form.Item
                name="chiefUserName"
                label="代表システム管理者"
                rules={[{ required: true, message: '代表システム管理者を入力してください' }]}
              >
                <Input placeholder="サンプル　太郎" autoComplete="off" />
              </Form.Item>

              <Form.Item
                name="chiefUserEmail"
                label="代表者メールアドレス"
                rules={[{ required: true, message: '代表者メールアドレスを入力してください' }]}
              >
                <Input placeholder="sample@sample.co.jp" autoComplete="off" />
              </Form.Item>

            </>
          )}
        </Form>
      </Modal>

      <style jsx global>{`
        .inactive-row td {
          background-color: #d3d3d3 !important;
        }
        .inactive-row:hover td {
          background-color: #c0c0c0 !important;
        }
      `}</style>
    </div>
  );
}