// ==========================================
// 設定・定数
// ==========================================

const SHEET = {
  DEALS:          '案件台帳',
  TASKS:          'タスク管理',
  TALENT_MASTER:  'タレントマスタ',
  COMPANY_MASTER: '企業マスタ',
  CONTACT_LOG:    'コンタクト履歴',
  API_LOG:        'API使用ログ',
};

// 案件種別
const DEAL_TYPES = [
  '商品プロモーション（SNS・配信）',
  'タイアップ楽曲・MV出演',
  'ゲームコラボ（配信・イベント）',
  'リアルイベント出演',
  'グッズコラボ',
  '外部メディア出演（雑誌・TV等）',
  'その他',
];

// 案件規模（Claude判定）
const DEAL_SCALES = ['小', '中', '大'];

// 案件ステータス
const DEAL_STATUS = ['受付中', '確認中', '交渉中', '契約確認', '準備中', '実施済', '完了', '見送り'];

// タスクステータス
const TASK_STATUS = ['未着手', '進行中', '完了', '要確認', 'ブロック中'];

// Slackリマインド設定
const REMIND_DAYS_REPLY   = 3; // 返答期限の何日前に通知
const REMIND_DAYS_EXEC    = 7; // 実施予定日の何日前に通知

// エスカレーション先（規模ごと）
const ESCALATION_MAP = {
  '小': ['担当スタッフ'],
  '中': ['担当スタッフ', 'マネジメント'],
  '大': ['担当スタッフ', 'マネジメント', '法務', '営業', 'PR'],
};

// Claude設定
const CLAUDE_MODEL   = 'claude-opus-4-6';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// スクリプトプロパティのキー名
const PROP_CLAUDE_KEY      = 'ANTHROPIC_API_KEY';
const PROP_SLACK_BOT_TOKEN = 'SLACK_BOT_TOKEN';

// event-pm連携: イベントIDのプレフィックス（参照用）
const EVENT_PM_ID_PREFIX = 'EVT';
