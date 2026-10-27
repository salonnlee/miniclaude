# miniclaude · 从零手撸一个 Claude Code

> Claude Code 是两样:会想的模型,和带它读文件、跑命令的程序——程序,这门课从零完整写出;模型,也亲手驯个迷你版搞懂原理。
> 一门可以「被重新教学」的课:讲义在 md,板书在 py,课堂回放在 git log。

双线作战:

- 🔵 **搓丹线**(序章 · Python + NumPy):手搓迷你语言模型,理解「模型到底是什么」;
- 🟠 **铸剑线**(正文 · TypeScript + Node):从零手撸 agent 程序,理解「Claude Code 到底是什么」。

## 🚀 快速开始

```bash
# 1. 环境(实测 Python 3.14;3.10+ 应当均可)
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# 2. 语料已随仓库附带(data/input.txt),无需任何下载;万一缺失再补:
#    curl -fsSL -o data/input.txt https://cs.stanford.edu/people/karpathy/char-rnn/shakespeare_input.txt

# 3. 听第一次心跳:一个只会查表的「复读机」
.venv/bin/python prologue/01_bigram.py

# 4. 交付版:散装三课重组成一个能继续长大的迷你 GPT(训练 → 考试 → 采样)
.venv/bin/python -m minigpt

# 5. 铸剑线(Node ≥ 23,直接跑 TS,零运行时依赖):课程表本地起服务,不再裸开 html
npm install
npm run course      # → http://127.0.0.1:8080/
npm run chat        # v0.4 聊天机器人(从 .env 读 GLM_API_KEY)
npm run typecheck   # tsc --noEmit
```

## 🧭 我该从哪进?(入口门户)

| 你是谁 / 你想要 | 入口 |
|---|---|
| 从头系统学 | 本文件 → `npm run course` 打开 **site/COURSE.html** 看全景 → 按 `prologue/01 → 02 → …` 顺序逐个啃 py(有 JS 底子就把 `prologue/python-for-js.md` 放手边) |
| 只想玩互动实验室(5 分钟) | `npm run course` 打开课程表,展开「🔬 实验室」抽屉:P0.1 抽签台(亲手抽字/贪心掉坑)、P0.4 MLP 调音台(真前向接龙,temperature/top-k 现场拧)、NN 内功合成台(XOR 训练 + softmax 试押)、3B 观影三台(神经元打分/loss 山小球/链式对表)、CH1 素颜相见台(curl 请求/响应透视 + messages 历史 replay 对账,真机实测 token)、CH2 chat.ts 透视台(81 行代码点段落出透视卡 + SSE 缓冲实验 + 真机流式连线) |
| 只想看海报 | `site/poster.png`(1080×1440,3:4) |
| 我是 AI,要给别人重讲这门课 | **LEARNER.md**(教师手册,先读它) |
| 想看这门课怎么一步步长出来 | `git log --reverse --oneline`——提交信息按教学脉络写,倒放即教程 |

## 📁 项目结构

