# 食レポ同好会 公式サイト セットアップ

GitHub Pagesで動く静的サイトです。  
HTML / CSS / JavaScriptのみで、認証・DB・画像保存はSupabaseを使います。

## 1. Supabaseプロジェクト作成

1. Supabaseでアカウント作成
2. New projectを作成
3. Project URL と anon public key / publishable key を控える
4. `app.js` 冒頭を貼り替える

```js
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'xxxxx';
