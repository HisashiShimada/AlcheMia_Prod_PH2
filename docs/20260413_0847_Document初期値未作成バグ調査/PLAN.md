# 調査レポート: Document初期値が作成されないバグ

- **作成日時**: 2026-04-13 08:47
- **タスクID**: Document初期値未作成バグ調査
- **種類**: バグ調査

---

## 1. 調査対象

| ファイル | 役割 |
|---|---|
| `frontend/src/components/project/ProjectManagement.tsx` | 新規プロジェクト作成・編集画面遷移 |
| `frontend/src/components/editorv2/PetriNetEditorScreen.tsx` | エディタ画面ラッパー（S3からMAIML読み込み） |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | エディタ本体（Document初期値作成ロジックを保持） |
| `frontend/src/utils/documentInitializer.ts` | DocumentData / MethodData の初期値生成ユーティリティ |
| `frontend/src/services/fileAccessService.ts` | S3/Swift からファイルテキストを取得するサービス |
| `frontend/src/utils/sessionStorageHelper.ts` | sessionStorage からユーザー情報を取得するユーティリティ |

---

## 2. 正常時のコードの流れ

```
ProjectManagement
  └── handleEditButtonClick()
        └── MaimlEditorParams {
              sourceS3Key: "{orgId}/projects/{name}/{name}.maiml",
              documentId: selectedProject.id,
              editingFileName: "{name}.maiml",
              ...
            }
        └── onEdit?.(params)  ← PetriNetEditorScreen を開く

PetriNetEditorScreen
  └── useEffect([sourceS3Key]) → loadMaimlData()
        └── getFileContentAsText(sourceS3Key)
              ├── ファイルあり  → maimlContent = "<maiml>...</maiml>"
              └── ファイルなし（新規）→ throws → catch → maimlContent = null
  └── <PetriNetEditorInner maimlData={maimlContent} ... />

PetriNetEditorInner (fetchPetriNetData useEffect, 依存配列: [maimlData])
  ├── !maimlData (null) のとき → 新規作成モード
  │     └── generateInitialDocumentData(editingFileName, { documentId, description })
  │           └── setDocumentData(initialDocumentData)  ← ✅ Document初期値作成
  │     └── generateInitialMethod(initialDocumentData.methodId)
  │           └── setMethods([initialMethod])
  │
  └── maimlData あり のとき → パース・変換
        └── setDocumentData(extractedDoc)               ← ✅ Document初期値作成
```

---

## 3. 実際のエラー（ネットワーク確認済み）

開発者ツールのネットワークで以下のレスポンスが確認された：

```json
{
    "success": false,
    "error": {
        "code": "E6001",
        "message": "ファイルが見つかりません: /projects/test_ito_project/test_ito_project.maiml"
    }
}
```

**注目点：** パスが `/projects/test_ito_project/test_ito_project.maiml`  
正常なパスは `{orgId}/projects/test_ito_project/test_ito_project.maiml` のはず → **orgId が空文字**

---

## 4. バグの発生条件（3パターン）

---

### 【確定・主要】パターン0: `sessionStorage` に `userInfo` がなく orgId が空になる

#### 発生メカニズム

`ProjectManagement.tsx` の `handleEditButtonClick()` が `getUserInfo()` で組織IDを取得している：

```typescript
// ProjectManagement.tsx L789
const userInfo = getUserInfo();                          // ← sessionStorageHelper の getUserInfo()
const orgId = userInfo?.organizationId ?? '';            // sessionStorage になければ '' になる
const sourceS3Key = `${orgId}/projects/${selectedProject.name}/${selectedProject.name}.maiml`;
//                  ↑ orgId='' → `/projects/test_ito_project/test_ito_project.maiml`（先頭の orgId が消える）
```

`getUserInfo()` (sessionStorageHelper.ts L19) は **sessionStorage** を参照：
```typescript
const userJson = sessionStorage.getItem(SESSION_STORAGE_KEYS.USER);
```

