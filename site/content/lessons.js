/* ============================================================================
   content/lessons.js —— 课次数据（唯一事实源，配 COURSE-render.js 渲染）
   ----------------------------------------------------------------------------
   COURSE.html 里不再手写课次行：每个 <ul class="ch-list" data-lessons="key">
   是空容器，渲染器把下面的 groups 按出现顺序填进去（第 i 组 → 第 i 个容器）。
   页头「更新于」、幕头/章头徽章、幕的折叠态，全部由这里的数据自动推导，
   不再手改。

   常见操作：
   · 完课        → 该课次条目加 done: '2026-10-26'(备注限一句短语，约 15 字内，如 '2026-10-26(伴读模式)';
                    复盘细节一律进 COURSE-LOG.js——课次行只报日期与一句话，不背长文);
                    幕徽章/折叠/「更新于」自动跟着变。
   · 加课次      → 往对应章最后一组（或新起一组，新组需在 HTML 加一个空容器）末尾加一条。
   · 加待学条目  → backlog 组加一条，写法同课次行。
   · 拼图(T 区)  → done 即「已拼上」（sem: 'puzzle'）。

   行字段：
   · done      'YYYY-MM-DD'，可带全角括号备注（一句短语）；有 done 不写 mark
   · mark      待开标记： '⏭ 下一站' / '⏳ 待拼' / '⏳'
   · tail      行尾追加文字（不含前导空格，渲染器自动补），如 '—— 拓展视野：…'
   · noGap     仅当 name 结尾紧贴 ✅ 且原文无空格时为 true(全表只有 P0.1、NN2)
   · label     非课次的说明行（知识点/实践/总结/仪式），不参与状态推导
   ============================================================================ */
