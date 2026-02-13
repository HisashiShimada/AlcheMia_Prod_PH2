# TemplateEditorDialog Place参照ボタン非活性問題 修正計画書

## メタデータ
- **作成日時**: 2026-01-29 09:23
- **タスクID**: template_editor_place_ref_fix
- **優先度**: 高
- **推定工数**: 30分

## 1. 問題の特定

### 現象
- Place参照ボタンが非活性になってしまっている（名前空間ボタンではない）
- フォーマット管理から遷移した場合、PlaceReferencesセクションが表示されない

### 原因分析

**Reference版の構造**（正しい実装）:
```jsx
// 基本情報セクション（常に表示）
<Box sx={{ mb: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
  <Typography variant="h6">📋 基本情報</Typography>
  
  {/* テンプレートID */}
  <Box sx={{ mb: 2 }}>...</Box>
  
  {/* UUID */}
  <Box sx={{ mb: 2 }}>...</Box>
  
  {/* Name */}
  <Box sx={{ mb: 2 }}>...</Box>
  
  {/* Description */}
  <Box sx={{ mb: 2 }}>...</Box>
  
  {/* ✅ Place References - 基本情報セクション内に常に配置 */}
  <Box>
    <Divider sx={{ my: 2 }} />
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <Typography variant="h6">🔗 Place References</Typography>
      <Button onClick={() => setShowPlaceRefAddDialog(true)}>追加</Button>
    </Box>
    {/* Place Referencesリスト */}
  </Box>
  
  {/* Insertion（MaterialTemplate・ResultTemplateの場合） */}
  {(node.data.placeType === 'material' || node.data.placeType === 'result') && (
    <Box>...</Box>
  )}
</Box>
```

**現在の実装**（問題あり）:
```tsx
{/* 基本情報セクション - showBasicInfoで制御 */}
{showBasicInfo && (
  <Box>
    {/* UUID, Template ID, MaiML ID, Name, Description, Insertion */}
  </Box>
)}

{/* ❌ PlaceReferencesセクション - showBasicInfoで制御されている */}
{showBasicInfo && (
  <Box>
    <Typography>📍 PlaceReferences</Typography>
    <Button disabled={availablePlaces.length === 0}>Place参照を追加</Button>
  </Box>
)}
```

**問題点**:
1. PlaceReferencesが独立したセクションになっている
2. `showBasicInfo`による制御で、フォーマット管理から遷移時（`sourceContext === 'format'`）に非表示になる
3. Reference版では基本情報セクション内に常に配置されている

### 表示順序の差異

**Reference版の順序**（正しい）:
1. テンプレートID
2. UUID
3. Name
4. Description
5. **Place References**（基本情報セクション内）
6. Insertion（MaterialTemplate・ResultTemplateの場合）

**現在の実装の順序**（不適切）:
1. UUID
2. Template ID
3. MaiML ID
4. Name
5. Description
6. Insertion
7. **Place References**（別セクション、showBasicInfoで制御）

## 2. 修正方針

### Phase 1: showBasicInfo制御の完全削除
- `showBasicInfo`変数とその計算ロジックを削除
- 基本情報セクションを常に表示（Reference版と同じ）
- `sourceContext`による条件分岐を削除

### Phase 2: PlaceReferencesセクションの再配置
- PlaceReferencesを基本情報セクション内に移動
- 常に表示されるようにする

### Phase 3: 表示順序の修正
Reference版に合わせて以下の順序に変更：
1. Template ID
2. UUID
3. MaiML ID（既存の拡張機能として保持）
4. Name
5. Description
6. **Place References**（基本情報セクション内）
7. Insertion（条件付き）

## 3. 実装ステップ

### Step 1: showBasicInfo制御の削除
- [ ] `showBasicInfo`変数の定義を削除
- [ ] `sourceContext !== 'format'`の計算ロジックを削除
- [ ] `{showBasicInfo && (...)}` の条件分岐を削除
- [ ] 基本情報セクションを常に表示するように変更

