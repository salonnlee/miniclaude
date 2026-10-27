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
   · 解剖区(#mc) → 器官行:对应章交付即 done(备注记版本);文件名是路标,开课时定案。

   行字段:
   · done      'YYYY-MM-DD',可带全角括号备注;有 done 不写 mark
   · mark      待开标记: '⏭ 下一站' / '⏳ 待拼' / '⏳'
   · tail      行尾追加文字(不含前导空格,渲染器自动补),如 '—— 拓展视野:…'
   · noGap     仅当 name 结尾紧贴 ✅ 且原文无空格时为 true(全表只有 P0.1、NN2)
   · label     非课次的说明行(知识点/实践/总结/仪式),不参与状态推导
   ============================================================================ */
window.LESSONS = {
  "updated": "",
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
            "done": "2026-10-27（一次开课；MLP 双杀数数表，学员快进连跳三题，考题挂账）"
          }
        ],
        [
          {
            "code": "P0.4",
            "name": "temperature 调参",
            "mark": "⏭ 下一站"
          },
          {
            "label": "知识点",
            "text": "token 与采样；bigram 统计；embedding 与 MLP；训练循环、loss 与梯度下降；temperature / top-k"
          },
          {
            "label": "总结",
            "text": "大模型与它的区别只是大了十万倍、吃了十万倍；它不会听话、不会工具调用——这正是「壳」存在的意义"
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
            "name": "训练解剖：−ln、softmax、反向传播怎么落在 GPT 身上",
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
    "mc": {
      "groups": [
        [
          {
            "code": "src/api.ts",
            "name": "LLM 客户端:messages 历史、SSE 流式、token 计账",
            "mark": "⏳",
            "tail": "—— 第 1–2 章 · v0.1"
          },
          {
            "code": "src/cli.ts",
            "name": "入口:脚手架、API key 安全、多轮对话主循环",
            "mark": "⏳",
            "tail": "—— 第 2 章 · v0.1"
          },
          {
            "code": "src/loop.ts",
            "name": "Agent 循环:tool_use → 执行 → tool_result,转到它不再要工具",
            "mark": "⏳",
            "tail": "—— 第 3 章 · v0.2 · 心脏"
          },
          {
            "code": "src/tools/registry.ts",
            "name": "工具注册表:name + description + JSON Schema + execute,错误当结果返回",
            "mark": "⏳",
            "tail": "—— 第 4 章 · v0.2"
          },
          {
            "code": "src/tools/fs.ts",
            "name": "Read / Write / Edit / Glob / Grep——给它眼睛和手",
            "mark": "⏳",
            "tail": "—— 第 5 章 · v0.3"
          },
          {
            "code": "src/tools/bash.ts",
            "name": "child_process、超时截断、后台任务",
            "mark": "⏳",
            "tail": "—— 第 6 章 · v0.4"
          },
          {
            "code": "src/permission.ts",
            "name": "权限闸门:deny / ask / allow——提示词不是安全边界",
            "mark": "⏳",
            "tail": "—— 第 6 章 · v0.4"
          },
          {
            "code": "src/context.ts",
            "name": "上下文管理:system prompt 组装、自动压缩、项目记忆、prompt caching",
            "mark": "⏳",
            "tail": "—— 第 7 章 · v0.5"
          },
          {
            "code": "src/ui.tsx",
            "name": "Ink 终端 UI:流式 markdown、工具可视化、Esc 打断、diff 高亮",
            "mark": "⏳",
            "tail": "—— 第 8 章 · v0.6"
          },
          {
            "code": "src/subagent.ts",
            "name": "TodoWrite 外部化、子代理、Plan mode、slash commands、MCP",
            "mark": "⏳",
            "tail": "—— 第 9 章 · v0.7"
          },
          {
            "code": "src/config.ts 等",
            "name": "多模型路由与降级、成本遥测、hooks、沙箱、evals、打包发布",
            "mark": "⏳",
            "tail": "—— 第 10 章 · v1.0"
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