```
├── README.md                 你在这里:入口门户
├── AGENTS.md                 协作规矩(写作八规 + 对外科普加码 + 命名与文件宪法)
├── LEARNER.md                AI 教师手册:给「想用本仓库重讲这门课」的 AI 或人类
├── package.json / tsconfig.json  Node 工程:npm run course 起课程表服务 / chat 跑 v0.4 /
│                             typecheck 类型检查(Node ≥ 23 原生跑 TS,零运行时依赖)
├── scripts/                  工程脚本
│   ├── serve.mjs             课程表服务器(Hono):静态托管 site/、/ 直达 COURSE.html、守卫拦目录穿越与点文件;/api/chat 流式代理(key 只住服务端,实验室真机区用)
│   ├── consistency.mjs       一致性校验(npm run check,pre-commit 自动跑):版本号单一源、实验室家数、
│   │                         chat.ts 行数声明、下一站指针、LEARNER 骨架过期、口径黑名单
│   └── git/pre-commit        提交前两道闸:密钥扫描(文件名 + 内容)+ 一致性校验
├── src/                      🟠 正文 · 铸剑线主战场
│   └── chat.ts               v0.4 聊天机器人(多轮循环+流式打字机+记账,npm run chat)
├── site/                     课程表整树(内部全相对路径引用,整树挪目录不断链)
│   ├── COURSE.html           课程总中枢·纯结构骨架:幕/章节容器 + 实验室骨架 +
│   │                         全景架构图 / 里程碑 / 教学契约;页尾只引一个 module 入口
│   ├── main.js               ESM 单入口:按序 import 七家实验室 + 渲染器 + 更新记录 + 页级行为
│   ├── COURSE.css            课程页全局样式(Tabler 设计语言:浅灰蓝底 + 白卡 + tint 徽章)
│   ├── COURSE-render.js      渲染器:课次 + 卡片 + 版本交付(ships → 章 chip / 里程碑表)
│   ├── COURSE-LOG.js         更新记录(数据 + 渲染器):最新日期在顶,统计全自动
│   ├── COURSE-page.js        页级行为:全景架构图播放器 + 锚点滚动联动
│   │   ├── content/lessons.js    课次数据·唯一事实源:课次行、徽章、折叠态、「更新于」
│   │   │                         与版本交付(ships→章 chip/里程碑表)全由它推导——完课/
│   │   │                         加课次/交付版本只改这里
│   ├── content/cards.js      卡片内容数据:全景卡/书单/T1 长文的 title+body,
│   │                         COURSE-render.js 注入空占位(改卡文字只改这里)
│   ├── svg/                  卡图独立文件(30 张,一卡一图或卡id-figN)——可单独点开预览
│   ├── labs/                 实验室资产(新增实验室 = 这里加一对文件 + main.js 挂一行 import)
│   │   ├── labs.css          实验室通用底座(.lab-* 两栏网格/面板/滑条)+ 各台专属样式
│   │   ├── shared.js         共用工具(ESM 导出):$id 取元素 / fmt 定点数 / chips 芯片组开关
│   │   └── lab-*.js          七家实验室:bigram 抽签台 / P0.4 MLP 调音台 / NN 内功合成台 /
│   │                         3B 观影三台 / 3B7 卷积三台 / CH1 素颜相见 + messages 透视台 /
│   │                         CH2 chat.ts 透视台(代码可点 × 透视卡 × 真机连线)
│   ├── mc/                   MiniClaude v0.5 网页对话框(右下角气泡:流式 + 多会话 + 记账,
│   │                         前端解析与 chat.ts 同款;正文后续功能面板长在这里)
│   ├── mc/                   MiniClaude 网页对话框(v0.5,产品本体):mc.js + mc.css
│   │                         右下角 💬 气泡唤起,浮窗/满屏两档,流式 + 多会话 + token 记账;
│   │                         自带变量兜底,引到任何页面都能活;CH3 起工具等功能面板长在这里
│   └── poster.svg / poster.png  3:4 极客风课程海报(SVG 里的光标会闪)
├── requirements.txt          Python 依赖(目前仅 numpy)
├── .env.example              API key 模板(cp 成 .env 填真实 key;真实 .env 永不入库)
├── prologue/                 🔵 序章 · 搓丹线(Python)
│   ├── 01_bigram.py          P0.1 数数表复读机:纯标准库,20 行理解「模型 = 概率表」
│   ├── 02_neural_bigram.py   P0.2 神经版 + 梯度下降:ln67 → 2.50,追平数数表 2.47
│   ├── 03_mlp.py             P0.3 前文加长:C 表 + MLP,dev 1.95 双杀数数表 2.54
│   ├── 0X-notes.md           各课讲义 + 学员追问实录(01 / 02 / 03 已建,随课随写)
│   └── python-for-js.md      JS 老手的 Python 速查卡(随课增补)
├── minigpt/                  🔵 序章交付 · 迷你 GPT v0.1(散装三课重组落包,python -m minigpt
│                             一条命令跑通一生;随课程演进:T 区拼注意力)
│   ├── data.py               语料 → 词表 → 窗口 → train/dev;窗口长度由模型报数,不再写死
│   ├── models.py             模型货架:BigramLM / MLPLM——同一个插头,后续章节挂新货
│   ├── engine.py             发动机:softmax + p − onehot 发令枪 + SGD,换模型不换发动机
│   ├── sample.py             滑窗接龙采样;temperature / top-k 旋钮拧在抽签一步(P0.4)
│   └── __main__.py           CLI 入口:读语料 → 裸采样 → 训练 → 考试 → 采样
├── sidequest/                🧠 支线 · 内功(神经网络补课,应学员需求插班)
│   ├── 01_learning_function.py  NN1 会学习的函数:旋钮 / loss / 数值梯度(纯标准库)
│   ├── 02_learning_function.py  NN2 神经元与 XOR:四幕剧 + 死区逃逸实录
│   ├── 03_backprop.py           NN3 反向传播:手推 × 数值梯度互证 27 行对表
│   ├── 04_softmax.py            NN4 softmax + 交叉熵:grad = p − y 互证 + 下山实验
│   └── *-notes.md              讲义与追问实录(与课次代码自动配对)
└── data/input.txt            莎士比亚语料,457 万字符(tinyshakespeare,已入库)
```