### Step 2: 表示順序の変更
- [ ] Template IDを先頭に移動
- [ ] UUID を2番目に配置
- [ ] MaiML IDを3番目に配置（Reference版にはない独自機能）
- [ ] Name、Descriptionの順序を維持

### Step 3: PlaceReferencesの再配置
- [ ] 独立したセクションを削除
- [ ] 基本情報セクション内のDescription後、Insertion前に配置
- [ ] Dividerで区切りを明示

## 4. 修正コード

### 修正前の構造
```tsx
// showBasicInfo変数の定義
const showBasicInfo = sourceContext !== 'format';

{/* 基本情報 - showBasicInfoで制御 */}
{showBasicInfo && (
  <div>
    {/* UUID, Template ID, MaiML ID, Name, Description, Insertion */}
  </div>
)}

{/* PlaceReferences - 別セクション、showBasicInfoで制御 */}
{showBasicInfo && (
  <div>
    <Typography>📍 PlaceReferences</Typography>
  </div>
)}
```

### 修正後の構造（Reference版準拠）
```tsx
// showBasicInfo変数を削除

{/* 基本情報（PlaceReferences含む） - 常に表示 */}
<div>
  {/* 1. Template ID */}
  {/* 2. UUID */}
  {/* 3. MaiML ID */}
  {/* 4. Name */}
  {/* 5. Description */}
  
  <Divider />
  
  {/* 6. Place References - 基本情報セクション内 */}
  <div>
    <Typography>📍 PlaceReferences</Typography>
    <Button disabled={availablePlaces.length === 0}>
      Place参照を追加
    </Button>
  </div>
  
  {/* 7. Insertion */}
  {(node.data.placeType === 'material' || node.data.placeType === 'result') && (
    <div>...</div>
  )}
</div>
```

## 5. 期待される結果

### ✅ 修正後の動作
- 基本情報セクションが常に表示される（Reference版と同じ）
- PlaceReferencesセクションが基本情報セクション内に表示される
- フォーマット管理から遷移した場合も基本情報セクションが表示される
- Place参照追加ボタンが適切に活性化される
- 表示順序がReference版と一致する

### ✅ 影響範囲
- TemplateEditorDialog.tsxのみ
- `sourceContext`の値に関わらず、常に基本情報を表示
- Reference版との完全な一致を実現

## 6. テスト計画

### テストケース1: プロジェクト管理から遷移
- [ ] 基本情報セクションが表示される
- [ ] PlaceReferencesセクションが表示される
- [ ] Place参照追加ボタンが活性化される
- [ ] availablePlacesが正しく計算される

### テストケース2: フォーマット管理から遷移
- [ ] 基本情報セクションが表示される（Reference版と同じ）
- [ ] PlaceReferencesも表示される
- [ ] すべての編集機能が正常に動作する

### テストケース3: 表示順序
- [ ] Template ID → UUID → MaiML ID → Name → Description → Place References → Insertionの順序で表示される

## 7. 補足事項

### Reference版との完全な一致
- Reference版ではMaiML IDフィールドは存在しない
- 現在の実装ではMaiML IDを独自拡張として保持
- 表示順序はReference版のテンプレートID・UUIDの後にMaiML IDを挿入
- showBasicInfo制御を削除することで、Reference版と完全に一致

### sourceContextの扱い
- `sourceContext`変数は残すが、表示制御には使用しない
- 必要に応じて他のロジック（保存処理など）で活用可能

## 8. 実装完了条件

- [ ] `showBasicInfo`変数とその制御ロジックが完全に削除されている
- [ ] 基本情報セクションが常に表示される
- [ ] PlaceReferencesが基本情報セクション内に配置されている
- [ ] 表示順序がReference版に一致している（MaiML ID除く）
- [ ] Place参照追加ボタンが適切に活性化される
- [ ] フォーマット管理からの遷移でも正常に動作する
- [ ] すべてのテストケースが成功している
