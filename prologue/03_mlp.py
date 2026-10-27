"""序章 0.3《前文加长:击穿数数表》:从看 1 个字,到看 3 个字。

0.2 的 W 只有 67 行,只认前文最后 1 个字符——再往前两个字,它看不见。
本课把前文窗口从 1 拉到 3,让「数数表」和「神经网络」当众对垒:
表要为每种 3 字符前文单开一行(67³ = 300,763 行),网络只是给每个字符
发一张含义向量(67×16),组合现场算——参数一个没多,还要更少。

运行:.venv/bin/python prologue/03_mlp.py
"""
import numpy as np

rng = np.random.default_rng(42)

# ① 语料、编码、切 3 字符窗口 ────────────────────────────────────
text = open("data/input.txt", encoding="utf-8").read()
vocab = sorted(set(text))
stoi = {ch: i for i, ch in enumerate(vocab)}
itos = {i: ch for ch, i in stoi.items()}
V = len(vocab)                                    # 67

BL = 3                                            # 前文窗口:看 3 个字符猜第 4 个
ids = np.concatenate([
    np.full(BL, stoi["\n"], dtype=np.int32),      # 开场垫 3 个换行:行首语境,
    np.array([stoi[c] for c in text], dtype=np.int32),  # 采样时也有现成起点 '\n\n\n'
])
n = len(ids) - BL                                 # 窗口数 4,573,338(垫 3 个 \n 后)
# ctx 第 i 行 = 第 i 窗的前文,tgt 第 i 个 = 该窗要猜的下一个字符:
#   i = 0:  ctx = [\n, \n, \n]   tgt = 'F'   ← 全文首词 First 的 F
#   i = 1:  ctx = [\n, \n, 'F']  tgt = 'i'
# 三个「错位切片」叠成 (n, 3):一次向量化,没有 Python 循环
# JS 视角:[0,1,2].map(k => ids.slice(k, k + n)),再按列拼
ctx = np.stack([ids[k:k + n] for k in range(BL)], axis=1)   # (n, 3)
tgt = ids[BL:]                                              # (n,)
print(f"语料 {len(text):,} 字符 | 词表 {V} | 窗口 {n:,} 个(每个 = 3 前文 + 1 答案)")
print(f"开场前文 '\\n\\n\\n' 在语料里出现 {text.count(chr(10) * 3)} 次"
      "——数数表对它的全部了解,就这 5 行账")

# ② train/dev 切分:前 90% 窗口用来学,后 10% 锁进抽屉只用来考 ─────
cut = int(n * 0.9)
ctx_tr, tgt_tr = ctx[:cut], tgt[:cut]
ctx_dv, tgt_dv = ctx[cut:], tgt[cut:]
print(f"train {len(ctx_tr):,} 窗 | dev {len(ctx_dv):,} 窗(考试卷:训练时一个字不许看)")

# ③ 擂台第一场:数数表 3-gram,先在 train 上自嗨 ─────────────────
# 户口号:3 字符前文按 67 进制拼成一个整数 id
#   "the" → t·67² + h·67 + e      (与 0.2 的 cur*V+nxt 同款打包思路)
cid = (ctx[:, 0] * V + ctx[:, 1]) * V + ctx[:, 2]   # (n,) 每窗的户口号
cid_tr = cid[:cut]
# 计数表 = 300,763 行 × 67 列:行 = 前文组合,列 = 下一字符,格 = 出现次数
# JS 视角:counts[contextKey][nextChar]++,这里「拼 id + bincount」一把数完
cnt = np.bincount(cid_tr * V + tgt_tr, minlength=V**3 * V).reshape(V**3, V)
rows = cnt.sum(axis=1)                    # 每行账目总数(0 = 空户口)
nonempty = int((rows > 0).sum())
print(f"\n[开奖] 300,763 行里,train 走完只有 {nonempty:,} 行有账"
      f"({nonempty / V**3:.1%});{V**3 - nonempty:,} 行空户口")
