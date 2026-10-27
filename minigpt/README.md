# minigpt · 序章交付的迷你 GPT(v0.1)

> 序章三课的散装脚本(数数表 → 神经版 → MLP)重组成一个能继续长大的项目:
> 同一个插头、同一台发动机,后续章节只往货架上挂新模型。

## 跑起来(在仓库根目录)

```bash
.venv/bin/python -m minigpt                  # MLP 默认阵容:30000 步训练 → 考试 → 采样 400 字
.venv/bin/python -m minigpt --model bigram   # 回看 P0.2 的 1 字前文版
.venv/bin/python -m minigpt --steps 3000     # 快进版:先看流程,采样质量打折
.venv/bin/python -m minigpt --temperature 0.8 --top-k 10   # P0.4 旋钮:调温 + 限签
```

语料是 data/input.txt(tinyshakespeare,已随仓库附带;万一缺失按根 README 的 curl 命令补)。

## v0.0 成绩单(2026-10-27,seed 42 实测)

| 型号 | 参数 | train loss | dev loss | 采样成色 |
|---|---|---|---|---|
| BigramLM | 4,489 | 2.5022 | 2.5018 | 碎词(P0.2 同款) |
| MLPLM | 12,739 | 1.9298 | 1.9555 | 成形单词 + 伪莎翁腔(P0.3 同款) |

BigramLM 的表是梯度下降学出来的(P0.2 路线),不是数出来的(P0.1 路线)——P0.3 考卷上
数出来的 bigram 是 2.49,3-gram 数数表 2.54(靠回退续命),插值 λ 配方 1.79(挑 λ 时
偷看了考卷)。训练前 dev ≈ 4.2048 = ln 67,正是均匀瞎猜的理论值。

## 文件地图(每一件都来自课上)

| 文件 | 职责 | 来自哪课 |
|---|---|---|
| data.py | 语料 → 词表 → 窗口 → train/dev;窗口长度由模型的 block_size 报数 | P0.1 ① / P0.3 ①② |
| models.py | 货架:BigramLM / MLPLM——同一个插头(forward / backward / update) | P0.2 / P0.3 ⑤⑦ |
| engine.py | 发动机:softmax、p − onehot 发令枪、SGD 循环 | P0.2 ③ / P0.3 ⑥ |
| sample.py | 滑窗接龙采样;temperature / top-k 旋钮拧在抽签一步 | P0.3 ⑧ / P0.4 |
| __main__.py | CLI:读语料 → 裸采样 → 训练 → 考试 → 采样;--temperature / --top-k 透传 | — |

## 演进路线(随课程回填,这张表就是改版台账)

- **v0.0**:BigramLM + MLPLM,自回归采样——止步 temperature;
- **v0.1(现在,P0.4)**:sample.py 加 temperature / top-k——分数除以 T 再 softmax,
  前k名之外清零;只管说话,不管学习(考卷 loss 与旋钮无关)。实测谱系(seed 7,
  同一模型):T=0 贪心死循环(What the shall 永动)、0.5 单词全对句子死板、
  0.8–0.9 甜点区、1.0 模型本色、1.5 疯得有章法;top-k=10 是写作业模式默认配方;
- **T 区计划**:models.py 挂注意力与 Transformer——窗口从 3 字拉长、参数量起飞,engine.py 一行不改。
