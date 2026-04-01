// ==========================================
// タレントマスタ操作
// ==========================================

function getTalentList() {
  return getAllRows(SHEET.TALENT_MASTER);
}

function getTalentById(talentId) {
  const rows = filterRows(SHEET.TALENT_MASTER, { 'タレントID': talentId });
  return rows.length > 0 ? rows[0] : null;
}

function getTalentByName(name) {
  const rows = getAllRows(SHEET.TALENT_MASTER).filter(function(r) {
    return r['名前'] === name;
  });
  return rows.length > 0 ? rows[0] : null;
}

// タレントのSlack Member IDを取得
function getTalentSlackId(talentId) {
  const talent = getTalentById(talentId);
  return talent ? talent['Slack Member ID'] : null;
}

// タレントマスタに追加
function addTalent(data) {
  const talentId = generateId('TLT', SHEET.TALENT_MASTER, 'タレントID');
  appendRow(SHEET.TALENT_MASTER, {
    'タレントID':      talentId,
    '名前':            data.name,
    'Slack Member ID': data.slackMemberId || '',
    'メール':          data.email || '',
    '備考':            data.notes || '',
  });
  return talentId;
}

// ==========================================
// 企業マスタ操作
// ==========================================

function getCompanyList() {
  return getAllRows(SHEET.COMPANY_MASTER);
}

function addCompany(data) {
  const companyId = generateId('CMP', SHEET.COMPANY_MASTER, '企業ID');
  appendRow(SHEET.COMPANY_MASTER, {
    '企業ID':   companyId,
    '社名':     data.name,
    '業種':     data.industry || '',
    '担当者名': data.contact || '',
    '連絡先':   data.phone || '',
    'メール':   data.email || '',
    '取引実績': data.history || '',
    '備考':     data.notes || '',
  });
  return companyId;
}
