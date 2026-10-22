# miniclaude · 从零手撸一个 Claude Code

> 模型永远不造?不——序章先搓个小的;壳,整只撸。
> 一门可以「被重新教学」的课:讲义在 md,板书在 py,课堂回放在 git log。

双线作战:

- 🔵 **搓丹线**(序章 · Python + NumPy):手搓迷你语言模型,理解「模型到底是什么」;
- 🟠 **铸剑线**(正文 · TypeScript + Node):手撸 agent 壳,理解「Claude Code 到底是什么」。

## 🚀 快速开始

```bash
# 1. 环境(实测 Python 3.14;3.10+ 应当均可)
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# 2. 语料(data/ 不入库,可随时重新下载)
mkdir -p data
curl -fsSL -o data/input.txt https://cs.stanford.edu/people/karpathy/char-rnn/shakespeare_input.txt
#   备用镜像:https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt

# 3. 听第一次心跳:一个只会查表的「复读机」
.venv/bin/python prologue/01_bigram.py
```

## 🧭 我该从哪进?(入口门户)

| 你是谁 / 你想要 | 入口 |
|---|---|
| 从头系统学 | 本文件 → 浏览器打开 **COURSE.html** 看全景 → 按 `prologue/01 → 02 → …` 顺序逐个啃 py(有 JS 底子就把 `prologue/python-for-js.md` 放手边) |
| 只想玩互动实验室(5 分钟) | 浏览器打开 **COURSE.html**,展开「🔬 实验室」抽屉:P0.1 抽签台(亲手抽字/贪心掉坑)、NN 内功合成台(XOR 训练 + softmax 试押)、3B 观影三台(神经元打分/loss 山小球/链式对表) |
| 只想看海报 | `poster.png`(1080×1440,3:4) |
| 我是 AI,要给别人重讲这门课 | **LEARNER.md**(教师手册,先读它) |
| 想看这门课怎么一步步长出来 | `git log --reverse --oneline`——提交信息按教学脉络写,倒放即教程 |

## 📁 项目结构

```
├── COURSE.html               课程总中枢:课程表(含可展开的实验室抽屉)/ 全景架构图 /
│                             里程碑 / 教学契约——章节状态的唯一事实源(样式与更新记录
│                             拆在下面两个文件,三个文件同目录、相对路径引用)
├── COURSE.css                课程页全部样式
├── COURSE-LOG.js             更新记录(数据 + 渲染器):最新日期在顶,当天往下追加,
│                             天数 / 条数 / 最新一天默认展开全部自动计算
├── README.md                 你在这里:入口门户
├── LEARNER.md                AI 教师手册:给「想用本仓库重讲这门课」的 AI 或人类
├── poster.svg / poster.png   3:4 极客风课程海报(SVG 里的光标会闪)
├── requirements.txt          Python 依赖(目前仅 numpy)
├── .env.example              API key 模板(cp 成 .env 填真实 key;真实 .env 永不入库)
├── prologue/                 🔵 序章 · 搓丹线(Python)
│   ├── 01_bigram.py          P0.1 数数表复读机:纯标准库,20 行理解「模型 = 概率表」
│   ├── 02_neural_bigram.py   P0.2 神经版 + 梯度下降:ln67 → 2.50,追平数数表 2.47
│   ├── 0X-notes.md           各课讲义 + 学员追问实录(01 / 02 已建,随课随写)
│   └── python-for-js.md      JS 老手的 Python 速查卡(随课增补)
├── sidequest/                🧠 支线 · 内功(神经网络补课,应学员需求插班)
│   ├── 01_learning_function.py  NN1 会学习的函数:旋钮 / loss / 数值梯度(纯标准库)
│   ├── 02_learning_function.py  NN2 神经元与 XOR:四幕剧 + 死区逃逸实录
│   ├── 03_backprop.py           NN3 反向传播:手推 × 数值梯度互证 27 行对表
│   ├── 04_softmax.py            NN4 softmax + 交叉熵:grad = p − y 互证 + 下山实验
│   └── *-notes.md              讲义与追问实录(与课次代码自动配对)
├── scripts/git/pre-commit    提交前密钥扫描钩子(文件名 + 内容双保险)
└── data/input.txt            莎士比亚语料,457 万字符(gitignore,可重新下载)
```

## 🧪 本仓库的环境事实(历史决策,勿踩坑)

- **Intel Mac、无 GPU**:PyTorch 无轮子(macOS 轮子 2.3 起仅 Apple Silicon)→ 定案走 **NumPy 手搓路线**(手写前向 / 反向传播,更贴「古法」);
- **真模型 API**:智谱 GLM,key 放 `.env`;`glm-4.6` 可用(`glm-4-flash` 报错 1314 是「不在套餐」,文案误导);GLM-4.6+ 是思考型模型,`max_tokens` 要给足;
- **敏感信息三层防线**:`.gitignore` 挡文件 + pre-commit 钩子扫密钥 + 提交前手动扫描。

## 📈 当前进度

序章 P0.1 ✅ · P0.2 学至中途(转支线补课,即将回归)· P0.3 ⏳ · P0.4 ⏳ | 支线·内功 NN1–NN4 ✅ 全清(2026-10-22,附连读大全景 + 实验室) | 支线·观影 3B1–3B4 ✅(附四集连读全景 + 实验室三台)· 3B5–3B8 ⏳ | 正文 CH1–CH10 未开课 —— 实时状态以 **COURSE.html** 为准。