once = int((rows == 1).sum())
print(f"[过自信] 其中 {once:,} 行只有一笔账——下一字符照样敢给 100%")
print(f"[内存] 这张表在内存里占 {cnt.nbytes / 1e6:.0f} MB——先记账,后面有人只用 34 KB")
# 它在背过的 train 上的 loss:每个窗口查自己那行的账,次数归一化当概率
p_hit = cnt[cid_tr, tgt_tr] / rows[cid_tr]
print(f"[train loss] {float(-np.log(p_hit).mean()):.4f}  ← 对照:0.2 的 bigram 是 2.47")

# ④ 拆考卷:数数表上 dev ────────────────────────────────────────
cid_dv = cid[cut:]
has_row = rows[cid_dv] > 0          # dev 每窗在前文户口本里有没有账
print(f"\n[考卷] dev 里 train 没见过的窗口:{1 - has_row.mean():.2%}"
      " → 查表得概率 0,−log 0 = ∞,loss 当场爆表")
# 修补匠手艺·回退(backoff):3 字行没账,退回查 1 字行(bigram)
# 参照的 bigram 表也在 train 上数——考试不许偷看 dev 一扇窗
ids_tr = ids[:cut + BL]
pair = np.bincount(ids_tr[:-1] * V + ids_tr[1:], minlength=V * V).reshape(V, V)
p2 = pair / np.maximum(pair.sum(axis=1, keepdims=True), 1)   # 0.1 的 probs 同款
p_dv = np.where(has_row,
                cnt[cid_dv, tgt_dv] / np.maximum(rows[cid_dv], 1),  # 空行分母先兜成 1:得 0,反正会被替换
                p2[ctx_dv[:, 2], tgt_dv])            # 没户口:退 1 字行
# 1e-30 兜底:回退到的 bigram 格子理论上也可能是 0,截住防 ∞
print(f"[dev loss] 3-gram + 回退:{float(-np.log(np.maximum(p_dv, 1e-30)).mean()):.4f}")
# 同一张考卷,只看 1 个字符的前辈 bigram 本尊的成绩
p2_dv = p2[ctx_dv[:, 2], tgt_dv]
print(f"[dev loss] bigram 本尊:{float(-np.log(np.maximum(p2_dv, 1e-30)).mean()):.4f}")

# ⑤ 挑战者登场:身份证版(C 表 + W 矩阵)───────────────────────────
DIM = 16                                       # 每字符含义向量的维数
C = rng.standard_normal((V, DIM)) * 0.01       # (67,16) 身份证库:一行 = 一个字符的 16 个数
W = rng.standard_normal((BL * DIM, V)) * 0.01  # (48,67) 面试官:48 进 67 出
print(f"\n[参数] C {C.size} + W {W.size} = {C.size + W.size} 个"
      f"(数数表 {V**3 * V:,} 格)| 内存 {C.nbytes + W.nbytes:,} B ≈ {(C.nbytes + W.nbytes)/1024:.0f} KB")

def forward(c3):
    """一批 3 字符前文 → 一批概率分布。c3 shape=(B,3) → 返回 shape=(B,67)"""
    h = C[c3].reshape(len(c3), BL * DIM)       # 三查各 16 维,拼成 (B,48)
    logits = h @ W                             # 一次矩阵乘:48 个数 → 67 个分数
    z = logits - logits.max(axis=1, keepdims=True)  # 减 max 防 exp 溢出(0.2 同款)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)    # softmax:每行和 = 1

def loss_on(c3, t, batch=4096):
    """随机抽一批窗口算平均交叉熵——0.2 同款,只是前文从 1 字换成 3 字"""
    i = rng.integers(0, len(c3), batch)
    p = forward(c3[i])
    return float(-np.log(p[np.arange(batch), t[i]]).mean())

print(f"[训练前] dev loss {loss_on(ctx_dv, tgt_dv):.4f}  ← 先预测再跑:应该是多少?")

