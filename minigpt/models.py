"""模型货架:v0.0 摆两件,后续章节往这里挂新货。

两件共用同一个插头(这才是交付的约定,不是这两件的形状):
  · block_size              吃多长的前文
  · forward(idx)            一批前文 (B, block_size) → 一批分数 (B, V)
  · backward(idx, dlogits)  把 (B, V) 的梯度散射回参数,记进 self.grads
  · update(lr)              沿负梯度推一把全部参数(基类通吃)
发动机(engine.py)只认插头、不认型号——挂上新模型,训练循环一行不改。
"""
import numpy as np


class Model:
    """插头基类:子类只管填 params / forward / backward,update 通吃。"""

    block_size = 1
    params: dict = {}
    grads: dict = {}

    def update(self, lr):
        for name, p in self.params.items():
            p -= lr * self.grads[name]

    @property
    def n_params(self):
        return sum(p.size for p in self.params.values())


class BigramLM(Model):
    """P0.2 的神经版复读机:只看前文最后 1 个字符。

    W 是一张 (67, 67) 分数表:行 = 当前字符,列 = 候选的下一个字符。
    softmax(W[cur]) 与 P0.1 数数版的 probs[cur] 接口一模一样——只是这张表
    不靠数数填,靠梯度下降一格格学。
    """

    block_size = 1

    def __init__(self, vocab, rng):
        # 乘 0.01:初始分数接近全 0 → softmax 接近均匀分布 = 一无所知
        self.W = rng.standard_normal((vocab, vocab)) * 0.01
        self.params = {"W": self.W}

    def forward(self, idx):
        self._rows = idx[:, -1]              # bigram 的全部眼界:窗口最后一个字符
        return self.W[self._rows]            # 花式索引一次取 B 行:(B, 67)

    def backward(self, idx, dlogits):
        # 第 c 行的梯度 = 所有「当前字符是 c」的窗口送来的 dlogits 之和;
        # np.add.at 是容忍重复下标的向量化 +=(P0.2 ③ 同款)
        g = np.zeros_like(self.W)
        np.add.at(g, self._rows, dlogits)
        self.grads = {"W": g}


class MLPLM(Model):
    """P0.3 的最终阵容:身份证 C 表 + 隐藏层开会 + 表决层。

    前向三步:
      ① 三查一拼:C[c1] C[c2] C[c3] 各 16 维,拼成 48 维
      ② 开会:48 → 100,tanh 折一道——字符间第一次化学反应
      ③ 表决:100 → 67 个分数
    反向两条路(纪律:全部梯度先用旧参数算完,update 里才动参数):
      发令枪 (B,67) → 路① 直审 W2/b2;
      路② 穿过旧 W2、过 tanh 弯道(导数 1−h²)回会场,再穿过旧 W1
      拆回 48 维,散射回 C 表各行——「过弯」就是链式法则在 tanh 上的本地差。
    """

    block_size = 3

    def __init__(self, vocab, rng, dim=16, hidden=100):
        in_dim = self.block_size * dim
        self.C = rng.standard_normal((vocab, dim)) * 0.01                  # (67,16) 身份证库
        self.W1 = rng.standard_normal((in_dim, hidden)) / np.sqrt(in_dim)  # 初值按入维缩尺寸,免得 tanh 开场就饱和
        self.b1 = np.zeros(hidden)
        self.W2 = rng.standard_normal((hidden, vocab)) * 0.01              # 表决层:100 进 67 出
        self.b2 = np.zeros(vocab)
        self.params = {"C": self.C, "W1": self.W1, "b1": self.b1,
                       "W2": self.W2, "b2": self.b2}
        self._dim = dim

    def forward(self, idx):
        B = len(idx)
        self._idx = idx                                                   # backward 靠它散射回 C
        self._h0 = self.C[idx].reshape(B, self.block_size * self._dim)    # ① 三查一拼 (B,48)
        self._h1 = np.tanh(self._h0 @ self.W1 + self.b1)                  # ② 开会 + 折弯 (B,100)
        return self._h1 @ self.W2 + self.b2                               # ③ 表决 (B,67)

    def backward(self, idx, dlogits):
        gW2, gb2 = self._h1.T @ dlogits, dlogits.sum(0)                   # 路①:表决层,当面算账
        da = (dlogits @ self.W2.T) * (1 - self._h1 ** 2)                  # 路②:穿旧 W2 回会场,再过 tanh 弯
        gW1, gb1 = self._h0.T @ da, da.sum(0)                             # 中路:会议层的账
        dh0 = da @ self.W1.T                                              # 继续穿回 48 维
        gC = np.zeros_like(self.C)
        np.add.at(gC, self._idx,
                  dh0.reshape(len(dlogits), self.block_size, self._dim))  # 拆回 (B,3,16),散射回各行身份证
        self.grads = {"C": gC, "W1": gW1, "b1": gb1, "W2": gW2, "b2": gb2}
