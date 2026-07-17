/**
 * バックエンド多言語メッセージ定義
 *
 * プロバイダーメニュー / システム管理者メニュー / データ管理者メニューで使用する
 * エラーメッセージ・バリデーションメッセージの日英対応
 */

type Messages = {
  corporation: {
    duplicateName: string;
    duplicateNameOnUpdate: string;
    csv: {
      nameRequired: string;
      isActiveInvalid: string;
      nameDuplicateInCsv: string;
      nameAlreadyExists: string;
    };
  };
  organization: {
    duplicateId: string;
    duplicateCd: string;
    csv: {
      cdRequired: string;
      displayNameRequired: string;
      emailRequired: string;
      chiefUserNameRequired: string;
      chiefUserEmailRequired: string;
      isEntryInvalid: string;
      useDeemedProgressInvalid: string;
      isActiveInvalid: string;
      cdDuplicateInCsv: string;
      cdAlreadyExists: string;
      corporationNotFound: string;
      contractCapacityNotNumber: string;
      contractUsersNotNumber: string;
      contractProjectsNotNumber: string;
    };
  };
  organizationGroup: {
    duplicateCd: string;
    csv: {
      cdRequired: string;
      nameRequired: string;
      isActiveInvalid: string;
      cdDuplicateInCsv: string;
      cdAlreadyExists: string;
    };
  };
  role: {
    csv: {
      parseError: string;
      emptyData: string;
      cdRequired: string;
      isActiveInvalid: string;
      roleNameMismatch: string;
      initialScreenNotInRole: string;
      validationError: string;
      alreadyExists: string;
      transactionError: string;
    };
  };
  user: {
    duplicateUserId: string;
    csv: {
      userNameRequired: string;
      mailAddressRequired: string;
      roleCdRequired: string;
      mailAddressInvalid: string;
      isActiveInvalid: string;
      mailAddressDuplicateInCsv: string;
      mailAddressAlreadyExists: string;
    };
  };
  master: {
    duplicateCreatorId: string;
    duplicateInstrumentId: string;
    duplicateVendorId: string;
    csv: {
      creatorIdRequired: string;
      creatorNameRequired: string;
      creatorIsActiveInvalid: string;
      creatorAlreadyExists: string;
      instrumentIdRequired: string;
      instrumentNameRequired: string;
      instrumentIsActiveInvalid: string;
      instrumentAlreadyExists: string;
      vendorIdRequired: string;
      vendorNameRequired: string;
      vendorIsActiveInvalid: string;
      vendorAlreadyExists: string;
    };
  };
};

