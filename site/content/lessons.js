/* ============================================================================
   content/lessons.js —— 课次数据(唯一事实源,配 COURSE-render.js 渲染)
   ----------------------------------------------------------------------------
   COURSE.html 里不再手写课次行:每个 <ul class="ch-list" data-lessons="key">
   是空容器,渲染器把下面的 groups 按出现顺序填进去(第 i 组 → 第 i 个容器)。
   页头「更新于」、幕头/章头徽章、幕的折叠态,全部由这里的数据自动推导,
   不再手改。

   常见操作:
   · 完课        → 该课次条目加 done: '2026-10-26'(备注写进同一字符串: '2026-10-26(伴读模式)');
                    幕徽章/折叠/「更新于」自动跟着变。
   · 加课次      → 往对应章最后一组(或新起一组,新组需在 HTML 加一个空容器)末尾加一条。
   · 加待学条目  → backlog 组加一条,写法同课次行。
   · 拼图(T 区)  → done 即「已拼上」(sem: 'puzzle')。

   行字段:
   · done      'YYYY-MM-DD',可带全角括号备注;有 done 不写 mark
   · mark      待开标记: '⏭ 下一站' / '⏳ 待拼' / '⏳'
   · tail      行尾追加文字(不含前导空格,渲染器自动补),如 '—— 拓展视野:…'
   · noGap     仅当 name 结尾紧贴 ✅ 且原文无空格时为 true(全表只有 P0.1、NN2)
   · label     非课次的说明行(知识点/实践/总结/仪式),不参与状态推导
   ============================================================================ */
export const LESSONS = {
  "updated": "",
  // —— 版本交付表(单一事实源):渲染器据此点亮章交付 chip(foot-chip ver)
  //    与里程碑表;COURSE.html 不再手写任何版本号。
  //    交付新版本 = 对应条目填 ver + chip + at(chip 挂哪章);未交付条目
  //    ver 置 null,页面显示「—」、章 chip 自动隐藏。
  "ships": [
    { "at": "p0",  "ver": "v0.1", "chip": "交付 v0.1 · minigpt/",    "what": "莎士比亚嘴替——你手搓的真·迷你 GPT(CPU 训练)", "range": "序章" },
    { "at": "ch2", "ver": "v0.4", "chip": "交付 v0.4 · src/chat.ts", "what": "流式多轮聊天,退出时报账", "range": "第 1–2 章" },
    { "ver": "v0.5", "what": "网页对话框——右下角气泡唤起,流式聊天 + 多会话 + 记账", "range": "主线间隙" },
    { "ver": "v0.6", "what": "对话框升级——Markdown 真排版 + 问题库 100 条随机三问", "range": "主线间隙" },
    { "ver": "v0.7", "what": "对话框再升级——流式实时排版 + 代码高亮", "range": "主线间隙" },
    { "at": "ch3", "ver": "v0.8", "chip": "交付 v0.8 · src/chat.ts + tools/", "what": "会调工具的 Agent 循环(玩具工具)", "range": "第 3–4 章" },
    { "ver": null, "what": "读写你的代码,自己发现并修好 bug", "range": "第 5 章" },
    { "ver": null, "what": "跑命令,且有安全闸门", "range": "第 6 章" },
    { "ver": null, "what": "长任务不失忆,懂省钱", "range": "第 7 章" },
    { "ver": null, "what": "Claude Code 级的终端手感", "range": "第 8 章" },
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
            "done": "2026-10-27（裸调看 messages/usage 形状 → 不带历史问「刚才说了什么」一脸茫然 → 问答原文塞回数组立刻「记起」，17 → 40 prompt tokens，记忆按 token 收费）",
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
            "done": "2026-10-27（四步长成：脚手架 TS+Node → 非流式最小循环（记忆即 messages 数组）→ 流式 SSE（缓冲区攒换行才算一条事件，打字机逐词上屏）→ 记账（退出报 75+232 token≈¥0.0035））",
            "tail": "—— npm run chat 可玩 · 实验室已解锁：chat.ts 透视台（150 行代码可点 × 透视卡 × 真机连线）"
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
            "done": "2026-10-28（v0.8 三步曲长成：tools 声明随行 → 流式攒 tool_calls 分片 → 执行喂回循环到它不再要；真机三圈实录 get_time → 10+3 心算没用 calculator → 纯文本退出——触发是概率的不是规则的，description 塑形）",
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
            "done": "2026-10-28（闸门三件套一次落齐：validate.ts 手写迷你 Schema 校验——错误当结果喂回让模型自己改；eval 换 tokenizer+递归下降——恶意输入不是被拦，是无法表达，攻击样本 16/16 倒在门口；tools/index.ts 统一注册表——加工具零改主循环。AB 实验跳过：说明书改成「无论难易必须调用」则 10+3 必触发，共识免验）",
            "tail": "—— npm run chat 可玩 · 说明书 A/B 玩法留作自选实验"
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
            "mark": "⏭ 下一站"
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
    "ch8": {
      "groups": [
        [
          {
            "label": "知识点",
            "text": "为什么它用 Ink（React 渲染终端）；流式 markdown；工具调用可视化；Esc 打断与竞态处理；diff 高亮"
          },
          {
            "label": "实践",
            "text": "UI 重构：内核不动换张脸——这也是一堂重构课"
          }
        ]
      ]
    },
    "ch9": {
      "groups": [
        [
          {
            "label": "知识点",
            "text": "TodoWrite 任务外部化；Subagent 上下文隔离与并行；Plan mode 先批准后执行；slash commands"
          },
          {
            "label": "实践",
            "text": "亲手写一个 mini MCP server"
          }
        ]
      ]
    },
    "ch10": {
      "groups": [
        [
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
        "ch5"
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
