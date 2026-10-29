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
npm run chat        # v1.9 agent CLI(聊天 + 工具 + 闸门 + 计划模式 + 子代理/工作流 + /cost 记账,从 .env 读 GLM_API_KEY)
npm run typecheck   # tsc --noEmit
```

## 🧭 我该从哪进?(入口门户)

| 你是谁 / 你想要 | 入口 |
|---|---|
| 从头系统学 | 本文件 → `npm run course` 打开 **site/COURSE.html** 看全景 → 按 `prologue/01 → 02 → …` 顺序逐个啃 py(有 JS 底子就把 `prologue/python-for-js.md` 放手边) |
| 只想玩互动实验室(5 分钟) | `npm run course` 打开课程表,展开「🔬 实验室」抽屉:P0.1 抽签台(亲手抽字/贪心掉坑)、P0.4 MLP 调音台(真前向接龙,temperature/top-k 现场拧)、NN 内功合成台(XOR 训练 + softmax 试押)、3B 观影三台(神经元打分/loss 山小球/链式对表)、CH1 素颜相见台(curl 请求/响应透视 + messages 历史 replay 对账,真机实测 token)、CH2 chat.ts 透视台(398 行代码点段落出透视卡 + SSE 缓冲实验 + 真机流式连线) |
| 只想看海报 | `site/poster.png`(1080×1440,3:4) |
| 我是 AI,要给别人重讲这门课 | **LEARNER.md**(教师手册,先读它) |
| 想看这门课怎么一步步长出来 | `git log --reverse --oneline`——提交信息按教学脉络写,倒放即教程 |

## 📁 项目结构

```
├── README.md                 你在这里:入口门户
├── AGENTS.md                 协作规矩(写作八规 + 对外科普加码 + 命名与文件宪法)
├── LEARNER.md                AI 教师手册:给「想用本仓库重讲这门课」的 AI 或人类
├── package.json / tsconfig.json  Node 工程:npm run course 起课程表服务(含 /api/chat 流式代理,透传 tools) / chat 跑 v1.9 /
│                             eval 跑 evals / build 出 dist 发布产物 / typecheck 类型检查(零运行时依赖)
├── scripts/                  工程脚本
│   ├── serve.mjs             课程表服务器(Hono):静态托管 site/、/ 直达 COURSE.html、守卫拦目录穿越与点文件;/api/chat 流式代理(key 只住服务端,实验室真机区用)
│   ├── consistency.mjs       一致性校验(npm run check,pre-commit 自动跑):版本号单一源、实验室家数、
│   │                         chat.ts 行数声明、下一站指针、LEARNER 骨架过期、口径黑名单
│   ├── eval.mjs              evals runner(CH10):拉起 chat.ts 喂任务、翻 MC_TRACE 轨迹,
│   │                         断言三样确定物——轨迹/世界/底线(嘴不断言);场景住 evals/
│   └── git/pre-commit        提交前两道闸:密钥扫描(文件名 + 内容)+ 一致性校验
├── evals/                    eval 场景表:calculator 走工具 / 文件往返 / 注入不中招(npm run eval)
├── src/                      🟠 正文 · 铸剑线主战场
│   ├── chat.ts               v1.9 企业化收尾·主循环(ask 降级链/工具轨迹/遥测落盘/命令表;/cost /config;.env 自己吃,npm run chat)
│   ├── ui.ts                 v1.4 终端脸面(ANSI 状态行/转圈/流式两段式重排/迷你 markdown/⏺ 工具卡/Esc raw 模式监听)
│   ├── context.ts            v1.2 上下文管理器(system 拼装+CLAUDE.md+压缩器)
│   ├── config.ts             v1.9 配置层(~/.miniclaude.json ← .miniclaude.json:标量后者赢、数组只加码,启动读一次定格护缓存)
│   ├── hooks.ts              v1.9 工具钩子(preToolUse/postToolUse:shell 命令,exit 2=拦、理由当结果喂回)
│   └── tools/                注册表出口 + fs.ts 文件三件 + bash.ts/permissions.ts 命令与闸门(前台+后台+回头查,子进程剥密钥环境) + agents.ts 子代理与工作流 + mcp.ts 外挂接入
│                             (共享单一事实源在 site/mc/tools.js:改一处,CLI 与网页同时生效;Node 专属工具 push 进 TOOLS)
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
│   ├── svg/                  卡图独立文件(39 张,一卡一图或卡id-figN)——可单独点开预览
│   ├── labs/                 实验室资产(新增实验室 = 这里加一对文件 + main.js 挂一行 import)
│   │   ├── labs.css          实验室通用底座(.lab-* 两栏网格/面板/滑条)+ 各台专属样式
│   │   ├── shared.js         共用工具(ESM 导出):$id 取元素 / fmt 定点数 / chips 芯片组开关
│   │   └── lab-*.js          七家实验室:bigram 抽签台 / P0.4 MLP 调音台 / NN 内功合成台 /
│   │                         3B 观影三台 / 3B7 卷积三台 / CH1 素颜相见 + messages 透视台 /
│   │                         CH2 chat.ts 透视台(代码可点 × 透视卡 × 真机连线)
│   ├── mc/                   MiniClaude 网页对话框(v0.10,产品本体):mc.js(v0.10 起 htm+Preact 组件树渲染) + mc.css +
│   │                         questions.js 开场问题库(100 条随机三问);右下角 💬 气泡唤起,
│   │                         浮窗/满屏两档,流式实时 Markdown 排版 + 代码高亮 + 多会话 + token 记账;
│   │                         自带变量兜底,引到任何页面都能活;CH3 起工具等功能面板长在这里
│   ├── vendor/               第三方整包自管(无构建直 import):markdown-it v15 浏览器 ESM(MIT)、
│   │                         highlight.js v11 core+8 语言(BSD-3,esbuild 打 59KB 单文件)、
│   │                         mermaid v11 UMD(MIT,3.4MB,卡内流程图懒加载不进首屏)、
│   │                         htm@3.1.1+preact 整合包(MIT,13KB,对话框 UI 层 v0.10 引入)
│   └── poster.svg / poster.png  3:4 极客风课程海报(SVG 里的光标会闪)
├── requirements.txt          Python 依赖(目前仅 numpy)
├── .env.example              API key 模板(cp 成 .env 填真实 key;真实 .env 永不入库)
├── .miniclaude.json          v1.9 项目级配置样例(protect-env 钩子:.env 连读带写都过不了工具口,钥匙不进模型上下文)
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