しかし `getLoginUserInfo()` (documentInitializer.ts L21) は **localStorage** を参照：
```typescript
const userInfoStr = localStorage.getItem('userInfo');
```

**参照先が sessionStorage と localStorage に分かれており**、環境によってどちらかが空になる。

#### 発生する状況の例

| 状況 | sessionStorage | localStorage |
|---|---|---|
| 通常のログイン後 | ✅ あり | ✅ あり |
| 別タブで開いた場合 | ❌ なし（タブ間非共有） | ✅ あり |
| ページを F5 リロードした場合 | 環境依存 | ✅ あり |
| 一部の SSO/認証フロー | ❌ なし | ✅ あり |

#### エラーの流れ

```
1. getUserInfo() → null（sessionStorage にない）
2. orgId = '' 
3. sourceS3Key = "/projects/test_ito_project/test_ito_project.maiml"  ← orgId なし
4. getFileContentAsText("/projects/...") → Backend に送信
5. Backend: E6001 "ファイルが見つかりません: /projects/..."  ← 404 を返す
6. getFileContentAsText が AxiosError をスロー
7. PetriNetEditorScreen の catch → setMaimlContent(null)  ← null がセットされる
8. PetriNetEditorInner に maimlData = null が渡る
9. !maimlData → 新規作成モードに入る
10. generateInitialDocumentData(editingFileName, { documentId: initialDocumentId, ... })
    → getLoginUserInfo() → localStorage.getItem('userInfo') → null（同様に空の場合）
    → owners = []（Owner が空）
    → setDocumentData(initialDocumentData)  ← Document は作られるが Owner が空
```

**→ 「Document の初期値が作成されていない」= Owner フィールドが空のこと**  
または、orgId が空のため保存時も誤ったパスに書き込まれる。

#### 該当コード箇所

```
frontend/src/components/project/ProjectManagement.tsx  L789-L801
  → getUserInfo() の返値が null の場合 orgId = ''

frontend/src/utils/documentInitializer.ts  L21
  → localStorage.getItem('userInfo') が sessionStorage と一致しない

frontend/src/utils/sessionStorageHelper.ts  L19
  → sessionStorage.getItem(SESSION_STORAGE_KEYS.USER) のみを参照
```

---

### パターン1（旧調査）: S3/Swift が空文字列・エラーXML・不完全なXMLを返す環境

#### 発生メカニズム

新規プロジェクト作成直後、MAIMLファイルはまだ存在しない。  
しかし環境（特に開発環境の OpenStack Swift）によっては、存在しないファイルへのアクセス時に **404例外でなく**、空のオブジェクト・エラー文字列・不完全なXML文字列を返すことがある。

```
getFileContentAsText(sourceS3Key)
  → 404 ではなく "<Error>NoSuchKey</Error>" や不完全なXMLを返す
  → setMaimlContent("<Error>...")  ← null ではない

PetriNetEditorInner に maimlData = "<Error>..." が渡る

fetchPetriNetData 内:
  if (!maimlData) {
    // ← falsy でないため、ここに入らない（新規作成モードに入らない）
  }

  const parser = new MaimlParserTyped(maimlData);
  const methodsData = parser.getMethods();
  // → S3エラーXMLをパースしてもmethodが0件

  if (methodsData.length > 0) {
    // Document初期化あり
    // ... ← ここには入らない
  } else {
    // ⚠️ フォールバックパス（L942〜L985）
    const fallbackMethod = generateInitialMethod(`method_${Date.now()}`);
    setMethods([fallbackMethod]);
    setActiveMethodIndex(0);
    setMultiMethodMode(false);
    setNodes([]);
    setEdges([]);
    reset({ nodes: [], edges: [] });
    setIsLoading(false);
    // ↑ setDocumentData() が呼ばれない！
    // ↑ documentData は null のまま
  }
```

#### 該当コード箇所

