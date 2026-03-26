# GitHub Pages 部署

这个版本已经改成纯前端，可直接部署到 GitHub Pages。

## 最简单做法

1. 新建一个 GitHub 仓库
2. 把 `word-reader-app/public` 目录里的文件上传到仓库根目录
3. 在 GitHub 仓库设置里开启 Pages
4. Source 选择 `Deploy from a branch`
5. Branch 选择 `main`，目录选择 `/root`

发布后会得到一个链接：

`https://你的用户名.github.io/仓库名/`

## 注意

- 第一次打开识别功能会下载 OCR 组件，所以会慢一点
- 发音使用浏览器自带语音，不走 OpenAI
- GitHub Pages 版本没有服务端，所以没有中文释义接口