# ⑥ 训练:梯度沿两条路走 ────────────────────────────────────────
def train(steps=30000, batch=512, lr_hi=0.1, lr_lo=0.02, report=5000):
    """小批量 SGD:前向 → p − onehot → 梯度一条更新 W,一条散射回 C"""
    global C, W               # 函数里要重新绑定这两张表,Python 要求点名(≈ JS 直接改外层变量)
    with np.errstate(over="ignore", invalid="ignore"):  # 翻车时 exp 溢出的警告先压掉,loss 自会招供
        for step in range(steps):
            lr = lr_hi if step < steps * 2 // 3 else lr_lo    # 前段大步走,后段小步修
            i = rng.integers(0, cut, batch)
            cb, tb = ctx_tr[i], tgt_tr[i]             # (B,3) (B,)
            h = C[cb].reshape(batch, BL * DIM)        # ① 三查一拼:(B,48)
            logits = h @ W                            # ② 面试官:(B,67)
            z = logits - logits.max(axis=1, keepdims=True)
            e = np.exp(z)
            probs = e / e.sum(axis=1, keepdims=True)  # ③ softmax
            probs[np.arange(batch), tb] -= 1.0        # 反向发令枪:p − onehot(0.2 原班人马)
            g = probs / batch                         # (B,67) 取平均
            gW = h.T @ g                              # 路① → W 的梯度 (48,67)
            dh = g @ W.T                              # 路② 梯度穿过「旧 W」回到 (B,48)
            W -= lr * gW                              # 更新面试官
            np.add.at(C, cb, -lr * dh.reshape(batch, BL, DIM))  # 拆回 (B,3,16),按字符散射回各自行
            if step % report == 0 or step == steps - 1:
                tr, dv = loss_on(ctx_tr, tgt_tr), loss_on(ctx_dv, tgt_dv)
                if not np.isfinite(tr):
                    print(f"  step {step:6d} | loss {tr} —— lr 翻车现场,停机")
                    return
                print(f"  step {step:6d} | train {tr:.4f} | dev {dv:.4f}")

print("\n[大步实验] 0.2 的老步子 lr=1.0 搬来 1500 步——0.2 考题 Q2 预言深网络会翻车,当场验:")
train(steps=1500, lr_hi=1.0, lr_lo=1.0, report=500)
print("\n[重摇骰子] 两次实验统一起点,重新初始化两张表:")
C = rng.standard_normal((V, DIM)) * 0.01
W = rng.standard_normal((BL * DIM, V)) * 0.01
print("[正式训练] lr 0.1 → 0.02:")
train(steps=30000)

# ⑦ 补一味药:隐藏层——让三个字符先开会,再表决 ──────────────────
# 线性版的天花板:W 按列可切成三块,logits = C[c1]@W左 + C[c2]@W中 + C[c3]@W右
# ——三份独立评分直接相加,t/h/e 之间零交互(the 连体、qu 搭配这类组合信号进不了分数)
# 隐藏层:先把 48 维搅拌成 100 维、tanh 折一道,再表决。
# NN2 的老课在此兑现:没有 tanh,两层线性塌成一层,白搭——非线性是灵魂
H = 100                                          # 会议规模:100 个神经元
C2 = rng.standard_normal((V, DIM)) * 0.01
W1 = rng.standard_normal((BL * DIM, H)) / np.sqrt(BL * DIM)  # 初值按入维缩尺寸,免得 tanh 开场就饱和
b1 = np.zeros(H)
W2 = rng.standard_normal((H, V)) * 0.01
b2 = np.zeros(V)
npar2 = C2.size + W1.size + b1.size + W2.size + b2.size
print(f"\n[MLP 版] C {C2.size} + W1 {W1.size} + b {b1.size + b2.size} + W2 {W2.size}"
      f" = {npar2} 个参数,内存 {npar2 * 8 / 1024:.0f} KB")

def forward2(c3):
    """三查一拼 → 开会(tanh)→ 表决。c3 (B,3) → logits (B,67)"""
    h0 = C2[c3].reshape(len(c3), BL * DIM)       # (B,48) 老演员
    h1 = np.tanh(h0 @ W1 + b1)                   # (B,100) 搅拌 + 折弯:字符间第一次化学反应
    return h1 @ W2 + b2, h0, h1                  # (B,67) 表决

