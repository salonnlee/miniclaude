"""序章 0.1《复读机》:用一张概率表,搓出最小的语言模型。

语言模型只有一个职责:给定前文,给出"下一个 token"的概率分布。
bigram 是它最古老的形态——前文只看 1 个字符,概率全靠数出来。

运行:.venv/bin/python prologue/bigram.py
"""
import random
from collections import Counter, defaultdict

# ① 语料与词表 ────────────────────────────────────────────────
text = open("data/input.txt", encoding="utf-8").read()
vocab = sorted(set(text))          # 字符级 token:词表 = 出现过的所有字符
print(f"语料 {len(text):,} 字符 | 词表 {len(vocab)} 个 token")

# ② 数数:前一个字符后面,都跟过哪些字符、各多少次 ─────────────
# counts 是双层账本(下面是真实数据,直接可查):
#   counts = {
#       'q': {'u': 2591},                              # 莎翁笔下 q 后面 100% 是 u!
#       'e': {' ': 112740, 'r': 48705, 'n': 29854, ...},  # e 后面最常跟空格(29%)
#       ' ': {'t': 95137, 'a': 58009, 's': 49529, ...},   # 空格后 t/a/s 开头最多
#       ...
#   }
# JS 视角:Map<string, Map<string, number>>,外层 key = 前一个字符
counts = defaultdict(Counter)      # counts[prev] 是一张「后续字符 → 次数」的账本
for prev, nxt in zip(text, text[1:]):
    counts[prev][nxt] += 1

# ③ 次数 → 概率(归一化)──────────────────────────────────────
# probs 与 counts 同构,内层从「次数」换算成「概率」(真实数据):
#   probs = {
#       'q': [('u', 1.0)],                             # 每张内表加起来 = 1
#       'e': [(' ', 0.292), ('r', 0.126), ('n', 0.077), ...],
#       ...
#   }
# 内层用 list[(字符, 概率)] 而不是 dict:方便直接拆成
# random.choices 需要的两样东西——候选 chars 和权重 weights
probs = {}
for prev, cnt in counts.items():
    total = sum(cnt.values())
    probs[prev] = [(ch, n / total) for ch, n in cnt.items()]

# ④ 采样:按概率抽签,一个字一个字往外吐 ──────────────────────
random.seed(42)                    # 固定随机种子,让实验可复现
cur, out = "\n", []                # 从换行符「开场」(剧本一行的开始)
for _ in range(600):
    if cur not in probs:           # 语料末字符没有后续记录——回到开场符
        cur = "\n"
    chars, weights = zip(*probs[cur])
    cur = random.choices(chars, weights=weights)[0]   # 加权抽签 = 采样
    out.append(cur)
print("".join(out))
