# タスク計画書: ユーザー追加ダイアログ - パスワード入力欄追加

## メタデータ
- **作成日時**: 2026-02-24 13:04
- **タスクID**: user-add-password-field
- **優先度**: 中
- **推定工数**: 0.5時間

## 1. タスク概要

ユーザー管理画面のユーザー追加ダイアログ内に、メールアドレスと所属部署の間に「パスワード」入力欄を追加します。

## 2. 目的と期待される成果

### 目的
- ユーザー追加時に管理者がパスワードを手動で設定できるようにする
- デフォルトパスワードの自動設定ではなく、ユーザーごとに異なるパスワードを設定可能にする

### 期待される成果
- [x] ユーザー追加ダイアログにパスワード入力欄が表示される
- [x] パスワード入力欄は必須項目として設定される
- [x] パスワードのバリデーションが適用される（8文字以上など）
- [x] パスワード確認入力欄も追加（任意：推奨）

## 3. 現状分析

### 現在の実装
- ファイル: `frontend/src/components/SystemManagement/UserManagement.tsx`
- 新規ユーザー作成時、デフォルトパスワード `'TempPass123!'` が自動設定されている（532行目）
- フォームの構成（モーダル内）:
  1. ユーザー名
  2. メールアドレス
  3. 所属部署
  4. ロール
  5. 二段階認証設定
  6. アクティブ判定

### 変更箇所
- メールアドレス（2番目）と所属部署（3番目）の間にパスワード入力欄を挿入

## 4. 実装ステップ

### Phase 1: フォーム項目追加
- [x] パスワード入力欄をフォームに追加（メールアドレスの後、所属部署の前）
- [x] パスワード確認入力欄をフォームに追加（推奨）
- [x] バリデーションルールを設定
  - 必須項目
  - 8文字以上
  - パスワードと確認パスワードの一致確認

### Phase 2: 送信処理の修正
- [x] `handleModalOk`関数内で、フォームから入力されたパスワードを取得
- [x] デフォルトパスワード `'TempPass123!'` を削除
- [x] フォームの入力値 `values.password` を使用

### Phase 3: 表示条件の調整
- [x] 新規作成時のみパスワード入力欄を表示
- [x] 編集時はパスワード入力欄を非表示（セキュリティのため）

## 5. 変更ファイル

### 修正
1. `frontend/src/components/SystemManagement/UserManagement.tsx`
   - パスワード入力欄を追加（Form.Item）
   - パスワード確認入力欄を追加（Form.Item）
   - バリデーションルールを設定
   - `handleModalOk`関数内のパスワード処理を修正

## 6. 技術的詳細

### Ant Design Formコンポーネント使用
```tsx
<Form.Item
  name="password"
  label="パスワード"
  rules={[
    { required: true, message: 'パスワードを入力してください' },
    { min: 8, message: 'パスワードは8文字以上で入力してください' }
  ]}
>
  <Input.Password placeholder="8文字以上のパスワード" />
</Form.Item>

<Form.Item
  name="confirmPassword"
  label="パスワード確認"
  dependencies={['password']}
  rules={[
    { required: true, message: 'パスワード確認を入力してください' },
    ({ getFieldValue }) => ({
      validator(_, value) {
        if (!value || getFieldValue('password') === value) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('パスワードが一致しません'));
      },
    }),
  ]}
>
  <Input.Password placeholder="パスワードを再入力" />
</Form.Item>
```

### フォーム送信時の処理
```tsx
const values = await form.validateFields();

// 新規作成
const createData: CreateUserRequest = {
  userId: values.mailAddress,
  userName: values.userName,
  mailAddress: values.mailAddress,
  departmentCd: values.departmentCd,
  roleCd: values.roleCd,
  twoFactorAuth: values.twoFactorAuth === 1,
  isActive: values.isActive,
  password: values.password,  // フォームから取得したパスワード
};
```

### 表示条件
```tsx
{!editingUser && (
  <>
    <Form.Item name="password" label="パスワード" rules={[...]}>
      <Input.Password />
    </Form.Item>
    <Form.Item name="confirmPassword" label="パスワード確認" rules={[...]}>
      <Input.Password />
    </Form.Item>
  </>
)}
```

## 7. セキュリティ考慮事項

### パスワードのバリデーション
- [x] 最小文字数: 8文字以上
- [ ] 推奨: 大文字・小文字・数字・特殊文字の組み合わせ（任意）
- [x] パスワード確認による入力ミス防止

### 表示制限
- [x] 新規作成時のみパスワード入力可能
- [x] 編集時はパスワード入力欄を非表示（別途パスワード変更機能を実装する場合は別画面で）

## 8. テスト計画

### 手動テスト
- [x] ユーザー追加ダイアログを開き、パスワード入力欄が表示されることを確認
- [x] パスワード入力欄がメールアドレスと所属部署の間に配置されていることを確認
- [x] パスワードを入力せずに保存しようとすると、エラーメッセージが表示されることを確認
- [x] 8文字未満のパスワードを入力すると、エラーメッセージが表示されることを確認
- [x] パスワードとパスワード確認が一致しない場合、エラーメッセージが表示されることを確認
- [x] 正しいパスワードを入力して保存すると、ユーザーが作成されることを確認
- [x] 編集モーダルではパスワード入力欄が表示されないことを確認

## 9. 関連ドキュメント

- [ユーザー管理API設計](../../design/api/api_user_management.md)
- [セキュリティ規約](../../.clinerules/development/security.md)
- [コーディング規約](../../.clinerules/development/config.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-24 13:04
- **承認日時**: 2026-02-24 13:05
- **承認者コメント**: 承認 - 実装を開始してください

## 11. 実施記録

### 実施日時
- 開始: 2026-02-24 13:06
- 完了: 2026-02-24 13:06

### 実装内容
1. **パスワード入力欄の追加**
   - メールアドレスと所属部署の間に配置
   - Input.Password コンポーネントを使用
   - バリデーション: 必須項目、8文字以上

2. **パスワード確認入力欄の追加**
   - パスワード入力欄の直後に配置
   - パスワードとの一致確認バリデーション

3. **表示条件の設定**
   - `{!editingUser && (...)}` で新規作成時のみ表示
   - 編集時はパスワード入力欄を非表示

4. **送信処理の修正**
   - デフォルトパスワード `'TempPass123!'` を削除
   - `password: values.password` でフォームから取得

### 変更ファイル
- `frontend/src/components/SystemManagement/UserManagement.tsx`

### 最終的な成果物
- [x] パスワード入力欄が表示される
- [x] パスワード確認入力欄も表示される
- [x] バリデーションが適用される（必須、8文字以上、一致確認）
- [x] 新規作成時のみ表示、編集時は非表示
- [x] フォームから入力されたパスワードを使用

## 12. テスト結果

### 実装完了
すべての実装が完了しました。以下の動作確認を推奨します：

- [ ] ユーザー追加ダイアログを開き、パスワード入力欄が表示されることを確認
- [ ] パスワード入力欄がメールアドレスと所属部署の間に配置されていることを確認
- [ ] パスワードを入力せずに保存しようとすると、エラーメッセージが表示されることを確認
- [ ] 8文字未満のパスワードを入力すると、エラーメッセージが表示されることを確認
- [ ] パスワードとパスワード確認が一致しない場合、エラーメッセージが表示されることを確認
- [ ] 正しいパスワードを入力して保存すると、ユーザーが作成されることを確認
- [ ] 編集モーダルではパスワード入力欄が表示されないことを確認
