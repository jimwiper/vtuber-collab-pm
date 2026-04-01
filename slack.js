// ==========================================
// Slack通知（Bot Token による個人DM）
// ==========================================

function getSlackBotToken() {
  const token = PropertiesService.getScriptProperties().getProperty(PROP_SLACK_BOT_TOKEN);
  if (!token) throw new Error('Slack Bot Tokenが未設定です。saveSlackBotToken()を実行してください');
  return token;
}

function saveSlackBotToken(token) {
  PropertiesService.getScriptProperties().setProperty(PROP_SLACK_BOT_TOKEN, token);
  Logger.log('Slack Bot Tokenを保存しました');
}

// 指定したSlack Member IDにDMを送信
function postSlackDM(memberId, text) {
  const token = getSlackBotToken();

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + token },
    payload: JSON.stringify({ channel: memberId, text: text }),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', options);
  const json = JSON.parse(response.getContentText());

  if (!json.ok) {
    throw new Error('Slack DM送信失敗: ' + json.error);
  }
  return json;
}

// Member IDが不明な場合でもログだけ残して止めない
function postSlackDMSafe(memberId, text) {
  if (!memberId) {
    Logger.log('Slack DM送信スキップ（Member ID未設定）');
    return;
  }
  try {
    postSlackDM(memberId, text);
  } catch (e) {
    Logger.log('Slack DM送信エラー: ' + e.message);
  }
}

// ==========================================
// 案件登録時の通知
// ==========================================

function notifyDealRegistered(dealId, formData, assessment) {
  const talent     = formData.talentId ? getTalentById(formData.talentId) : null;
  const scaleLabel = { '小': '', '中': ':warning:', '大': ':sos:' }[assessment.scale] || '';
  const sheetUrl   = SpreadsheetApp.getActiveSpreadsheet().getUrl();

  // 企業名・タレント名・案件名はSlackに送信しない（情報漏洩対策）
  const lines = [
    scaleLabel + ' *新規案件が登録されました*',
    '',
    '*案件ID*: ' + dealId,
    '*種別*: ' + formData.dealType,
    '*規模*: ' + assessment.scale + '　' + (assessment.reason || ''),
    '*エスカレーション先*: ' + assessment.escalateTo.join('・'),
    '*返答期限*: ' + (formData.replyLimit || '未設定'),
    '*実施予定日*: ' + (formData.execDate || '未定'),
  ];

  if (assessment.riskFlags && assessment.riskFlags.length > 0) {
    lines.push('');
    lines.push('*:triangular_flag_on_post: リスクフラグ*');
    assessment.riskFlags.forEach(function(f) { lines.push('• ' + f); });
  }

  lines.push('');
  lines.push(':spreadsheet: 詳細はシートで確認: ' + sheetUrl);

  const text = lines.join('\n');

  // 担当スタッフに通知（タレントマスタからMember IDを取得）
  const staffTalent = formData.assignedStaff
    ? getTalentByName(formData.assignedStaff)
    : null;
  if (staffTalent && staffTalent['Slack Member ID']) {
    postSlackDMSafe(staffTalent['Slack Member ID'], text);
  }

  // タレント本人にも通知（規模「大」のみ）
  if (assessment.scale === '大' && talent && talent['Slack Member ID']) {
    postSlackDMSafe(talent['Slack Member ID'], text);
  }
}

// ==========================================
// 毎朝のリマインド（トリガーから呼ばれる）
// ==========================================

function dailyDealReminder() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const replyAlert = new Date(today);
  replyAlert.setDate(replyAlert.getDate() + REMIND_DAYS_REPLY);

  const execAlert = new Date(today);
  execAlert.setDate(execAlert.getDate() + REMIND_DAYS_EXEC);

  // 完了・見送り以外の案件を対象
  const activeDeals = getAllRows(SHEET.DEALS).filter(function(d) {
    return d['ステータス'] !== '完了' && d['ステータス'] !== '見送り';
  });

  if (activeDeals.length === 0) return;

  // 担当スタッフごとにアラートをまとめる
  const alertsByStaff = {};

  activeDeals.forEach(function(deal) {
    const staff = deal['担当スタッフ'];
    if (!staff) return;

    const alerts = [];

    // 返答期限アラート
    if (deal['返答期限']) {
      const replyDate = new Date(deal['返答期限']);
      replyDate.setHours(0, 0, 0, 0);
      if (replyDate < today) {
        alerts.push({ type: '返答期限切れ', emoji: ':warning:', date: deal['返答期限'] });
      } else if (replyDate <= replyAlert) {
        alerts.push({ type: '返答期限まで' + REMIND_DAYS_REPLY + '日以内', emoji: ':clock1:', date: deal['返答期限'] });
      }
    }

    // 実施予定日アラート
    if (deal['実施予定日']) {
      const execDate = new Date(deal['実施予定日']);
      execDate.setHours(0, 0, 0, 0);
      if (execDate >= today && execDate <= execAlert) {
        alerts.push({ type: '実施予定日まで' + REMIND_DAYS_EXEC + '日以内', emoji: ':calendar:', date: deal['実施予定日'] });
      }
    }

    if (alerts.length === 0) return;

    if (!alertsByStaff[staff]) alertsByStaff[staff] = [];
    alertsByStaff[staff].push({ deal: deal, alerts: alerts });
  });

  // 担当スタッフごとにDM送信
  Object.keys(alertsByStaff).forEach(function(staffName) {
    const staffTalent = getTalentByName(staffName);
    if (!staffTalent || !staffTalent['Slack Member ID']) return;

    const items = alertsByStaff[staffName];
    const sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
    const lines = [
      '*:calendar: 案件リマインド — ' + formatDate(today) + '*',
      '',
    ];

    // 案件名・企業名はSlackに送信しない（情報漏洩対策）
    items.forEach(function(item) {
      item.alerts.forEach(function(alert) {
        lines.push(
          alert.emoji + ' *[' + item.deal['案件ID'] + ']*' +
          '  ' + alert.type + ': `' + alert.date + '`' +
          '  ステータス: ' + item.deal['ステータス']
        );
      });
    });

    lines.push('');
    lines.push(':spreadsheet: 詳細はシートで確認: ' + sheetUrl);

    postSlackDMSafe(staffTalent['Slack Member ID'], lines.join('\n'));
    Logger.log('リマインド送信: ' + staffName + '（' + items.length + '件）');
  });
}

// 即時テスト用
function testDealReminder() {
  try {
    dailyDealReminder();
    SpreadsheetApp.getUi().alert('Slack DMを送信しました。各担当者のDMを確認してください。');
  } catch (e) {
    SpreadsheetApp.getUi().alert('エラー: ' + e.message);
  }
}

// Slack接続テスト
function testSlackConnection() {
  try {
    const token = getSlackBotToken();
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + token },
      payload: JSON.stringify({}),
      muteHttpExceptions: true,
    };
    const response = UrlFetchApp.fetch('https://slack.com/api/auth.test', options);
    const json = JSON.parse(response.getContentText());
    if (json.ok) {
      SpreadsheetApp.getUi().alert('Slack接続成功: @' + json.user + ' (' + json.team + ')');
    } else {
      SpreadsheetApp.getUi().alert('Slack接続失敗: ' + json.error);
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert('エラー: ' + e.message);
  }
}
