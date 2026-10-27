"""minigpt v0.0:一条命令跑通迷你 GPT 的一生。

    .venv/bin/python -m minigpt                  # MLP(默认阵容):训练 → 考试 → 采样
    .venv/bin/python -m minigpt --model bigram   # 回看 P0.2 的 1 字前文版
    .venv/bin/python -m minigpt --steps 3000     # 快进版:先看流程,采样质量打折

一生五幕:读语料 → 训练前裸采样(一无所知的样子)→ 梯度下降 →
train/dev 考试 → 采样看嘴替成色。止步 temperature——P0.4 开课接上。
"""
import argparse

import numpy as np

from . import data, engine, models, sample

# 每件货架商品的出厂调校(P0.2/P0.3 课上的实测配方):
# bigram 表浅步子敢大,MLP 深(相对)一步要缓
PRESETS = {
    "bigram": dict(steps=20000, lr=1.0, lr_end=0.25),
    "mlp": dict(steps=30000, lr=0.1, lr_end=0.02),
}
SHELF = {"bigram": models.BigramLM, "mlp": models.MLPLM}


def main():
    ap = argparse.ArgumentParser(prog="minigpt", description="序章交付的迷你 GPT(v0.0)")
    ap.add_argument("--model", choices=PRESETS, default="mlp", help="货架上的型号(默认 mlp)")
    ap.add_argument("--steps", type=int, default=None, help="训练步数(默认按型号出厂配方)")
    ap.add_argument("--chars", type=int, default=400, help="训练后采样的字符数")
    ap.add_argument("--seed", type=int, default=42, help="随机种子,换一个 = 换一次人生")
    args = ap.parse_args()

    preset, model_cls = PRESETS[args.model], SHELF[args.model]
    steps = args.steps or preset["steps"]
    rng = np.random.default_rng(args.seed)

    ds = data.load(block_size=model_cls.block_size)
    model = model_cls(ds.vocab, rng)
    print(f"[语料] {len(ds.text):,} 字符 | 词表 {ds.vocab} | 前文 {model.block_size} 字"
          f" | train {len(ds.ctx_tr):,} 窗 / dev {len(ds.ctx_dv):,} 窗")
    print(f"[参数] {model.n_params:,} 个")

    before = engine.evaluate(model, ds.ctx_dv, ds.tgt_dv, rng)
    print(f"\n[训练前] dev loss {before:.4f}  ← 均匀瞎猜的理论值 ln(67) ≈ 4.20")
    print("[训练前采样] 一无所知的样子,纯噪声:")
    print(" ", sample.generate(model, ds, 100, seed=1).replace("\n", "⏎"))

    print(f"\n[训练] {steps:,} 步,lr {preset['lr']} → {preset['lr_end']}:")
    engine.train(model, ds, steps=steps, lr=preset["lr"], lr_end=preset["lr_end"], rng=rng)

    tr = engine.evaluate(model, ds.ctx_tr, ds.tgt_tr, rng)
    dv = engine.evaluate(model, ds.ctx_dv, ds.tgt_dv, rng)
    print(f"\n[考卷] train {tr:.4f} | dev {dv:.4f}"
          f"  ← 对照 P0.3 实测:bigram dev 2.49 · MLP dev 1.95")
    print(f"[训练后采样 {args.chars} 字] 嘴替成色:")
    print(sample.generate(model, ds, args.chars))


if __name__ == "__main__":
    main()
