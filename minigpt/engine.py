"""发动机:softmax、p − onehot 发令枪、SGD 训练循环——与模型无关。

P0.2 ③ 与 P0.3 ⑥ 的公共骨架抽到这里。不管模型是一张 (67,67) 分数表,
还是 C 表 + 开会 + 表决的 MLP,训练永远是同一件事:
  抽一批窗口 → forward 出分数 → softmax 变概率 → 算 loss
  → 发令枪 p − onehot(交叉熵对 logits 的梯度)→ backward 散射 → update 下山
后面章节往 models.py 挂注意力、Transformer,这里一行不改——
「换模型不换发动机」就是本项目的演进方式。
"""
import numpy as np


def softmax(logits):
    """分数 → 概率,每行和 = 1。先减行最大值再 exp:概率对平移不变,溢出却会翻船。"""
    z = logits - logits.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)


def evaluate(model, ctx, tgt, rng, batch=4096):
    """随机抽一批窗口,报平均交叉熵:loss = −log(押中下一个字符的概率)。"""
    i = rng.integers(0, len(ctx), batch)
    probs = softmax(model.forward(ctx[i]))
    return float(-np.log(probs[np.arange(len(i)), tgt[i]]).mean())


def train(model, ds, steps=30000, batch=512, lr=0.1, lr_end=0.02, report=5000, rng=None):
    """小批量 SGD(P0.3 ⑥ 的循环):lr 前 2/3 大步走、后 1/3 小步修(lr_end=None 则不换挡)。

    抽批只从 train 抽;每 report 步各报一次 train / dev(随机 4096 窗抽样,
    末位小数会抖,属正常)。
    """
    if rng is None:
        rng = np.random.default_rng(42)
    with np.errstate(over="ignore", invalid="ignore"):    # lr 翻车时 exp 溢出的警告先压掉,loss 自会招供
        for step in range(steps):
            lr_now = lr if lr_end is None or step < steps * 2 // 3 else lr_end
            i = rng.integers(0, len(ds.ctx_tr), batch)
            idx, tgt = ds.ctx_tr[i], ds.tgt_tr[i]         # (B, BL) (B,)
            probs = softmax(model.forward(idx))           # (B, 67)
            probs[np.arange(batch), tgt] -= 1.0           # 发令枪:p − onehot(NN4 数值互证过的两行)
            model.backward(idx, probs / batch)            # 取平均,散射回每个参数
            model.update(lr_now)                          # 统一沿负梯度走一步
            if step % report == 0 or step == steps - 1:
                tr = evaluate(model, ds.ctx_tr, ds.tgt_tr, rng)
                dv = evaluate(model, ds.ctx_dv, ds.tgt_dv, rng)
                if not np.isfinite(tr):
                    print(f"  step {step:6d} | train {tr} —— lr 翻车现场,停机")
                    return
                print(f"  step {step:6d} | train {tr:.4f} | dev {dv:.4f}")