## 🧪 本仓库的环境事实(历史决策,勿踩坑)

- **Intel Mac、无 GPU**:PyTorch 无轮子(macOS 轮子 2.3 起仅 Apple Silicon)→ 定案走 **NumPy 手搓路线**(手写前向 / 反向传播,更贴「古法」);
- **真模型 API**:智谱 GLM,key 放 `.env`;`glm-4.6` 可用(`glm-4-flash` 报错 1314 是「不在套餐」,文案误导);GLM-4.6+ 是思考型模型,`max_tokens` 要给足;
- **敏感信息三层防线**:`.gitignore` 挡文件 + pre-commit 钩子扫密钥 + 提交前手动扫描。

## 📈 当前进度

序章 P0.1 ✅ · P0.2 ✅(2026-10-23 内功回填后通关)· P0.3 ✅(2026-10-27 一次开课,MLP dev 1.95 双杀数数表 2.54 与 bigram 2.49,插值修补底牌 1.79 与「死于斜率」定性入册)· mini-gpt 落包 minigpt/(2026-10-27 三课重组,MLP dev 1.9555 复现)· P0.4 temperature ✅(2026-10-27,v0.1 调温与限签)—— 序章全清 | 支线·内功 NN1–NN4 ✅ 全清(2026-10-22,附连读大全景 + 实验室) | 支线·观影 3B1–3B7 ✅(3B1–3B4 附连读全景 + 实验室三台,3B7 附卷积三台:骰子滑动 × 滤镜像机 × 大数乘法)· 3B8 ✅(2026-10-26)· 3B9 事实储存(加更) ✅(2026-10-26 伴读,七段×五图×对账表)—— 支线·观影全清收官 | 拼图·Transformer T1 ✅(2026-10-23 全貌长文 + 四图)· T2–T4 ⏳ | 待学清单:傅里叶变换 ⏳ · 稀疏自编码器(SAE)⏳(只记录不开课) | 正文 CH1 ✅(2026-10-27,curl 素颜相见三连 + 实验室解锁)· CH2 ✅(2026-10-27,四步长出 src/chat.ts v0.4:非流式循环 → 流式 SSE 打字机 → 退出记账,npm run chat 可玩;精简至 81 行 + chat.ts 透视台 + /api/chat 流式代理)· MiniClaude v0.5 ✅(2026-10-27,主线间隙交付:右下角 💬 气泡网页对话框,流式 + 多会话 + 记账,后续章节功能长在这只面板里)· CH3 ⏭ 下一站 · CH4–CH10 未开课 —— 实时状态以 **site/COURSE.html** 页面为准(数据源 site/content/lessons.js)。
