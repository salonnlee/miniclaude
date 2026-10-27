"""采样:滑窗接龙,一字一字往外蹦(P0.3 ⑧;P0.4 加调温与限签)。

模型只交「下一个字符的概率分布」,要生成一整段,只能:
抽一个 → 拼进前文尾 → 窗口右移一格 → 再抽——「自回归」说的就是它。
P0.4 旋钮全部拧在抽签一步,不碰模型、不碰训练:
· temperature:logits / T 再 softmax——T<1 拉大分差(嘴替稳),T>1 压平(嘴替疯),T=0 退化贪心;
· top_k:只留分数前 k 名抽签,榜外清零(冷门字禁言)。
"""
import numpy as np

from . import engine


def generate(model, ds, n_chars=400, seed=7, temperature=1.0, top_k=0):
    """从 block_size 个换行开场(数据垫的正是这个起点),接龙 n_chars 个字符。

    temperature=1 且 top_k=0 即 P0.3 原始行为;temperature<=0 走 argmax 贪心。
    采样骰子固定 seed——只拧温度不换骰子,前后样本的差异全归因于旋钮。
    """
    r = np.random.default_rng(seed)                        # 采样骰子独立于训练随机源
    cur = np.full(model.block_size, ds.stoi["\n"], dtype=np.int64)
    out = []
    for _ in range(n_chars):
        logits = model.forward(cur[None, :])[0]              # (V,) 裸分数
        if temperature <= 0:                                 # T→0 的极限:永远取头名
            c = int(np.argmax(logits))
        else:
            if top_k:
                kth = np.sort(logits)[-top_k]                # 第 k 名的门槛分
                logits = np.where(logits < kth, -np.inf, logits)  # 榜外清零,softmax 后天然 0
            p = engine.softmax((logits / temperature)[None, :])[0]  # 升回二维喂批式 softmax
            c = int(r.choice(ds.vocab, p=p))                 # 按概率抽签(与 P0.1 查表抽签同款)
        out.append(ds.itos[c])
        cur = np.concatenate([cur[1:], [c]])                 # 丢最老的字,进新字
    return "".join(out)