export const LESSONS = {
  "updated": "",
  // —— 版本交付表（单一事实源）：渲染器据此点亮章交付 chip(foot-chip ver)
  //    与里程碑表；COURSE.html 不再手写任何版本号。
  //    交付新版本 = 对应条目填 ver + chip + at(chip 挂哪章)；未交付条目
  //    ver 置 null，页面显示「—」、章 chip 自动隐藏。
  "ships": [
    { "at": "p0",  "ver": "v0.1", "chip": "交付 v0.1 · minigpt/",    "what": "莎士比亚嘴替——你手搓的真·迷你 GPT(CPU 训练)", "range": "序章" },
    { "at": "ch2", "ver": "v0.4", "chip": "交付 v0.4 · src/chat.ts", "what": "流式多轮聊天，退出时报账", "range": "第 1–2 章" },
    { "ver": "v0.5", "what": "网页对话框——右下角气泡唤起，流式聊天 + 多会话 + 记账", "range": "主线间隙" },
    { "ver": "v0.6", "what": "对话框升级——Markdown 真排版 + 问题库 100 条随机三问", "range": "主线间隙" },
    { "ver": "v0.7", "what": "对话框再升级——流式实时排版 + 代码高亮", "range": "主线间隙" },
    { "at": "ch3", "ver": "v0.8", "chip": "交付 v0.8 · src/chat.ts + tools/", "what": "会调工具的 Agent 循环（玩具工具）", "range": "第 3–4 章" },
    { "ver": "v0.9", "what": "对话框长出工具调用——浏览器端 agent 循环 + 🔧 工具气泡，与 CLI 同一张图纸", "range": "主线间隙" },
  { "at": "ch5", "ver": "v1.0", "chip": "交付 v1.0 · src/tools/fs.ts", "what": "文件读写三件——agent 开始碰真文件（截断/二进制检测/精确替换）", "range": "第 5 章" },
  { "at": "ch6", "ver": "v1.1", "chip": "交付 v1.1 · src/tools/bash.ts + permissions.ts", "what": "跑命令且有安全闸门（deny/ask/allow 三扇门 + 确认流）", "range": "第 6 章" },
    { "ver": null, "what": "读写你的代码，自己发现并修好 bug", "range": "第 5 章" },
    { "ver": null, "what": "跑命令，且有安全闸门", "range": "第 6 章" },
    { "at": "ch7", "ver": "v1.2", "chip": "交付 v1.2 · src/context.ts", "what": "上下文管理——system 拼装 + CLAUDE.md 记忆 + 自动压缩 + 缓存记账", "range": "第 7 章" },
    { "at": "ch3b", "ver": "v1.3", "chip": "交付 v1.3 · src/tools/agents.ts", "what": "子代理与工作流——agent 工具 execute 里再开循环(上下文隔离),workflow 按写死计划按序派兵", "range": "第二幕附加章" },
    { "at": "ch8", "ver": "v1.4", "chip": "交付 v1.4 · src/ui.ts", "what": "终端界面重构——换脸不换心：状态行转圈+流式两段式重排+工具卡+Esc 打断+diff 上色", "range": "第 8 章" },
    { "at": "ch8", "ver": "v1.5", "chip": "交付 v1.5 · src/tools/bash.ts", "what": "后台任务——spawn 脱管不杀、PID 记账、日志回头查（bash_check）", "range": "第 8 章" },
    { "at": "ch9", "ver": "v1.6", "chip": "交付 v1.6 · site/mc/tools.js + src/ui.ts", "what": "TodoWrite 任务外部化——整份重写的任务白板，终端三态上色，两端同版长出", "range": "第 9 章" },
    { "at": "ch9", "ver": "v1.7", "chip": "交付 v1.7 · src/chat.ts + site/mc/tools.js", "what": "计划模式(/plan 只读柜台→批准→执行)+ 清单快照每轮重注入——事前拦截与事中记账成对", "range": "第 9 章" },
    { "at": "ch9", "ver": "v1.8", "chip": "交付 v1.8 · src/mcp-server.ts + src/tools/mcp.ts", "what": "斜杠命令表(/help /mcp 入表,未命中放行)+ mini MCP server——名片进柜子、execute 住子进程", "range": "第 9 章" },
    { "ver": "v0.10", "what": "对话框 htm+Preact 岛屿化——状态还在裸变量、DOM 交给组件树,流式/工具/抽屉/记账换脸不换心", "range": "主线间隙" },
    { "at": "ch10", "ver": "v1.9", "chip": "交付 v1.9 · src/config.ts + src/hooks.ts", "what": "企业化收尾——配置合并/降级链/成本遥测/hooks/沙箱剥密钥/evals/esbuild 打包发布", "range": "第 10 章" },
    { "ver": null, "what": "子代理 / 计划模式 / 技能 / MCP", "range": "第 9 章" },
    { "ver": null, "what": "配置、缓存、沙箱、发布——企业级收尾", "range": "第 10 章" }
  ],
  "lists": {
    "p0": {
      "groups": [
        [
          {
            "code": "P0.1",
            "name": "bigram 复读机（纯标准库）",
            "done": "2026-10-19",
            "noGap": true
          }
        ],
        [
          {
            "code": "P0.2",
            "name": "神经版 + 梯度训练",
            "done": "2026-10-23（内功 NN1–NN4 回填后一次通关，考题 Q1/Q2 交卷）"
          }
        ],
        [
          {
            "code": "P0.3",
            "name": "前文加长：击穿数数表",
            "done": "2026-10-27（一次开课；MLP 双杀数数表）"
          }
        ],
        [
          {
            "code": "P0.4",
            "name": "temperature 调参",
            "done": "2026-10-27（minigpt v0.1：调温与限签旋钮，只管说话不管学习）"
          }
        ],
        [
          {
            "label": "知识点",
            "text": "token 与采样；bigram 统计；embedding 与 MLP；训练循环、loss 与梯度下降；temperature / top-k"
          },
          {
            "label": "总结",
            "text": "大模型与它的区别只是大了十万倍、吃了十万倍；它不会听话、不会工具调用——这正是正文要手写的 agent 程序存在的意义"
          }
        ]
      ]
    },
    "nn": {
      "groups": [
        [
          {
            "code": "NN1",
            "name": "会学习的函数：旋钮（参数）、loss（打分）、数值梯度（量坡）、训练循环（下坡）——纯标准库",
            "done": "2026-10-20"
          }
        ],
        [
          {
            "code": "NN2",
            "name": "神经元 = 加权求和 + 激活；多层与非线性的必要性（XOR 之役）",
            "done": "2026-10-22（恢复直讲完课）",
            "noGap": true
          }
        ],
        [
          {
            "code": "NN3",
            "name": "反向传播 = 链式法则：手推梯度与数值梯度互证",
            "done": "2026-10-22（一次开课通关）"
          }
        ],
        [
          {
            "code": "NN4",
            "name": "softmax + 交叉熵：grad = p − y 数值验证 → 回归主线 02，豁然开朗",
            "done": "2026-10-22（一次开课通关）"
          }
        ]
      ]
    },
    "3b": {
      "groups": [
        [
          {
            "code": "3B1",
            "name": "神经网络的结构",
            "done": "2026-10-21"
          }
        ],
        [
          {
            "code": "3B2",
            "name": "梯度下降法",
            "done": "2026-10-21"
          }
        ],
        [
          {
            "code": "3B3",
            "name": "反向传播（上）",
            "done": "2026-10-21"
          }
        ],
        [
          {
            "code": "3B4",
            "name": "反向传播（下）",
            "done": "2026-10-21"
          }
        ],
        [
          {
            "code": "3B5",
            "name": "GPT 与 Transformer",
            "done": "2026-10-23"
          }
        ],
        [
          {
            "code": "3B6",
            "name": "直观解释注意力机制",
            "done": "2026-10-26（伴读模式）"
          }
        ],
        [
          {
            "code": "3B7",
            "name": "卷积是什么",
            "done": "2026-10-26（伴读模式）"
          }
        ],
        [
          {
            "code": "3B8",
            "name": "卷积神经网络（CNN）可视化",
            "done": "2026-10-26",
            "tail": "—— 拓展视野：支线不深入，看个热闹即可"
          },
          {
            "code": "3B9",
            "name": "大语言模型如何储存事实（系列加更）",
            "done": "2026-10-26（伴读模式）"
          }
        ]
      ]
    },
    "ch1": {
      "groups": [
        [
          {
            "code": "CH1.1",
            "name": "素颜相见实验",
            "done": "2026-10-27（curl 三幕：裸调 → 无历史失忆 → 塞回数组记起）",
            "tail": "—— 实验室已解锁：curl 素颜相见 + messages 透视台"
          },
          {
            "label": "知识点",
            "text": "token 与 context window;chat API 的形状（system / user / assistant）；「记忆」其实是历史重放"
          },
          {
            "label": "实践",
            "text": "不写代码——用 curl 裸调一次 API，亲眼看请求与响应的原始 JSON"
          }
        ]
      ]
    },
    "ch2": {
      "groups": [
        [
          {
            "code": "CH2.1",
            "name": "v0.4 · 聊天机器人",
            "done": "2026-10-27（v0.4 四步长成：脚手架 → 非流式 → 流式 SSE → 退出记账）",
            "tail": "—— npm run chat 可玩 · 实验室已解锁：chat.ts 透视台（398 行代码可点 × 透视卡 × 真机连线）"
          },
          {
            "label": "知识点",
            "text": "项目脚手架；API key 安全；维护 messages 历史；流式输出（SSE）为什么体验完全不同；token 与账单"
          },
          {
            "label": "实践",
            "text": "多轮对话 CLI：打字机效果、退出时报告花了多少钱"
          }
        ]
      ]
    },
    "ch3": {
      "groups": [
        [
          {
            "code": "CH3.1",
            "name": "工具调用",
            "done": "2026-10-28（v0.8 三步曲：声明随行 → 攒分片 → 喂回循环）",
            "tail": "—— npm run chat 可玩 · 全景卡已上：agent 的「智能」拆开看"
          },
          {
            "label": "知识点",
            "text": "tool use 三步曲：声明工具（JSON Schema）→ 模型回 tool_use → 你执行后喂回 tool_result，循环到它不再要工具；附赠 ReAct 历史课"
          },
          {
            "label": "实践",
            "text": "玩具工具 get_time / calculator——看它为了回答「现在几点？3 小时后呢？」自己决定连调两次"
          }
        ]
      ]
    },
    "ch4": {
      "groups": [
        [
          {
            "code": "CH4.1",
            "name": "工具注册表与说明书工程",
            "done": "2026-10-28（校验/递归下降 eval/统一注册表三件一次落齐）",
            "tail": "—— npm run chat 可玩 · 说明书 A/B 玩法留作自选实验 · 全景卡已上：Tool 四件套逐件透视 · 加餐卡已上：tool → MCP 演化全景（execute 搬家，名片不变）"
          },
          {
            "label": "知识点",
            "text": "Tool = name + description + JSON Schema + execute;description 就是提示词工程；统一注册表；参数校验"
          },
          {
            "label": "总结",
            "text": "工具报错不要崩溃——把错误当结果返回，让模型自我修复（agent 鲁棒性的头号秘密）"
          }
        ]
      ]
    },
    "ch5": {
      "groups": [
        [
          {
            "code": "CH5.1",
            "name": "文件读写工具",
            "done": "2026-10-28（v1.0 文件三件：读截断、写建目录、精确替换）",
            "tail": "—— npm run chat 可玩 · 顺手逮住 v0.9 重构漏 import validate 的真 bug（验收仪式充当了免费测试）"
          },
          {
            "label": "知识点",
            "text": "行号、截断、二进制检测——全是上下文经济学；Edit 用精确字符串替换而非行号（模型记的行号会过期）；搜索而非通读"
          },
          {
            "label": "实践",
            "text": "验收仪式：让它自己建文件、自己跑出 bug、自己修好"
          }
        ]
      ]
    },
    "ch6": {
      "groups": [
        [
          {
            "code": "CH6.1",
            "name": "命令执行与安全闸门",
            "done": "2026-10-28（v1.1 三扇门 deny/ask/allow＋超时强杀，粒度到子命令）",
            "tail": "—— npm run chat 可玩 · 后台任务（不杀/记 PID/回头查）留 CH8"
          },
          {
            "label": "知识点",
            "text": "child_process、超时与输出截断、后台任务；prompt injection 攻击面；deny / ask / allow 与 Bash(git:*) 规则；提示词不是安全边界"
          },
          {
            "label": "实践",
            "text": "带确认对话框的 Bash 工具：允许 / 拒绝 / 本次会话总是允许"
          }
        ]
      ]
    },
    "ch7": {
      "groups": [
        [
          {
            "code": "CH7.1",
            "name": "上下文管理与压缩",
            "done": "2026-10-28（v1.2 四味药：system 定格、CLAUDE.md、水位压缩、缓存记账）",
            "tail": "—— npm run chat 可玩 · COMPACT_AT 环境变量可调低水位看压缩触发"
          },
          {
            "label": "知识点",
            "text": "system prompt 组装；自动压缩（compaction）;CLAUDE.md 项目记忆；prompt caching——前缀稳定省一大半钱"
          },
          {
            "label": "实践",
            "text": "上下文管理器 + 压缩器，agent 从此能干长活不失忆"
          }
        ]
      ]
    },
    "ch3b": {
      "groups": [
        [
          {
            "code": "附.1",
            "name": "v1.3 · 子代理与工作流",
            "done": "2026-10-28（v1.3 agent 工具里再开循环=上下文隔离，workflow 计划是参数）",
            "tail": "—— npm run chat 可玩 · 全景卡已上：循环里再开循环（核心代码五段可点 × 透视卡）"
          },
          {
            "label": "知识点",
            "text": "子代理=一次性小 agent：自己的 messages、收窄的工具柜、只交回结论（上下文隔离）；工作流=宿主写死的控制流：计划是参数、执行是代码；两者对主对话都只是一次 tool 调用；异步=宿主注入通知重新唤醒，模型自始至终只吐字"
          },
          {
            "label": "总结",
            "text": "嵌套的是执行环节，不是模型调用——模型到今天只见过「吐申请、收文本」，并行与类型化返回是宿主循环上长的器官"
          }
        ]
      ]
    },
    "ch8": {
      "groups": [
        [
          {
            "code": "CH8.1",
            "name": "终端界面重构",
            "done": "2026-10-29（v1.4 换脸不换心：脸面全进 src/ui.ts，Esc=撤销键）",
            "tail": "—— npm run chat 可玩 · 正文超一屏保留原文不重排，这正是 Ink 整帧管理的理由"
          },
          {
            "code": "CH8.2",
            "name": "后台任务（spawn 不杀/记 PID/回头查日志）",
            "done": "2026-10-29（v1.5 后台三件套：background 脱管、日志落盘、bash_check 回头查）",
            "tail": "—— npm run chat 可玩 · 记账是会话级（住内存），日志是持久的（.bg/ 文件，read_file 随可读）"
          },
          {
            "label": "知识点",
            "text": "为什么它用 Ink（React 渲染终端）；流式 markdown；工具调用可视化；Esc 打断与竞态处理；diff 高亮；后台任务——spawn 脱管不杀、PID 记账、日志回头查"
          },
          {
            "label": "实践",
            "text": "UI 重构：内核不动换张脸——这也是一堂重构课；后台任务：长命令扔后台不等人，PID 记账、回头查日志收尸"
          }
        ]
      ]
    },
    "ch9": {
      "groups": [
        [
          {
            "code": "CH9.1",
            "name": "TodoWrite 任务外部化",
            "done": "2026-10-29（v1.6 TodoWrite 整份重写白板，三态上色 ☐▸☑）",
            "tail": "—— npm run chat 可玩 · 给它一个多步任务，看清单从 ☐ 一路勾到 ☑"
          },
          {
            "code": "CH9.2",
            "name": "Plan mode 先批准后执行",
            "done": "2026-10-29（v1.7 /plan 只读柜台调研 → y 批准 → 执行＋清单快照重注入）",
            "tail": "—— npm run chat 可玩 · /plan <任务> 看先批准后执行，再问「现在进度如何」看快照"
          },
          {
            "code": "CH9.3",
            "name": "slash commands 与 mini MCP 实践",
            "done": "2026-10-29（v1.8 斜杠命令表＋mini MCP 天气台——名片进柜子、execute 住子进程）",
            "tail": "—— npm run chat 可玩 · /help 看命令表 · 全景卡 c9-panorama 上线(mini MCP 核心代码六段可点 × 透视卡)"
          },
          {
            "label": "知识点",
            "text": "Subagent 上下文隔离与并行；slash commands；MCP——execute 搬家名片不变"
          },
          {
            "label": "实践",
            "text": "亲手写一个 mini MCP server ✅"
          }
        ]
      ]
    },
    "ch10": {
      "groups": [
        [
          {
            "code": "CH10.1",
            "name": "企业化收尾（多模型路由/配置/hooks/沙箱/evals/发布）",
            "done": "2026-10-29(v1.9 企业化七件套:配置/降级链/遥测/hooks/沙箱/evals/发布,正文十章全清)"
          },
          {
            "label": "知识点",
            "text": "多模型路由与降级；成本遥测；用户级 / 项目级配置；hooks；沙箱执行；evals（怎么给不确定的 agent 写测试）；打包发布"
          },
          {
            "label": "仪式",
            "text": "解包真实 Claude Code 的 system prompt 逐条对照——它的每个设计，你都已懂"
          }
        ]
      ]
    },
    "tf": {
      "groups": [
        [
          {
            "code": "T1",
            "name": "全貌：一台接龙机器的完整一生",
            "done": "2026-10-23"
          },
          {
            "code": "T2",
            "name": "注意力：一块积木的心脏",
            "mark": "⏳ 待拼",
            "tail": "—— 「看哪里、抄什么、抄多少」从直觉拆到公式"
          },
          {
            "code": "T3",
            "name": "训练透视：−ln、softmax、反向传播怎么落在 GPT 身上",
            "mark": "⏳ 待拼"
          },
          {
            "code": "T4",
            "name": "采样与温度：贪心、抽签与「创意」旋钮",
            "mark": "⏳ 待拼"
          }
        ]
      ]
    },
    "backlog": {
      "groups": [
        [
          {
            "code": "傅里叶变换",
            "name": "",
            "mark": "⏳",
            "tail": "—— 时域 ↔ 频域的翻译官；3B7 大数乘法台「O(n²) → O(n log n) 差五万倍」那扇门就开在这"
          },
          {
            "code": "稀疏自编码器（SAE）",
            "name": "",
            "mark": "⏳",
            "tail": "—— 把叠在向量里的特征拆成一本字典：Anthropic 可解释性的主工具，接「乔丹图」那句重要结论"
          }
        ]
      ]
    }
  },
  "acts": {
    "act-p0": {
      "from": "p0"
    },
    "act-nn": {
      "from": "nn"
    },
    "act-3b": {
      "from": "3b"
    },
    "act-m1": {
      "from": [
        "ch1",
        "ch2"
      ]
    },
    "act-m2": {
      "from": [
        "ch3",
        "ch4",
        "ch5",
        "ch3b"
      ]
    },
    "act-m3": {
      "from": [
        "ch6",
        "ch7"
      ]
    },
    "act-m4": {
      "from": [
        "ch8"
      ]
    },
    "act-m5": {
      "from": [
        "ch9",
        "ch10"
      ]
    },
    "act-tf1": {
      "from": "tf",
      "only": "T1",
      "sem": "puzzle"
    }
  },
  "chBadges": {
    "p0": {
      "from": "p0"
    },
    "nn": {
      "from": "nn"
    },
    "3b": {
      "from": "3b"
    },
    "ch1": {
      "from": "ch1"
    },
    "ch2": {
      "from": "ch2"
    },
    "ch3": {
      "from": "ch3"
    },
    "ch4": {
      "from": "ch4"
    },
    "ch5": {
      "from": "ch5"
    },
    "ch3b": {
      "from": "ch3b"
    },
    "ch6": {
      "from": "ch6"
    },
    "ch7": {
      "from": "ch7"
    },
    "ch8": {
      "from": "ch8"
    },
    "ch9": {
      "from": "ch9"
    },
    "ch10": {
      "from": "ch10"
    },
    "tf1": {
      "from": "tf",
      "only": "T1",
      "sem": "puzzle"
    }
  }
};
