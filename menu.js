// ==========================================
// カスタムメニュー・フォーム制御
// ==========================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('案件管理')
    .addItem('新規案件を登録', 'openDealForm')
    .addSeparator()
    .addItem('リマインド（即時テスト）', 'testDealReminder')
    .addItem('Slack接続テスト', 'testSlackConnection')
    .addSeparator()
    .addItem('セットアップ手順を確認', 'printSetupGuide')
    .addToUi();
}

function openDealForm() {
  const html = HtmlService.createHtmlOutputFromFile('DealForm')
    .setTitle('新規案件登録')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

// フォームのsubmitから呼ばれる
function submitDealForm(formData) {
  const result = registerDealFromForm(formData);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const scaleEmoji = { '小': '', '中': '⚠️ ', '大': '🆘 ' }[result.scale] || '';

  return {
    success: true,
    message:
      '案件ID: ' + result.dealId + '\n' +
      '規模判定: ' + scaleEmoji + result.scale + '\n' +
      'タスク: ' + result.taskCount + '件\n' +
      'エスカレーション先: ' + result.escalateTo.join('・') +
      (result.riskFlags.length > 0 ? '\n\nリスク: ' + result.riskFlags.join('／') : ''),
  };
}

// フォームからタレント一覧を取得
function getTalentListForForm() {
  return getTalentList().map(function(t) {
    return { id: t['タレントID'], name: t['名前'] };
  });
}

// フォームから企業一覧を取得
function getCompanyListForForm() {
  return getCompanyList().map(function(c) {
    return { id: c['企業ID'], name: c['社名'], contact: c['担当者名'] };
  });
}

function printSetupGuide() {
  const guide = [
    '【初回セットアップ手順】',
    '',
    '1. GASエディタで以下を実行してキーを保存:',
    '   saveClaudeApiKey("sk-ant-...")',
    '   saveSlackBotToken("xoxb-...")',
    '',
    '2. スプレッドシートを初期化:',
    '   initializeSpreadsheet()',
    '',
    '3. タレントマスタにSlack Member IDを登録:',
    '   タレントマスタシートに直接入力',
    '',
    '4. 毎朝リマインドを有効化:',
    '   setDailyReminderTrigger()',
    '',
    '5. 接続テスト:',
    '   testSlackConnection()',
  ].join('\n');

  SpreadsheetApp.getUi().alert(guide);
}