```
frontend/src/components/editorv2/PetriNetEditorInner.tsx
  L942〜L985（methodsが0件のフォールバック分岐）
```

#### 影響

- `documentData === null` の状態でエディタが開く
- Document情報パネルが空になる
- 保存時に `documentData?.name || 'document'` などのフォールバック値が使われ、正しいプロジェクト名・IDで保存されない

---

### パターン2: `getFileContentAsText` が空文字列 `""` を返す場合

`fileAccessService.ts` の返却値の判定：

```typescript
// L527
if (!response.data.success || response.data.data?.content === undefined) {
  throw new Error('ファイル内容の取得に失敗しました');
}
return response.data.data.content;
```

バックエンドが `{success: true, data: {content: ""}}` を返した場合：
- `content === undefined` → `false`（空文字はundefinedではない）
- `!response.data.success` → `false`
- → `return ""` として返る

`PetriNetEditorScreen` 側：

```typescript
// L66
const content = await getFileContentAsText(sourceS3Key);
setMaimlContent(content ?? null);
// content = "" → ?? は null/undefined のみ対象
// → setMaimlContent("") ← 空文字がセットされる
```

`PetriNetEditorInner` 側：
```typescript
if (!maimlData) {
  // !""  → true → 新規作成モードに入る ← ✅ この場合は正常
}
```

**→ 空文字 `""` の場合はバグにならない（`!""` が true のため新規作成モードに入る）**

---

### パターン3: `localStorage` に `userInfo` がない環境（Owner が空になる）

`documentInitializer.ts` の `getLoginUserInfo()` は **localStorage** を参照する：

```typescript
// documentInitializer.ts L21
const userInfoStr = localStorage.getItem('userInfo');
```

一方、`sessionStorageHelper.ts` の `getUserInfo()` は **sessionStorage** を参照する：

```typescript
// sessionStorageHelper.ts L19
const userJson = sessionStorage.getItem(SESSION_STORAGE_KEYS.USER);
```

環境や認証フローによっては、`userInfo` が **sessionStorage にのみ** 書き込まれており、localStorage には存在しないケースがある。

この場合：
- `getLoginUserInfo()` → `null` を返す
- `generateInitialOwner()` → `[]`（空配列）を返す
- `documentData.owners = []` ← Documentは作られるが **Owner情報が空**

「Documentの初期値が作成されていない」ように見える現象として表れる可能性がある。

---

## 5. バグのまとめ（確定）

### 直接の原因（ネットワーク確認済み）

| 項目 | 内容 |
|---|---|
| **バグ箇所** | `ProjectManagement.tsx` L789 `handleEditButtonClick()` |
| **根本原因** | `getUserInfo()`（sessionStorage参照）が null を返すと `orgId = ''` になり、`sourceS3Key` のパスが壊れる |
| **発生しやすい環境** | sessionStorage が空の環境（別タブ、リロード後、一部の SSO/認証フロー） |
| **再現手順** | ① sessionStorage を空にする（or 別タブで開く）→ ② 新規プロジェクト作成 → ③ 編集ボタンを押す |
| **確認されたエラー** | `E6001: ファイルが見つかりません: /projects/test_ito_project/test_ito_project.maiml` |

### バグの連鎖

```
orgId = ''
  └── sourceS3Key = "/projects/{name}/{name}.maiml"  ← orgId なし
       └── API: E6001 404 エラー（ファイルが見つかりません）
            └── PetriNetEditorScreen: catch → maimlContent = null
                 └── PetriNetEditorInner: 新規作成モード
                      └── generateInitialDocumentData()
                           └── getLoginUserInfo() → localStorage が空 → owners = []
                                └── Document は作られるが Owner が空
                                     └── 「Document初期値が作成されていない」ように見える
```

### なぜ「別の環境」で起きるのか

sessionStorage はタブ間・オリジン間で**共有されない**。  
→ `userInfo` が localStorage には書かれているが sessionStorage には書かれていない環境では常に発生する。  
→ ブラウザのバージョン、プライベートモード、SSO フロー等によって挙動が異なる。