const ja: Messages = {
  corporation: {
    duplicateName: 'この会社名は既に使用されています',
    duplicateNameOnUpdate: '入力された会社名は既に存在しています',
    csv: {
      nameRequired: '{row}行目: corporation_nameは必須です',
      isActiveInvalid: '{row}行目: is_activeは true/false/1/0 のいずれかである必要があります',
      nameDuplicateInCsv: '{row}行目: corporation_name「{name}」はCSV内で重複しています',
      nameAlreadyExists: '{row}行目: corporation_name「{name}」は既に存在します',
    },
  },
  organization: {
    duplicateId: '入力されたIDは既に存在しています',
    duplicateCd: '入力された組織CDは既に存在しています',
    csv: {
      cdRequired: '{row}行目: 組織CDは必須です',
      displayNameRequired: '{row}行目: 組織表示名は必須です',
      emailRequired: '{row}行目: 組織e-mailは必須です',
      chiefUserNameRequired: '{row}行目: 代表システム管理者は必須です',
      chiefUserEmailRequired: '{row}行目: 代表者メールアドレスは必須です',
      isEntryInvalid: '{row}行目: is_entryは0または1である必要があります',
      useDeemedProgressInvalid: '{row}行目: use_deemed_progressは true/false/1/0 のいずれかである必要があります',
      isActiveInvalid: '{row}行目: is_activeは true/false/1/0 のいずれかである必要があります',
      cdDuplicateInCsv: '{row}行目: 組織CD「{cd}」はCSV内で重複しています',
      cdAlreadyExists: '{row}行目: 組織CD「{cd}」は既に存在します',
      corporationNotFound: '{row}行目: 会社名「{name}」は登録されていません',
      contractCapacityNotNumber: '{row}行目: contract_capacityは数値で入力してください',
      contractUsersNotNumber: '{row}行目: contract_usersは数値で入力してください',
      contractProjectsNotNumber: '{row}行目: contract_projectsは数値で入力してください',
    },
  },
  organizationGroup: {
    duplicateCd: '入力されたIDは既に存在しています',
    csv: {
      cdRequired: '{row}行目: organization_group_cdは必須です',
      nameRequired: '{row}行目: organization_group_nameは必須です',
      isActiveInvalid: '{row}行目: is_activeは true/false/1/0 のいずれかである必要があります',
      cdDuplicateInCsv: '{row}行目: organization_group_cd「{cd}」はCSV内で重複しています',
      cdAlreadyExists: '{row}行目: organization_group_cd「{cd}」は既に存在します',
    },
  },
  role: {
    csv: {
      parseError: 'CSVファイルの形式が不正です',
      emptyData: 'CSVファイルにデータが含まれていません',
      cdRequired: '{row}行目: role_cdは必須です',
      isActiveInvalid: '{row}行目: is_activeは true/false/1/0 のいずれかである必要があります',
      roleNameMismatch: '{row}行目: role_cd「{roleCd}」のrole_nameが統一されていません（「{existing}」と「{newName}」）',
      initialScreenNotInRole: '{row}行目: initial_screen_function_cd「{screen}」が、role_cd「{roleCd}」のいずれのfunction_cdにも含まれていません',
      validationError: 'CSVファイルのバリデーションエラー',
      alreadyExists: 'role_cd「{roleCd}」は既に存在します',
      transactionError: 'ロールCSVアップロード処理中にエラーが発生しました',
    },
  },
  user: {
    duplicateUserId: 'このユーザーIDは既に使用されています',
    csv: {
      userNameRequired: '{row}行目: ユーザー名は必須です',
      mailAddressRequired: '{row}行目: メールアドレスは必須です',
      roleCdRequired: '{row}行目: ロールは必須です',
      mailAddressInvalid: '{row}行目: メールアドレスの形式が不正です',
      isActiveInvalid: '{row}行目: アクティブ判定は true/false/1/0 のいずれかである必要があります',
      mailAddressDuplicateInCsv: '{row}行目: メールアドレス「{mail}」はCSV内で重複しています',
      mailAddressAlreadyExists: '{row}行目: メールアドレス「{mail}」は既に存在します',
    },
  },
  master: {
    duplicateCreatorId: '入力されたIDは既に存在しています',
    duplicateInstrumentId: '入力されたIDは既に存在しています',
    duplicateVendorId: '入力されたIDは既に存在しています',
    csv: {
      creatorIdRequired: 'creator_idは必須です',
      creatorNameRequired: 'creator_nameは必須です',
      creatorIsActiveInvalid: 'is_activeの値が不正です。true、false、1、0のいずれかを指定してください（実際の値: {value}）',
      creatorAlreadyExists: 'creator_id: {id} は既に存在します。既存レコードの編集は一覧から行ってください。',
      instrumentIdRequired: 'instrument_idは必須です',
      instrumentNameRequired: 'instrument_nameは必須です',
      instrumentIsActiveInvalid: 'is_activeの値が不正です。true、false、1、0のいずれかを指定してください（実際の値: {value}）',
      instrumentAlreadyExists: 'instrument_id: {id} は既に存在します。既存レコードの編集は一覧から行ってください。',
      vendorIdRequired: 'vendor_idは必須です',
      vendorNameRequired: 'vendor_nameは必須です',
      vendorIsActiveInvalid: 'is_activeの値が不正です。true、false、1、0のいずれかを指定してください（実際の値: {value}）',
      vendorAlreadyExists: 'vendor_id: {id} は既に存在します。既存レコードの編集は一覧から行ってください。',
    },
  },
};

