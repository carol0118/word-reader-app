# 小朋友英语点读 APP

这是一个适合手机使用的轻量 PWA：

- 手机上直接拍照或上传英语图片
- 调用 OpenAI 视觉能力逐个提取单词
- 点击任意单词，调用 OpenAI TTS 播放发音
- 可添加到手机主屏幕，像 APP 一样打开

## 运行方式

1. 在 `word-reader-app` 目录下复制环境变量文件

   ```powershell
   Copy-Item .env.example .env
   ```

2. 打开 `.env`，填入 `OPENAI_API_KEY`

3. 启动服务

   ```powershell
   node server.js
   ```

4. 电脑浏览器访问

   ```text
   http://localhost:3000
   ```

5. 手机和电脑连接同一个 Wi-Fi，然后用手机浏览器打开终端打印出的局域网地址

   例如：

   ```text
   http://192.168.1.23:3000
   ```

## GitHub Pages

如果你要最省事的公网链接版本，直接用 GitHub Pages。

- 把 `public/` 里的文件发布到仓库根目录
- 识别使用浏览器端 OCR
- 发音使用浏览器内置语音
- 不需要服务端，不需要 OpenAI Key

具体步骤见 `deploy-github-pages.md`

## 安装到手机桌面

- Android Chrome
  打开网页后，可直接点页面底部“安装到手机桌面”，或者在浏览器菜单中选择“安装应用”
- iPhone Safari
  打开网页后，点 Safari 的分享按钮，再点“添加到主屏幕”

## 可调参数

- `OPENAI_VISION_MODEL`
  默认 `gpt-4.1-mini`，用于图片识别
- `OPENAI_TTS_MODEL`
  默认 `gpt-4o-mini-tts`，用于发音
- `OPENAI_TTS_VOICE`
  默认 `alloy`

## 说明

- API Key 只放在服务端 `.env` 中，不暴露到浏览器
- 服务已监听 `0.0.0.0`，便于手机通过局域网访问
- 识别结果会做去重和基础清洗，适合单词卡、课本、练习页这类清晰图片
- 如果图片里文字很密、弯曲、遮挡严重，识别质量会下降

## 参考的官方接口

- Responses API：图片识别
- Audio Speech API：单词发音
