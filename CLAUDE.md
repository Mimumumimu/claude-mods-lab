# claude-mods-lab

Claude Code の mod（プラグイン）を置くリポジトリ。各 mod は直下のフォルダ（例: `usage-meter-bar/`）で、`claude-mods-lab` というローカル marketplace（`.claude-plugin/marketplace.json`）経由でユーザースコープにインストールしている。

## 最新を取得して差し替える（定型手順）

「最新を取得して」「差し替えて」と言われたら、確認なしで次を順に実行する。

1. `git pull`（リポジトリ: `D:\pgm\claude-mods-lab`）。新しいリモートブランチだけ増えた場合は取り込まず、その旨を伝える
2. 変わった mod ごとに `claude plugin validate <mod フォルダ>` で検証する。失敗したら差し替えずに報告する
3. `claude plugin marketplace update claude-mods-lab`
4. `claude plugin update <mod名>@claude-mods-lab`
5. `claude plugin list` で Version と Status（enabled）を確認して報告する
6. 「反映には Claude の再起動（新しいセッション）が必要」と伝える

### 注意点

- **`version` を上げ忘れると更新されない。** `plugin update` は `.claude-plugin/plugin.json` の `version` で判定する。pull しても version が同じなら、更新されない旨を伝え、version を上げるか確認する
- コミット・push はユーザーが明示的に指示するまでしない
- Claude 側で mod のコードを直した場合も、上の手順 2〜6 で反映する

## 新しい mod を追加するとき

1. 直下に `<mod名>/` を作る。`.claude-plugin/plugin.json`、`hooks/hooks.json`、`hooks/register.tsx`、必要なら `types/index.d.ts` を置く
2. `.claude-plugin/marketplace.json` の `plugins` に1件足す（`source` は `./<mod名>`）
3. `claude plugin validate .` を実行する
4. `claude plugin marketplace update claude-mods-lab` のあと `claude plugin install <mod名>@claude-mods-lab`

## 開発中だけ試したいとき（インストールしない）

```
claude --plugin-dir D:\pgm\claude-mods-lab\<mod名>
```

## 補足

- 使用量メーターの `$` 表示は API 従量換算の推定額で、サブスク利用では請求額ではない
- 古い `usage-meter@inline`（`C:\Users\mimumu\mods\usage-meter`）は削除済み。`CLAUDE_CODE_PLUGIN_DIRS` も外してあるので、二重読み込みにならない
