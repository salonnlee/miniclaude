"""序章 0.2《把查表换成可学习的函数》:神经版 bigram。

0.1 的概率表靠「数数」;这里的 W 是可训练参数,靠「梯度下降」自己学出那张表。
训练完对比:两条路的 loss 在同一点会师——数数的最优解,梯度下降能自己走到。

运行:.venv/bin/python prologue/neural_bigram.py
"""
import numpy as np

rng = np.random.default_rng(42)          # 可种子化的随机源(≈ 可复现版 Math.random)

# ① 语料与编码:字符 → 整数 id(神经网络只吃数字,不认字符)────────
text = open("data/input.txt", encoding="utf-8").read()
vocab = sorted(set(text))                # 67 个字符
stoi = {ch: i for i, ch in enumerate(vocab)}          # char → id,例:stoi['q'] = 51
itos = {i: ch for ch, i in stoi.items()}              # id → char(反向查询表)
ids = np.array([stoi[c] for c in text], dtype=np.int32)  # 全文 id 序列 shape=(4573338,)
V = len(vocab)
print(f"语料 {len(ids):,} 字符 | 词表 {V}")

# ② 可学习参数 W:一张「分数表(logits)」────────────────────────
# W.shape == (67, 67):行 = 当前字符,列 = 下一个字符
# 前向传播 f(cur) = softmax(W[cur]) —— 与 0.1 的 probs[cur] 接口一模一样!
# 乘 0.01:让初始分数都接近 0 → softmax 输出接近均匀分布(= 一无所知)
W = rng.standard_normal((V, V)) * 0.01

def forward(cur_ids):
    """一批当前字符 → 一批概率分布。cur_ids shape=(B,) → 返回 shape=(B, 67)"""
    logits = W[cur_ids]                            # 花式索引一次取 B 行:(B, 67)
    z = logits - logits.max(axis=1, keepdims=True) # 每行减最大值,防 exp 溢出(数值稳定)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)        # softmax:分数 → 概率,每行和 = 1

def loss_on(batch=4096):
    """随机抽一批相邻对,算平均交叉熵 loss:loss = -log(猜对下一个字符的概率)"""
    i = rng.integers(0, len(ids) - 1, batch)
    cur, nxt = ids[i], ids[i + 1]                  # (B,) (B,)
    probs = forward(cur)                           # (B, 67)
    return float(-np.log(probs[np.arange(batch), nxt]).mean())

def counting_loss():
    """0.1 数数版的理论 loss:同样的相邻对,用数出来的概率表能到多低"""
    pair = np.bincount(ids[:-1] * V + ids[1:], minlength=V * V).reshape(V, V)  # counts 表
    p = pair / pair.sum(axis=1, keepdims=True)     # 归一化 → 0.1 的 probs
    seen = pair > 0
    return float((pair[seen] * -np.log(p[seen])).sum() / pair.sum())

# ③ 训练:梯度下降,把 W 往「猜得更对」的方向推 ───────────────────
def train(steps=20000, batch=512):
    for step in range(steps):
        lr = 1.0 if step < steps // 2 else 0.25    # 学习率衰减:前半大步走,后半小步修
        i = rng.integers(0, len(ids) - 1, batch)   # 随机抽 B 个位置(小批量 SGD)
        cur, nxt = ids[i], ids[i + 1]
        probs = forward(cur)                       # (B, 67)
        # 交叉熵对 logits 的梯度 = probs - onehot(正确答案),整个反向传播就这两行:
        probs[np.arange(batch), nxt] -= 1.0        # (B, 67),正确位置概率减 1,其余不动
        np.add.at(W, cur, -lr * probs / batch)     # 把梯度散射回各自行(向量化 for 循环)
        if step % 2000 == 0 or step == steps - 1:
            print(f"  step {step:5d} | loss {loss_on():.4f}")

# ④ 采样:与 0.1 完全同款循环,只是「查表」换成了「前向传播」──────
def sample(n=500):
    cur, out = stoi["\n"], []
    for _ in range(n):
        p = forward(np.array([cur]))[0]            # (67,) 概率分布
        cur = int(rng.choice(V, p=p))              # 按概率抽签(≈ random.choices)
        out.append(itos[cur])
    return "".join(out)

if __name__ == "__main__":                 # ≈ require.main === module:直接运行才执行
    print("\n[训练前] 一无所知的它,采样像这样(纯噪声):")
    print(" ", sample(120).replace("\n", "⏎"))
    print("\n[训练] 梯度下降 20000 步,盯着 loss:")
    train()
    print(f"\n[对照] 0.1 数数版的理论最优 loss:{counting_loss():.4f}")
    print(f"[当前] 神经版 loss:{loss_on():.4f} —— 两条路在此会师\n")
    print("[训练后] 采样(它自己学出了那张表):")
    print(sample(500))
