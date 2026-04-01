// ==========================================
// スプレッドシート初期化・共通操作
// ==========================================

const HEADERS = {
  [SHEET.DEALS]: [
    '案件ID', '案件名', 'タレントID', 'タレント名', '企業名', '企業担当者',
    '案件種別', '規模', 'エスカレーション先', 'ステータス',
    '返答期限', '実施予定日', '担当スタッフ', 'イベントID',
    'リスクフラグ', '備考', '登録日',
  ],
  [SHEET.TASKS]: [
    'タスクID', '案件ID', 'タスク名', '担当者', '期限', 'ステータス', 'メモ',
  ],
  [SHEET.TALENT_MASTER]: [
    'タレントID', '名前', 'Slack Member ID', 'メール', '備考',
  ],
  [SHEET.COMPANY_MASTER]: [
    '企業ID', '社名', '業種', '担当者名', '連絡先', 'メール', '取引実績', '備考',
  ],
  [SHEET.CONTACT_LOG]: [
    '履歴ID', '案件ID', '日時', '対応内容', '対応者', 'メモ',
  ],
  [SHEET.API_LOG]: [
    '日時', '呼び出し元', 'モデル', '入力トークン', '出力トークン', 'ステータス', 'エラー内容',
  ],
};

function initializeSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(HEADERS).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log('シート作成: ' + sheetName);
    }
    setupSheetHeader(sheet, HEADERS[sheetName]);
  });

  const defaultSheet = ss.getSheetByName('シート1');
  if (defaultSheet) ss.deleteSheet(defaultSheet);

  Logger.log('スプレッドシートの初期化が完了しました');
}

function setupSheetHeader(sheet, headers) {
  const headerRow = sheet.getRange(1, 1, 1, headers.length);
  headerRow.setValues([headers]);
  headerRow.setFontWeight('bold');
  headerRow.setBackground('#1a237e');
  headerRow.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

// ==========================================
// 共通CRUD
// ==========================================

function getSheet(sheetName) {
  if (!sheetName) throw new Error('sheetNameが未定義です');
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getName() === sheetName) return sheets[i];
  }
  throw new Error('シートが見つかりません: ' + sheetName);
}

function getAllRows(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function filterRows(sheetName, conditions) {
  return getAllRows(sheetName).filter(row =>
    Object.keys(conditions).every(key => row[key] === conditions[key])
  );
}

function sanitizeForSheet(value) {
  if (typeof value !== 'string') return value;
  if (/^[=+\-@\t\r]/.test(value)) return "'" + value;
  return value;
}

function appendRow(sheetName, rowObj) {
  const sheet = getSheet(sheetName);
  const headers = HEADERS[sheetName];
  const values = headers.map(h => sanitizeForSheet(rowObj[h] !== undefined ? rowObj[h] : ''));
  sheet.appendRow(values);
}

function updateRowById(sheetName, idColumn, idValue, updateObj) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf(idColumn);
  if (idIdx === -1) throw new Error('ID列が見つかりません: ' + idColumn);

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === idValue) {
      Object.keys(updateObj).forEach(key => {
        const colIdx = headers.indexOf(key);
        if (colIdx !== -1) sheet.getRange(i + 1, colIdx + 1).setValue(updateObj[key]);
      });
      return true;
    }
  }
  return false;
}

function generateId(prefix, sheetName, idColumn) {
  const rows = getAllRows(sheetName);
  const nums = rows
    .map(r => parseInt((r[idColumn] || '').replace(prefix, ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max.apply(null, nums) + 1 : 1;
  return prefix + String(next).padStart(3, '0');
}

function formatDate(date) {
  return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd');
}
