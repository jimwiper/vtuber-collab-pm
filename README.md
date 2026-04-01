# vtuber-collab-pm

VTuberエンタメ企業向け 案件・コラボ管理ツール

Google Apps Script + Claude API で構成。企業からの案件受付〜規模判定〜タスク展開〜進捗管理〜Slack個人通知までを自動化する。

---

## このツールでできること

| 機能 | 概要 |
|------|------|
| 案件登録 | サイドバーフォームから案件情報を入力。タレント本人・スタッフどちらでも登録可能 |
| AI規模判定 | Claude APIが案件内容をもとに規模（小/中/大）・エスカレーション先・リスクフラグを自動判定 |
| タスク自動展開 | 案件種別・規模に応じた対応タスクを一括生成し、タスク管理シートに書き込む |
| コンタクト履歴記録 | 案件登録時に初回ログを自動記録。以降の対応内容も追記可能 |
| Slack個人DM通知 | 案件登録時に担当スタッフへDMで即時通知。規模「大」の場合はタレント本人にも送信 |
| 毎朝リマインド | 返答期限3日前・実施予定日7日前を各担当者に個別DM |
| タレント・企業マスタ管理 | タレント情報（Slack Member ID含む）・企業情報をシートで管理 |
| API使用ログ | Claude API呼び出し履歴をシートに自動記録 |

### 案件規模の判定基準

| 規模 | 基準 | エスカレーション先 |
|------|------|-----------------|
| 小 | 単発・単独タレント・契約書不要 | 担当スタッフのみ |
| 中 | 複数タレントまたは長期・簡易契約あり | 担当スタッフ・マネジメント |
| 大 | 独占・大型予算・外部メディア露出 | 担当スタッフ・マネジメント・法務・営業・PR |

### 対応する案件種別

- 商品プロモーション（SNS・配信）
- タイアップ楽曲・MV出演
- ゲームコラボ（配信・イベント）
- リアルイベント出演
- グッズコラボ
- 外部メディア出演（雑誌・TV等）

---

## 構成ファイル

```
vtuber-collab-pm/
├── appsscript.json   マニフェスト（権限スコープ定義）
├── config.js         定数・シート名・ステータス定義
├── spreadsheet.js    シート初期化・共通CRUD操作
├── claude.js         Claude API呼び出し・APIログ
├── deals.js          案件登録・規模判定・タスク展開ロジック
├── talent.js         タレントマスタ・企業マスタ操作
├── slack.js          Slack Bot Token DM通知・リマインド
├── trigger.js        毎朝リマインドトリガー設定
├── menu.js           カスタムメニュー・フォーム制御
└── DealForm.html     案件登録サイドバーUI
```

---

## スプレッドシート構成（6シート）

| シート名 | 用途 |
|---------|------|
| 案件台帳 | 案件の基本情報・規模・ステータス・エスカレーション先 |
| タスク管理 | 案件別タスク一覧・担当者・期限・ステータス |
| タレントマスタ | タレント情報・Slack Member ID |
| 企業マスタ | クライアント企業情報 |
| コンタクト履歴 | 案件ごとの対応ログ |
| API使用ログ | Claude API呼び出し履歴 |

---

## セットアップ手順

### 1. 用意するもの

