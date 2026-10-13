# next-steps-app

每一輪回答結束後，在輸入框上方建議最多三個「下一步」提示。**終端機與 Claude 桌面 App 都能顯示**。

改編自 [anthropics/claude-plugins-community 的 next-steps](https://github.com/anthropics/claude-plugins-community/tree/main/next-steps)（Thariq Shihipar，MIT）。

```
下一步
1  執行剛寫好的測試
2  對設定頁面做同樣的事
3  /code-review high
0  關閉
```

- 數字（強調色）與文字（一般色）分開上色，無按鈕底色，每個選項一行。
- 點選項，或在空的輸入框按 `1`、`2`、`3`，該提示會填入輸入框當草稿；編輯後自己按 Enter。`0` 關閉。
- 外掛不會自動送出任何提示。建議會用你正在使用的語言撰寫。

## 安裝

桌面 App 的 Code 分頁不能執行 `/plugin install`。請在**終端機**開啟 `claude`，輸入：

```
/plugin install next-steps-app --marketplace kitten3030/next-steps-app
```

按 `y` 加入 marketplace，選 user scope。安裝後，桌面 App 本機工作階段也會載入。

不想上 GitHub 時，可直接指定資料夾（`claude --plugin-dir <本資料夾路徑>`）。

## 選項

| 選項 | 預設 | 說明 |
| --- | --- | --- |
| `minAnswerChars` | `80` | 回答短於此字數時不建議 |
| `suggestSkills` | `true` | 讓建議器知道有哪些 skill 與斜線指令 |
| `blankBetween` | `false` | 每個建議之間是否空一行 |
