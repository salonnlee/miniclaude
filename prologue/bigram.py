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
counts = defaultdict(Counter)      # counts[prev] 是一张「后续字符 → 次数」的账本
for prev, nxt in zip(text, text[1:]):
    counts[prev][nxt] += 1

# ③ 次数 → 概率(归一化)──────────────────────────────────────
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
