"""数据流水线:语料 → 词表 → 窗口 → train/dev 考卷。

P0.1–P0.3 三课的数据段收拢于此。与课上的散装脚本只有一处升级:
窗口长度不再写死——bigram 只要 1 个前文,MLP 要 3 个,后面的注意力
要 256 个。模型自己报数(block_size),数据按需切窗。
"""
from pathlib import Path

import numpy as np

# 语料固定在仓库根的 data/input.txt(与 prologue/ 各课同一份);
# 按 __file__ 解析路径,cwd 挪到哪都能跑
CORPUS = Path(__file__).resolve().parent.parent / "data" / "input.txt"


class Dataset:
    """一份语料的全部家当:词表、编码表、两叠切好的窗口。"""

    def __init__(self, text, stoi, block_size, ctx_tr, tgt_tr, ctx_dv, tgt_dv):
        self.text = text
        self.stoi = stoi                                  # char → id,例:stoi["q"]
        self.itos = {i: ch for ch, i in stoi.items()}     # id → char(反向查询表)
        self.vocab = len(stoi)                            # 67 个字符
        self.block_size = block_size
        self.ctx_tr, self.tgt_tr = ctx_tr, tgt_tr         # 训练窗口:前文 (n, BL) + 答案 (n,)
        self.ctx_dv, self.tgt_dv = ctx_dv, tgt_dv         # 考试窗口:训练时一个字不许看


def load(block_size=3, train_ratio=0.9, corpus=CORPUS):
    """读语料,切 block_size 长的窗口,前九成学习、后一成考试(P0.3 ①② 两段)。"""
    text = corpus.read_text(encoding="utf-8")
    stoi = {ch: i for i, ch in enumerate(sorted(set(text)))}   # 排序去重:字符 → 整数 id
    ids = np.concatenate([
        np.full(block_size, stoi["\n"], dtype=np.int32),       # 开场垫 block_size 个换行:行首语境
        np.array([stoi[c] for c in text], dtype=np.int32),     # 也是窗口;采样时有现成起点
    ])
    n = len(ids) - block_size                                  # 窗口数(语料多长就多少窗)
    # 错位切片叠窗口:ctx 第 i 行 = 第 i 窗的前文,tgt 第 i 个 = 它要猜的下一个字符
    #   i = 0:  ctx = [\n, \n, \n]   tgt = 'F'   ← 全文首词 First 的 F
    # 一次向量化,没有 Python 循环;JS 视角:[0,1,2].map(k => ids.slice(k, k+n)) 按列拼
    ctx = np.stack([ids[k:k + n] for k in range(block_size)], axis=1)   # (n, BL)
    tgt = ids[block_size:]                                             # (n,)
    cut = int(n * train_ratio)                                         # 前 90% 学习,后 10% 考试
    return Dataset(text, stoi, block_size,
                   ctx[:cut], tgt[:cut], ctx[cut:], tgt[cut:])