| 項目 | 取得場所 | 形式の例 |
|------|---------|---------|
| Claude APIキー | [Anthropic Console](https://console.anthropic.com) → API Keys | `sk-ant-api03-...` |
| Slack Bot Token | 後述の手順で取得 | `xoxb-...` |
| 各メンバーの Slack Member ID | 後述の手順で取得 | `U01XXXXXXXX` |
| Google Spreadsheet（新規） | Google Drive で作成 | — |

---

### 2. Slack Bot Token の取得

1. https://api.slack.com/apps を開く
2. 「Create New App」→「From scratch」→ App名とワークスペースを選択して「Create App」
3. 左メニュー「OAuth & Permissions」→「Bot Token Scopes」に以下を追加：

   | スコープ | 用途 |
   |---------|------|
   | `chat:write` | メッセージ送信 |
   | `im:write` | DM開始 |
   | `users:read` | 接続テスト用 |

4. 「Install to Workspace」→「許可する」
5. 表示された「Bot User OAuth Token」（`xoxb-...`）をコピー

---

### 3. Slack Member ID の取得

通知を受け取るメンバー全員分を取得してタレントマスタに登録する。

1. Slack でプロフィールを開く
2. 右上「・・・」→「メンバーIDをコピー」
3. `U01XXXXXXXX` 形式の文字列が取得できる
4. タレントマスタシートの「Slack Member ID」列に貼り付ける

> タレントだけでなく担当スタッフ分も登録する。スタッフ名は案件の「担当スタッフ」フィールドと一致させること。

---

### 4. GASプロジェクトの作成

1. Google Driveで新しいスプレッドシートを作成
2. 拡張機能 → Apps Script を開く
3. 各 `.js` ファイルをスクリプトとして、`.html` ファイルをHTMLとして追加
4. `appsscript.json` はプロジェクトの設定から「マニフェストを表示」して内容を差し替え

clasp を使う場合:

```bash
clasp push --force
```

---

### 5. 初期設定（GASエディタで実行）

**Step 1: APIキーを保存する**

以下の関数を一時的に作成して実行し、**実行後すぐに削除**する。

```javascript
function setupKeys() {
  saveClaudeApiKey('sk-ant-...');   // Claude APIキー
  saveSlackBotToken('xoxb-...');    // Slack Bot Token
}
```

> キーはコードに残さない。GASのスクリプトプロパティに保存される。

**Step 2: スプレッドシートを初期化する**

```javascript
initializeSpreadsheet()
```

6シートが作成される。

**Step 3: 毎朝リマインドを有効化する**

```javascript
setDailyReminderTrigger()
```

毎朝9時に各担当者へDMが送信される。

**Step 4: Slack接続テストを行う**

メニュー「案件管理」→「Slack接続テスト」

「接続成功: @botname (ワークスペース名)」が表示されればOK。

**Step 5: タレントマスタにSlack Member IDを登録する**

タレントマスタシートに直接入力する。

| タレントID | 名前 | Slack Member ID | メール |
|-----------|------|----------------|-------|
| TLT001 | 名前A | U01XXXXXXXX | — |
| TLT002 | スタッフB | U02YYYYYYYY | — |

---

## 使い方

スプレッドシートを開くとメニューバーに「案件管理」が追加される。

### 案件を登録する

1. メニュー「案件管理」→「新規案件を登録」
2. サイドバーに案件名・種別・企業名・タレント・返答期限・備考を入力
3. 「登録してAIに規模判定させる」を実行（約30秒）
4. 完了後に以下が自動で行われる：
   - 案件台帳に行が追加される
   - タスク管理にタスクが展開される
   - コンタクト履歴に初回ログが記録される
   - 規模「中」以上の場合、担当スタッフにSlack DMが届く

### リマインドをテストする

メニュー「案件管理」→「リマインド（即時テスト）」で手動送信して確認できる。

-モックで動作確認済み
---

## 注意事項

- APIキー・Slack Bot Tokenはコードに直接書かない。GASの `PropertiesService`（スクリプトプロパティ）で管理する
- Slack Bot TokenはワークスペースのBot Tokenで `xoxb-` から始まる。Incoming Webhookとは別物
- タレントマスタの「名前」列は案件フォームの「担当スタッフ」と完全一致させること（Slack通知の宛先解決に使用）
- event-pm との連携: 案件がリアルイベントに発展した場合、案件台帳の「イベントID」列に vtuber-event-pm のイベントIDを記入することで参照できる

---

## 動作環境

- Google Apps Script（V8ランタイム）
- Claude API（`claude-opus-4-6`）
- Google Workspace（スプレッドシート）
- Slack（Bot Token / chat.postMessage API）
