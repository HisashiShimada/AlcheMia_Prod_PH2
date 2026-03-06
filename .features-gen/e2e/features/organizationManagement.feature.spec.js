// Generated from: e2e\features\organizationManagement.feature
import { test } from "playwright-bdd";

test.describe('組織管理機能', () => {

  test.beforeEach('背景', async ({ Given }, testInfo) => { if (testInfo.error) return;
    await Given('プロバイダーユーザー "e2e_provider" がDBに存在する'); 
  });
  
  test('新規組織を1件追加できること', async ({ When, Then, And, page }) => { 
    await When('プロバイダーユーザー "e2e_provider" でログインする', null, { page }); 
    await And('組織管理画面を開く', null, { page }); 
    await And('組織追加モーダルで以下の情報を入力して保存する', {"dataTable":{"rows":[{"cells":[{"value":"フィールド"},{"value":"値"}]},{"cells":[{"value":"組織CD"},{"value":"e2e_test_org_001"}]},{"cells":[{"value":"組織表示名"},{"value":"E2Eテスト組織"}]},{"cells":[{"value":"組織email"},{"value":"e2e-test@example.com"}]},{"cells":[{"value":"代表システム管理者"},{"value":"E2Eテスト担当者"}]},{"cells":[{"value":"代表者メールアドレス"},{"value":"e2e-admin@example.com"}]}]}}, { page }); 
    await Then('組織一覧に "e2e_test_org_001" が表示されること', null, { page }); 
    await And('データベースに組織CD "e2e_test_org_001" のレコードが存在すること'); 
  });

});

// == technical section ==

test.afterEach('AfterEach Hooks', ({ $runScenarioHooks }) => $runScenarioHooks('after', {  }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e\\features\\organizationManagement.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":10,"pickleLine":8,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"前提プロバイダーユーザー \"e2e_provider\" がDBに存在する","isBg":true,"stepMatchArguments":[{"group":{"start":11,"value":"\"e2e_provider\"","children":[{"start":12,"value":"e2e_provider","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":9,"keywordType":"Action","textWithKeyword":"もしプロバイダーユーザー \"e2e_provider\" でログインする","stepMatchArguments":[{"group":{"start":11,"value":"\"e2e_provider\"","children":[{"start":12,"value":"e2e_provider","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"かつ組織管理画面を開く","stepMatchArguments":[]},{"pwStepLine":13,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"かつ組織追加モーダルで以下の情報を入力して保存する","stepMatchArguments":[]},{"pwStepLine":14,"gherkinStepLine":18,"keywordType":"Outcome","textWithKeyword":"ならば組織一覧に \"e2e_test_org_001\" が表示されること","stepMatchArguments":[{"group":{"start":6,"value":"\"e2e_test_org_001\"","children":[{"start":7,"value":"e2e_test_org_001","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":19,"keywordType":"Outcome","textWithKeyword":"かつデータベースに組織CD \"e2e_test_org_001\" のレコードが存在すること","stepMatchArguments":[{"group":{"start":12,"value":"\"e2e_test_org_001\"","children":[{"start":13,"value":"e2e_test_org_001","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end