def loss2(c3, t, batch=4096):
    i = rng.integers(0, len(c3), batch)
    logits, _, _ = forward2(c3[i])
    z = logits - logits.max(axis=1, keepdims=True)
    e = np.exp(z)
    p = e / e.sum(axis=1, keepdims=True)
    return float(-np.log(p[np.arange(batch), t[i]]).mean())

def train2(steps=30000, batch=512):
    global C2, W1, b1, W2, b2
    with np.errstate(over="ignore", invalid="ignore"):
        for step in range(steps):
            lr = 0.1 if step < steps * 2 // 3 else 0.02
            i = rng.integers(0, cut, batch)
            cb, tb = ctx_tr[i], tgt_tr[i]
            logits, h0, h1 = forward2(cb)
            z = logits - logits.max(axis=1, keepdims=True)
            e = np.exp(z)
            probs = e / e.sum(axis=1, keepdims=True)
            probs[np.arange(batch), tb] -= 1.0   # 发令枪还是 p − onehot
            g = probs / batch                    # (B,67)
            # ⑥ 的纪律:全部梯度先用「旧参数」算完,再统一更新
            gW2, gb2 = h1.T @ g, g.sum(0)                     # 路①:表决层
            da = (g @ W2.T) * (1 - h1 ** 2)                   # 过弯:tanh 的导数 = 1−h₁²(链式法则)
            gW1, gb1 = h0.T @ da, da.sum(0)                   # 中路:会议层
            dh0 = da @ W1.T                                    # 路②:继续穿回 48 维
            W2 -= lr * gW2; b2 -= lr * gb2
            W1 -= lr * gW1; b1 -= lr * gb1
            np.add.at(C2, cb, -lr * dh0.reshape(batch, BL, DIM))  # 散射回身份证
            if step % 5000 == 0 or step == steps - 1:
                print(f"  step {step:6d} | train {loss2(ctx_tr, tgt_tr):.4f} | dev {loss2(ctx_dv, tgt_dv):.4f}")

print("[MLP 训练] lr 0.1 → 0.02:")
train2(steps=30000)

# ⑧ 采样:滑窗接龙——生成一字,窗口右移一格 ──────────────────────
def sample(fwd, n_chars=400, seed=7):
    r = np.random.default_rng(seed)
    cur = np.full(BL, stoi["\n"], dtype=np.int64)  # 从 '\n\n\n' 开场(①段垫的就是它)
    out = []
    for _ in range(n_chars):
        z = fwd(cur[None, :])[0]                   # (67,) 分数
        z = z - z.max(); e = np.exp(z); p = e / e.sum()
        c = int(r.choice(V, p=p))                  # 按概率抽签(0.1/0.2 同款)
        out.append(itos[c])
        cur = np.concatenate([cur[1:], [c]])       # 丢最老的字,进新字:自回归
    return "".join(out)

print("\n[MLP 版采样 400 字]——对照 0.2 的伪莎翁碎词:")
print(sample(lambda cc: forward2(cc)[0], 400))

# ⑨ 行家的底牌:插值平滑——比 backoff 精一档的修补手艺 ───────────
# backoff 是「查不到才退」;行家全程混着用:λ·p3 + (1−λ)·p2
# 尖刺的记忆 + 平滑的稳重各取所长,N-gram 时代三十年的主流配方
p3_dv = np.where(has_row, cnt[cid_dv, tgt_dv] / np.maximum(rows[cid_dv], 1), 0)
print()
for lam in (0.3, 0.5, 0.7):
    pint = lam * p3_dv + (1 - lam) * p2_dv
    print(f"[插值 λ={lam}] dev {float(-np.log(np.maximum(pint, 1e-30)).mean()):.4f}"
          f"  ← λ 在考卷上现挑的最好值,后面算账要记这笔")