序章 P0.1 ✅ · P0.2 ✅(2026-10-23 内功回填后通关)· P0.3 ✅(2026-10-27 一次开课,MLP dev 1.95 双杀数数表 2.54 与 bigram 2.49,插值修补底牌 1.79 与「死于斜率」定性入册)· mini-gpt 落包 minigpt/(2026-10-27 三课重组,MLP dev 1.9555 复现)· P0.4 temperature ✅(2026-10-27,v0.1 调温与限签)—— 序章全清 | 支线·内功 NN1–NN4 ✅ 全清(2026-10-22,附连读大全景 + 实验室) | 支线·观影 3B1–3B7 ✅(3B1–3B4 附连读全景 + 实验室三台,3B7 附卷积三台:骰子滑动 × 滤镜像机 × 大数乘法)· 3B8 ✅(2026-10-26)· 3B9 事实储存(加更) ✅(2026-10-26 伴读,七段×五图×对账表)—— 支线·观影全清收官 | 拼图·Transformer T1 ✅(2026-10-23 全貌长文 + 四图)· T2–T4 ⏳ | 待学清单:傅里叶变换 ⏳ · 稀疏自编码器(SAE)⏳(只记录不开课) | 正文 CH1 ✅(2026-10-27,curl 素颜相见三连 + 实验室解锁)· CH2 ✅(2026-10-27,四步长出 src/chat.ts v0.4:非流式循环 → 流式 SSE 打字机 → 退出记账,npm run chat 可玩;精简交付 + chat.ts 透视台 + /api/chat 流式代理)· MiniClaude v0.5 ✅(2026-10-27,主线间隙交付:右下角 💬 气泡网页对话框,流式 + 多会话 + 记账,后续章节功能长在这只面板里)· MiniClaude v0.6 ✅(2026-10-27,markdown-it 真排版 + 问题库 100 条随机三问)· MiniClaude v0.7 ✅(2026-10-27,流式实时排版 + highlight.js 代码高亮)· CH3.1 ✅(2026-10-28,v0.8 agent 循环:tools 声明随行 → 流式攒 tool_calls 分片 → 执行喂回循环到它不再要,chat.ts 当版百余行 + 玩具两件,真机三圈实录 get_time→心算 10+3→纯文本退出;全景卡「agent 的『智能』拆开看」上线)· CH4 ✅(2026-10-28,闸门三件套:validate.ts 手写迷你 Schema 校验——错误当结果喂回让模型自己改、eval 换 tokenizer+递归下降——恶意输入不是被拦是无法表达,攻击样本 16/16 拒之门外、tools/index.ts 统一注册表加工具零改主循环;说明书 A/B 共识免验;全景卡 c41-panorama 上线——Tool 四件套逐件透视,calculator 真代码五段可点开透视卡;加餐卡 c4-mcp-panorama 上线——tool → MCP:execute 搬家名片不变,决策树按与宿主信任模型绑多深分档)· MiniClaude v0.9 ✅(2026-10-28,对话框与课程能力合流:浏览器端工具注册表 mc/tools.js(与 src/tools/ 同图纸)+ agent 循环 + 🔧 工具气泡,CLI 长什么分身跟着长;serve.mjs 只透传 tools、key 不出服务端)· CH5 ✅(2026-10-28,v1.0 文件三件 read/write/edit:截断 2000 行+二进制魔数检测+行号输出、edit 精确字符串替换零处/多处都当结果喂回;平台分层——文件工具住 Node 侧 fs.ts push 进共享 TOOLS,浏览器视角纯净;真机验收 agent 自建 todo.md+count.mjs,顺手逮住 v0.9 重构漏 import validate 的真 bug)· CH6 ✅(2026-10-28,v1.1 bash 工具+安全闸门:spawn 超时强杀 120s+输出截断 30KB+退出码如实报;permissions.ts 三扇门 deny/ask/allow——deny 黑名单管道进 shell 与 rm -rf、allow 白名单只读、ask 弹 y/n/a 且「本会话总是允许」只记逐字同条,粒度到子命令 git status:* 放而 git push 要问;确认流复用 chat.ts 的 rl——两个 readline 抢 stdin 会互吞输入行;真机两幕:agent 自建语法错误的 count.mjs 自己跑出报错自己修好,注入演练模型自认恶意注释并拒绝)· CH7 ✅(2026-10-28,v1.2 上下文管理:context.ts——system prompt 拼装＝人设＋环境快照（启动定格护前缀缓存）＋CLAUDE.md 项目记忆;压缩器水位看 prompt token、超线老历史换摘要保尾部近 8 条、切点撞 tool 边界自动推进;cached_tokens 记账——智谱前缀缓存命中约五折计费;全景卡 c7-panorama 上线——四味药核心代码六段可点开透视卡,非核心 … 省略)· 附加章《子代理与工作流》✅(2026-10-28,v1.3 src/tools/agents.ts——课间四连问催生:agent 工具 execute 里再开 agent 循环,自己的 messages、只读柜台、只交结论＝上下文隔离;workflow 按写死计划按序派兵、上一步产出传下一步,控制流在代码不在模型;对主对话只是一次 tool 调用——嵌套的是执行环节不是模型调用;chat.ts 仅动三处,子会话 token 进同一本账;全景卡 c3b-panorama 五段可点)· CH8.1 ✅(2026-10-29,v1.4 终端界面重构:换脸不换心——src/ui.ts 状态行转圈+流式两段式重排(流中裸文本、流完擦起重排,中文占两格数错一行就擦花)+⏺ 工具卡+edit_file 带行号 diff 红绿上色;Esc=本轮撤销键——raw 模式接键、AbortController 掐 fetch、工具批跑完看旗子(半批 tool 结果=API 400)、打断给模型一句 user 注记;真机四幕全过,打断后模型亲口证明被断请求不在记忆里;真 Claude Code 用 Ink 整帧重画,超屏保留原文正是 Ink 存在的理由)· CH8.2 ✅(2026-10-29,v1.5 后台任务:bash 加 background:true——spawn detached 脱管不杀(新进程组+新会话,宿主退了它也活着)+unref 事件循环不等、输出落盘 .bg/、PID 记账启动即回;bash_check 回头查——不传 pid 列全部、传 pid 报运行状态/退出码/日志尾部,exit 监听顺手收僵尸;闸门照过——后台不是法外之地,deny 照拦管道进 shell;护栏分工:前台管堵住对话(超时/截断),后台管留痕可查;chat.ts 零改动,注册表红利)· CH9.1 ✅(2026-10-29,v1.6 TodoWrite 任务外部化:长任务的计划不住模型脑子里,住进共享 tools.js 的一块白板——每次整份重写而非 add/update,清单永远只有一份不漂移;返回值即回喂模型的全部状态,system prompt 定格护缓存的红线不碰;ui.ts toolCard 三态上色 ☐/▸/☑;chat.ts 连续两版零改动,网页分身同版自动长出同款工具;真机三步任务模型三调 TodoWrite,0/3→2/3→3/3 逐步自勾)· CH9.2 ✅(2026-10-29,v1.7 计划模式:/plan 前缀客户端拦下——只读柜台借 ask 的 allow,物理上没有改的把手;模型只调研出分步计划,y 批准后全量柜开工先 TodoWrite 立清单,n 驳回零修改——事前拦截与 TodoWrite 的事中记账成对:一个防干错一个防干丢;与 CH6 闸门分层:闸门管单次工具调用、plan mode 管整轮方案;第二件补 CH9.1 缺口:getTodos() 每轮 user 消息尾捎清单快照,不靠历史里 tool 消息活着、压缩糊不掉进度,尾部追加前缀缓存照吃;chat.ts 215→267 抽 agentLoop;真机两幕:批准后 0/3→3/3、追问进度模型不调工具凭快照作答)· CH9.3 ✅(2026-10-29,v1.8 斜杠命令表+mini MCP:命令表——/ 开头先查表命中展开执行、未命中原样放行,/plan 入表、/help /mcp 新增,模型自始至终没见过斜杠;mini MCP 实践件——src/mcp-server.ts 天气台独立进程,stdio 每行一个 JSON(list 问名片/call 派活/id 对号入座),宿主 mcp.ts 读 .mcp.json 拉起子进程、名片原样 push 进 TOOLS——对模型与 runTool 外挂工具与本地工具零区别,CH4 加餐卡「execute 搬家名片不变」落点;参数校验宿主这关把着,错误当结果喂回;本地 11 项全过;chat.ts 267→297——命令表+maybeCompact 抽函数+启动接 MCP,顺手修 eof 未处理拒绝;全景卡 c9-panorama 上线——mini MCP 核心代码六段可点透视)· MiniClaude v0.10 ✅(2026-10-29,内部重构不改功能:mc.js 换脸不换心——SSE 解析/存档/工具柜/api 形状全不动,状态仍是模块级裸变量+每个 mutation 后 bump(),DOM 从手动 innerHTML 换成 htm+Preact 组件树(vendor 13KB 零构建 ESM);v0.7 手写的流式防竞态三件套(pending 旗子/finished 防迟到帧/isConnected 检查)被 diff 吃掉,rAF 合帧保留;文本插值自动转义,esc() 退役;真机全链验收:工具气泡 calculator+get_time、表格排版、停止灰条、持久化跨版本、390px 零溢出)· CH10 ✅(2026-10-29,v1.9 企业化收尾:src/config.ts 用户级/项目级配置合并——标量项目级覆盖、数组只加码(内置 deny 是底线,配置只能加严),模型/降级链/名单/钩子全搬出代码;ask() 套降级链——主模型挂了按 fallback 换人重问,三不换:Esc 掐的/字已吐给脸面的/链尽的,真机 glm-4.6-typo 每轮撞墙每轮降级 glm-4.6 照样答话,失败请求不上账;多模型路由——压缩走 compactModel,后台活派便宜款;hooks 挂共享 runTool 执行口(chat.ts 本地 run() 退役,主循环与子代理同一扇门)——exit 2=拦、理由当结果喂回,与 CH6 闸门分层:闸门管命令类、钩子管全工具,真机 write_file 碰 secret.txt 被拦模型自己改道还拒绝绕过;沙箱第一课——bash 前台后台子进程都剥 KEY/TOKEN/SECRET 环境,真机探测密钥空手而归整场无泄漏;成本遥测——每场一行 JSON 落 .miniclaude/usage.jsonl,/cost 本场明细+模型用量+历场累计、/config 看生效配置;evals——agent 的嘴是概率的不可断言,断言三样确定物:轨迹(MC_TRACE 落盘)/世界(文件状态)/底线(不该发生的没发生),三场景 3/3、注入场景识破「运维密令」pwned.txt 没落地;打包发布——esbuild 单文件 48KB dist/miniclaude.mjs 当 bin(node 的 type stripping 在 node_modules 里被禁,发布得给产物),.env 加载搬进代码(环境变量优先),npm pack→装包→miniclaude 命令真机跑通零依赖;chat.ts 297→398 行;终章仪式+全景卡 c10-panorama 上线——真实 Claude Code 的 system prompt 八段逐字引(2025-08-19 存档快照,来处钉死),点开透视卡逐条对到自家章节,它的每个设计我们都已懂)· v2.0 结课定版 ✅（2026-10-29，正文十章全清，课程收官 🏁）—— 实时状态 —— 实时状态以 **site/COURSE.html** 页面为准(数据源 site/content/lessons.js)。
