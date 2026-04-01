// ==========================================
// Claude API
// ==========================================

function getClaudeApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty(PROP_CLAUDE_KEY);
  if (!key) throw new Error('Claude APIキーが未設定です。saveClaudeApiKey()を実行してください');
  return key;
}

function saveClaudeApiKey(key) {
  PropertiesService.getScriptProperties().setProperty(PROP_CLAUDE_KEY, key);
  Logger.log('Claude APIキーを保存しました');
}

function callClaude(prompt, maxTokens, caller) {
  const startTime = new Date();
  let status = 'success';
  let errorMsg = '';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-api-key': getClaudeApiKey(), 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens || 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(CLAUDE_API_URL, options);
    const json = JSON.parse(response.getContentText());

    if (json.error) {
      status = 'error';
      errorMsg = json.error.message || JSON.stringify(json.error);
      throw new Error('Claude APIエラー: ' + errorMsg);
    }

    inputTokens  = json.usage ? json.usage.input_tokens  : 0;
    outputTokens = json.usage ? json.usage.output_tokens : 0;

    return json.content[0].text;

  } catch (e) {
    status = 'error';
    errorMsg = e.message;
    throw e;
  } finally {
    logApiUsage(caller || 'unknown', inputTokens, outputTokens, status, errorMsg);
  }
}

function callClaudeJson(prompt, caller) {
  const text = callClaude(prompt, 2048, caller);
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Claude出力をJSONとして解析できません: ' + text.slice(0, 200));
  }
}

function logApiUsage(caller, inputTokens, outputTokens, status, errorMsg) {
  try {
    appendRow(SHEET.API_LOG, {
      '日時':       formatDate(new Date()),
      '呼び出し元': caller,
      'モデル':     CLAUDE_MODEL,
      '入力トークン':  inputTokens,
      '出力トークン':  outputTokens,
      'ステータス': status,
      'エラー内容': errorMsg || '',
    });
  } catch (e) {
    Logger.log('API使用ログの記録に失敗: ' + e.message);
  }
}
