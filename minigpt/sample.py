"""采样:滑窗接龙,一字一字往外蹦(P0.3 ⑧)。

模型只交「下一个字符的概率分布」,要生成一整段,只能:
抽一个 → 拼进前文尾 → 窗口右移一格 → 再抽——「自回归」说的就是它。
P0.4 的 temperature / top-k 旋钮将加在本文件的抽签一步之前。
"""
import numpy as np

from . import engine


def generate(model, ds, n_chars=400, seed=7):
    """从 block_size 个换行开场(数据垫的正是这个起点),接龙 n_chars 个字符。"""
    r = np.random.default_rng(seed)                        # 采样骰子独立于训练随机源
    cur = np.full(model.block_size, ds.stoi["\n"], dtype=np.int64)
    out = []
    for _ in range(n_chars):
        p = engine.softmax(model.forward(cur[None, :]))[0]   # (1, BL) → (V,) 概率分布
        c = int(r.choice(ds.vocab, p=p))                     # 按概率抽签(与 P0.1 查表抽签同款)
        out.append(ds.itos[c])
        cur = np.concatenate([cur[1:], [c]])                 # 丢最老的字,进新字
    return "".join(out)
