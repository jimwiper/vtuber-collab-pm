// ==========================================
// トリガー設定
// ==========================================

// 毎朝9時の案件リマインドトリガーを設定（初回1回だけ実行）
function setDailyReminderTrigger() {
  // 既存トリガーを削除してから再設定
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'dailyDealReminder') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('dailyDealReminder')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  Logger.log('毎朝9時のリマインドトリガーを設定しました');
}