---

## 6. 修正方針

### 修正1（根本対策・最優先）: `getUserInfo` を localStorage にも fallback させる

`sessionStorageHelper.ts` の `getUserInfo()` が null を返した場合、localStorage も確認する。  
または `handleEditButtonClick` 内で orgId 取得のロジックを堅牢にする。

```typescript
// ProjectManagement.tsx の handleEditButtonClick()
const userInfo = getUserInfo();
// sessionStorage になければ localStorage も確認
const orgId = userInfo?.organizationId 
  ?? (JSON.parse(localStorage.getItem('userInfo') || '{}') as { organizationId?: string })?.organizationId 
  ?? '';

if (!orgId) {
  console.error('❌ [ProjectManagement] orgId が取得できません。ログイン情報を確認してください');
  message.error('組織情報が取得できませんでした。一度ログインし直してください');
  return;
}
```

より根本的には `sessionStorageHelper.ts` 自体を修正するのが望ましい：

```typescript
// sessionStorageHelper.ts の getUserInfo()
export const getUserInfo = (): SessionUserInfo | null => {
  if (typeof window === 'undefined') return null;

  try {
    // 1. sessionStorage を優先参照
    const userJson = sessionStorage.getItem(SESSION_STORAGE_KEYS.USER);
    if (userJson) {
      return JSON.parse(userJson) as SessionUserInfo;
    }

    // 2. sessionStorage になければ localStorage も参照（fallback）
    const localJson = localStorage.getItem('userInfo');
    if (localJson) {
      console.warn('⚠️ [sessionStorageHelper] sessionStorage にないため localStorage から取得');
      return JSON.parse(localJson) as SessionUserInfo;
    }

    return null;
  } catch (error) {
    console.error('Failed to get user info from storage:', error);
    return null;
  }
};
```

### 修正2（補助）: `documentInitializer.ts` の `getLoginUserInfo()` も sessionStorage を参照させる

```typescript
// localStorage になければ sessionStorage も参照するフォールバック
const userInfoStr = 
  localStorage.getItem('userInfo') ?? 
  sessionStorage.getItem('userInfo');
```

### 修正3（防御的実装）: `handleEditButtonClick` に orgId バリデーションを追加

```typescript
const orgId = userInfo?.organizationId ?? '';
if (!orgId) {
  message.error('組織情報が取得できませんでした。一度ログインし直してください');
  return;
}
```

### 修正4（補助）: フォールバックパスに `setDocumentData()` を追加

`PetriNetEditorInner.tsx` の L942〜L985 のフォールバック分岐に、Documentの初期化を追加する。
（万が一 maimlData が null でない不正な値で来た場合の防御）

```typescript
} else {
  // フォールバックパスにも Document 初期化を追加
  if (!documentData) {
    const { documentData: fallbackDocumentData } = generateInitialDocumentData(
      props.originalFileName || editingFileName,
      { documentId: initialDocumentId, description: initialDescription }
    );
    setDocumentData(fallbackDocumentData);
  }
  const fallbackMethod = generateInitialMethod(`method_${Date.now()}`);
  setMethods([fallbackMethod]);
  // ... 以降既存の処理
}
```

---

---

## 7. 最終確定：バグ発生メカニズム

### コンソールログ・ネットワークログから確認された事実

| 観測事実 | 発生環境 | 意味 |
|---|---|---|
| E6001「ファイルが見つかりません」| ローカル or 別操作 | MAIML ファイルが存在しない正常なケース（新規作成モードに入る） |
| `!maimlData` 分岐のログが出ていない | **バグが起きている環境** | `maimlData` が truthy = MAIML ファイルが実際に存在している |
| フォールバックパスに進んでいる | **バグが起きている環境** | `<document>` 要素がない MAIML → `extractedDoc = null` → `setDocumentData()` が呼ばれない |