const en: Messages = {
  corporation: {
    duplicateName: 'This corporation name is already in use',
    duplicateNameOnUpdate: 'The entered corporation name already exists',
    csv: {
      nameRequired: 'Row {row}: corporation_name is required',
      isActiveInvalid: 'Row {row}: is_active must be one of true/false/1/0',
      nameDuplicateInCsv: 'Row {row}: corporation_name "{name}" is duplicated within the CSV',
      nameAlreadyExists: 'Row {row}: corporation_name "{name}" already exists',
    },
  },
  organization: {
    duplicateId: 'The entered ID already exists',
    duplicateCd: 'The entered organization CD already exists',
    csv: {
      cdRequired: 'Row {row}: Organization CD is required',
      displayNameRequired: 'Row {row}: Organization display name is required',
      emailRequired: 'Row {row}: Organization e-mail is required',
      chiefUserNameRequired: 'Row {row}: Chief system administrator is required',
      chiefUserEmailRequired: 'Row {row}: Chief user email address is required',
      isEntryInvalid: 'Row {row}: is_entry must be 0 or 1',
      useDeemedProgressInvalid: 'Row {row}: use_deemed_progress must be one of true/false/1/0',
      isActiveInvalid: 'Row {row}: is_active must be one of true/false/1/0',
      cdDuplicateInCsv: 'Row {row}: Organization CD "{cd}" is duplicated within the CSV',
      cdAlreadyExists: 'Row {row}: Organization CD "{cd}" already exists',
      corporationNotFound: 'Row {row}: Corporation name "{name}" is not registered',
      contractCapacityNotNumber: 'Row {row}: contract_capacity must be a number',
      contractUsersNotNumber: 'Row {row}: contract_users must be a number',
      contractProjectsNotNumber: 'Row {row}: contract_projects must be a number',
    },
  },
  organizationGroup: {
    duplicateCd: 'The entered ID already exists',
    csv: {
      cdRequired: 'Row {row}: organization_group_cd is required',
      nameRequired: 'Row {row}: organization_group_name is required',
      isActiveInvalid: 'Row {row}: is_active must be one of true/false/1/0',
      cdDuplicateInCsv: 'Row {row}: organization_group_cd "{cd}" is duplicated within the CSV',
      cdAlreadyExists: 'Row {row}: organization_group_cd "{cd}" already exists',
    },
  },
  role: {
    csv: {
      parseError: 'The CSV file format is invalid',
      emptyData: 'The CSV file contains no data',
      cdRequired: 'Row {row}: role_cd is required',
      isActiveInvalid: 'Row {row}: is_active must be one of true/false/1/0',
      roleNameMismatch: 'Row {row}: role_name for role_cd "{roleCd}" is inconsistent ("{existing}" vs "{newName}")',
      initialScreenNotInRole: 'Row {row}: initial_screen_function_cd "{screen}" is not included in any function_cd of role_cd "{roleCd}"',
      validationError: 'CSV file validation error',
      alreadyExists: 'role_cd "{roleCd}" already exists',
      transactionError: 'An error occurred during role CSV upload processing',
    },
  },
  user: {
    duplicateUserId: 'This user ID is already in use',
    csv: {
      userNameRequired: 'Row {row}: User name is required',
      mailAddressRequired: 'Row {row}: Email address is required',
      roleCdRequired: 'Row {row}: Role is required',
      mailAddressInvalid: 'Row {row}: Email address format is invalid',
      isActiveInvalid: 'Row {row}: Active flag must be one of true/false/1/0',
      mailAddressDuplicateInCsv: 'Row {row}: Email address "{mail}" is duplicated within the CSV',
      mailAddressAlreadyExists: 'Row {row}: Email address "{mail}" already exists',
    },
  },
  master: {
    duplicateCreatorId: 'The entered ID already exists',
    duplicateInstrumentId: 'The entered ID already exists',
    duplicateVendorId: 'The entered ID already exists',
    csv: {
      creatorIdRequired: 'creator_id is required',
      creatorNameRequired: 'creator_name is required',
      creatorIsActiveInvalid: 'Invalid value for is_active. Specify one of true, false, 1, or 0 (actual value: {value})',
      creatorAlreadyExists: 'creator_id: {id} already exists. Please edit existing records from the list.',
      instrumentIdRequired: 'instrument_id is required',
      instrumentNameRequired: 'instrument_name is required',
      instrumentIsActiveInvalid: 'Invalid value for is_active. Specify one of true, false, 1, or 0 (actual value: {value})',
      instrumentAlreadyExists: 'instrument_id: {id} already exists. Please edit existing records from the list.',
      vendorIdRequired: 'vendor_id is required',
      vendorNameRequired: 'vendor_name is required',
      vendorIsActiveInvalid: 'Invalid value for is_active. Specify one of true, false, 1, or 0 (actual value: {value})',
      vendorAlreadyExists: 'vendor_id: {id} already exists. Please edit existing records from the list.',
    },
  },
};

const messageMap: Record<string, Messages> = { ja, en };

/**
 * ネストされたオブジェクトからドット区切りキーで値を取得するヘルパー
 */
function getNestedValue(obj: any, keys: string[]): string | undefined {
  let current = obj;
  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * 言語コードとキーでメッセージを取得する
 *
 * @param lang 言語コード ('ja' | 'en'、デフォルト: 'ja')
 * @param key ドット区切りのメッセージキー（例: 'corporation.duplicateName'）
 * @param params プレースホルダー置換用パラメータ（例: { row: '3', name: 'ABC Corp' }）
 * @returns 対応するメッセージ文字列
 */
export function getMessage(
  lang: string,
  key: string,
  params?: Record<string, string>
): string {
  const messages = messageMap[lang] ?? messageMap['ja'];
  const keys = key.split('.');
  let message = getNestedValue(messages, keys);

  // 見つからなければ日本語にフォールバック
  if (message === undefined) {
    message = getNestedValue(messageMap['ja'], keys) ?? key;
  }

  // プレースホルダー置換
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      message = message.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }

  return message;
}