**重要**: E6001 と「`!maimlData` に入らない」は**同じタイミングでは起きない**。どちらかが起きる：
- ファイルなし → E6001 → catch → `null` → 新規作成モード（正常）
- ファイルあり → MAIML 返却 → パースモード → ここでバグが発生

---

### なぜローカルでは正常に動くのか

```
① フロント: orgId='' → sourceS3Key = "/projects/{name}/{name}.maiml"

② バックエンド: buildKey() が補正（先頭スラッシュ除去 + JWTのorgId付与）
   → 正しいパスでストレージにアクセス

③ 新規プロジェクト = MAIML ファイルがない
   → streamFileByKey() が NotFoundError をスロー
   → getFileContentAsText() が例外をスロー
   → PetriNetEditorScreen の catch → setMaimlContent(null)

④ PetriNetEditorInner: !maimlData = !null = true
   → 新規作成モード → setDocumentData() が呼ばれる ✅
```

**→ ローカルは MAIML ファイルが存在しないため catch を通って null になり、正常に新規作成モードへ入る。**

---

### 「別の環境」で MAIML ファイルが存在する理由

プロジェクト作成時（`projectService.create()`）は `.keep` ファイルのみ作成する：
```typescript
// backend/src/services/projectService.ts
const s3Path = `projects/${data.projectName}/.keep`;
await storageService.uploadFile(organizationId, s3Path, '', { contentType: 'text/plain' });
// ← MAIML ファイルは作成しない
```

しかし以下の状況で MAIML が既に存在することがある：
- **同名プロジェクトが以前存在し、削除後に再作成した**（ストレージのデータが残っている）
- **タスク登録フローで MAIML が生成された後にプロジェクトを再オープンした**
- **環境移行・データ移行時に既存 MAIML データが混在している**

---

### 確定したバグのトリガー条件

**`<document>` 要素を含まない MAIML が返ってくる場合**

```typescript
// maimlParserTyped.ts
getMethods(): Method[] {
  const protocol = this.getProtocol();  // <protocol> があれば成功
  // → methodsData.length > 0 が成立
}

getDocument(): MaimlDocument {
  if (!this.typedMaiml.document) {
    throw new Error('Document not found in MAIML');  // <document> がなければ throw
  }
  return this.typedMaiml.document;
}
```

```
① maimlData = "<maiml><protocol><method>...</method></protocol></maiml>"
   （<document> 要素なし）

② PetriNetEditorInner: maimlData は truthy → パースモードへ

③ methodsData = parser.getMethods()
   → protocol あり、method あり → methodsData.length > 0 ✅

④ if (methodsData.length > 0) { ... } → このブロックへ

⑤ extractedDoc = null; // 初期値
   try {
     extractedDoc = parser.getDocument();  // ← <document> なし → throw!
   } catch (docError) {
     // catch で処理続行（extractedDoc = null のまま）
   }

⑥ if (extractedDoc) {
     setDocumentData(documentWithCorrectName);  // ← extractedDoc=null なので入らない！
   }
   // ↑ setDocumentData() が呼ばれない

⑦ documentData = null のままエディタが起動
   → Document情報パネルが空
   → 保存時に documentData?.name = 'document'（フォールバック値）が使われる
```

---

### 修正すべき箇所（確定）

**直接の修正箇所：`PetriNetEditorInner.tsx` L764 付近**

```typescript
// 現状（バグあり）
if (extractedDoc) {
  const documentWithCorrectName: DocumentData = {
    ...extractedDoc,
    name: props.originalFileName 
      ? props.originalFileName.replace('.maiml', '') 
      : (extractedDoc.name || 'document'),
  };
  setDocumentData(documentWithCorrectName);
}
// ← extractedDoc が null の場合、setDocumentData() が呼ばれない

// 修正案
if (extractedDoc) {
  const documentWithCorrectName: DocumentData = {
    ...extractedDoc,
    name: props.originalFileName 
      ? props.originalFileName.replace('.maiml', '') 
      : (extractedDoc.name || 'document'),
  };
  setDocumentData(documentWithCorrectName);
} else {
  // <document> 要素がない MAIML でも初期値を生成する
  const { documentData: fallbackDocumentData } = generateInitialDocumentData(
    props.originalFileName || editingFileName,
    { documentId: initialDocumentId, description: initialDescription }
  );
  setDocumentData(fallbackDocumentData);
  console.warn('⚠️ [fetchPetriNetData] <document>要素なしのため初期値を生成:', fallbackDocumentData);
}
```

**補助的な修正：フォールバックパス（L942〜）にも同様の初期化を追加**

```typescript
} else {
  // methodsが取得できなかった場合（L942〜）
  // ...既存の処理...
  
  // ⬇️ 追加: documentData も初期化する
  if (!documentData) {
    const { documentData: fallbackDocumentData } = generateInitialDocumentData(
      props.originalFileName || editingFileName,
      { documentId: initialDocumentId, description: initialDescription }
    );
    setDocumentData(fallbackDocumentData);
  }
  setIsLoading(false);
}
```

---

## （旧）修正方針（パターン1のもの・参考）

### 旧修正1: フォールバックパスに `setDocumentData()` を追加

`PetriNetEditorInner.tsx` の L942〜L985 のフォールバック分岐に、Documentの初期化を追加する。

```typescript
} else {
  // methodsが取得できなかった場合：フォールバック用methodを設定してタブを表示
  console.warn('⚠️ [fetchPetriNetData] MAIMLのmethod取得件数が0 - フォールバック処理');
  const fallbackMethod = generateInitialMethod(`method_${Date.now()}`);
  setMethods([fallbackMethod]);
  setActiveMethodIndex(0);
  setMultiMethodMode(false);
  setNodes([]);
  setEdges([]);
  reset({ nodes: [], edges: [] });

  // ⬇️ 追加: documentData も初期化する（未設定の場合のみ）
  if (!documentData) {
    const { documentData: fallbackDocumentData } = generateInitialDocumentData(
      props.originalFileName || editingFileName,
      {
        documentId: initialDocumentId,
        description: initialDescription,
      }
    );
    setDocumentData(fallbackDocumentData);
    console.warn('⚠️ [fetchPetriNetData] DocumentDataをフォールバック初期化しました:', fallbackDocumentData);
  }

  setIsLoading(false);
  // ...（以降既存の処理）
}
```

### 修正2（補助）: `documentInitializer.ts` の `getLoginUserInfo()` を sessionStorage にも対応させる

```typescript
// localStorage になければ sessionStorage も参照するフォールバック
const userInfoStr = 
  localStorage.getItem('userInfo') ?? 
  sessionStorage.getItem('userInfo');

if (!userInfoStr) {
  console.warn('⚠️ [documentInitializer] userInfoがlocalStorage/sessionStorageに存在しません');
  return null;
}
```

### 修正3（根本対策）: `PetriNetEditorScreen` の `loadMaimlData` でエラー判定を厳格化

`getFileContentAsText` が XML エラーレスポンス文字列を返した場合も `null` 扱いにする：

```typescript
const loadMaimlData = async () => {
  try {
    setIsLoading(true);
    const content = await getFileContentAsText(sourceS3Key);

    // ⬇️ 追加: エラーレスポンスらしい場合はnull扱いにする
    const isValidMaiml = content && content.trim().startsWith('<?xml') && content.includes('<maiml');
    setMaimlContent(isValidMaiml ? content : null);

    if (isValidMaiml) {
      console.log('✅ [PetriNetEditorScreen] MAIML loaded from S3, length:', content!.length);
    } else {
      console.log('✅ [PetriNetEditorScreen] No valid MAIML → 新規作成モード');
    }
  } catch (error) {
    console.error('❌ [PetriNetEditorScreen] Failed to load MAIML:', error);
    setMaimlContent(null);
  } finally {
    setIsLoading(false);
  }
};
```
