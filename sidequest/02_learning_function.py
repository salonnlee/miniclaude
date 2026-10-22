"""支线 S2《神经元与 XOR》:给加权求和装上"弯",否则多层白搭。

四幕剧:
  第一幕  神经元 = 加权求和 + 激活(ReLU):S1 直线的"掰弯"改造
  第二幕  感知机悲剧:单神经元(一条直边)永远切不开 XOR 的四个点
  第三幕  两层 + ReLU 学会 XOR;反证:激活换成恒等函数,两层坍缩回一层
          ——非线性是网络的灵魂
  第四幕  偷看隐层:网络自己发明了『恰好一个开』的中间概念(表示学习)
  彩蛋    死区实录:ReLU 全灭时梯度失联,训练原地踏步——
          真实世界靠换种子/换初始化逃逸(本文件的 seed=21 就是挑出来的)

运行:.venv/bin/python sidequest/02_learning_function.py
"""
import random

XOR = [((0, 0), 0), ((0, 1), 1), ((1, 0), 1), ((1, 1), 0)]
H = 1e-5                                   # 数值梯度的"头发丝",S1 同款
SEED = 21                                  # 实测 30 个种子里 6 个能逃出死区,这是其一


def relu(t):
    """ReLU:负数归零,正数照抄。最小号的『弯』,现代网络的事实标准"""
    return t if t > 0 else 0.0


# ═══ 第一幕:神经元 = 加权求和 + 激活 ═══════════════════════════
def neuron(x1, x2, w1, w2, b):
    """两个输入 → 加权求和 → ReLU。与 S1 直线的区别只多一道激活"""
    return relu(w1 * x1 + w2 * x2 + b)


def show_neuron():
    print("第一幕:神经元 = 加权求和 + ReLU(同一组权重,偏置决定『门槛』)")
    for w1, w2, b, label in [
            (1, 1, 0, "w=(1,1) b=0 :输出 = x1+x2(有几个亮几个)"),
            (1, 1, -1, "w=(1,1) b=-1:和不到 1 就归零 → 只剩『两个都开』(AND 门)")]:
        outs = tuple(neuron(x1, x2, w1, w2, b) for x1 in (0, 1) for x2 in (0, 1))
        print(f"    {label}\n      输出 (00,01,10,11) = {outs}")


# ═══ 第二幕:单神经元的死局 ═════════════════════════════════════
def show_tragedy():
    print("\n第二幕:单神经元的死局(ReLU 单元只能画『一条直边』)")
    w1, w2, b = 0.0, 0.0, 0.0               # 从零开始,老实训练
    lr = 0.5
    for _ in range(6000):
        for (x1, x2), y in XOR:
            pred = neuron(x1, x2, w1, w2, b)
            # 数值梯度 × 均方误差的斜率 2(pred−y):S1 的下坡,一个点一个点扫
            gw1 = (relu((w1 + H) * x1 + w2 * x2 + b) - relu((w1 - H) * x1 + w2 * x2 + b)) / (2 * H)
            gw2 = (relu(w1 * x1 + (w2 + H) * x2 + b) - relu(w1 * x1 + (w2 - H) * x2 + b)) / (2 * H)
            gb = (relu(w1 * x1 + w2 * x2 + b + H) - relu(w1 * x1 + w2 * x2 + b - H)) / (2 * H)
            w1 -= lr * 2 * (pred - y) * gw1
            w2 -= lr * 2 * (pred - y) * gw2
            b -= lr * 2 * (pred - y) * gb
    print(f"  训到底:w=({w1:.2f},{w2:.2f}) b={b:.2f}")
    for xy, y in XOR:
        p = neuron(xy[0], xy[1], w1, w2, b)
        print(f"    输入 {xy} → 预测 {p:>4.2f} | 答案 {y} {'✓' if abs(p - y) < 0.5 else '✗'}")
    print("  → 怎么训都过不了 3/4:四个点在正方形四角,对角相同。一条直边")
    print("    (ReLU 单元=半个平面)不可能『只留下两个对角、切掉另两个对角』\n")


# ═══ 第三幕:两层网络 + 非线性证明 ═════════════════════════════
def make_net(act, seed=SEED):
    """两层网络:隐层 2 神经元(带激活)→ 输出 1 神经元(线性读出)"""
    rng = random.Random(seed)
    W1 = [[rng.uniform(-1, 1) for _ in range(3)] for _ in range(2)]   # 2 神经元 × (w1,w2,b)
    W2 = [rng.uniform(-1, 1) for _ in range(3)]                       # 读出 × (h1,h2,b)

    def net(x1, x2):
        h1 = act(W1[0][0] * x1 + W1[0][1] * x2 + W1[0][2])
        h2 = act(W1[1][0] * x1 + W1[1][1] * x2 + W1[1][2])
        return W2[0] * h1 + W2[1] * h2 + W2[2]

    def loss():
        return sum((net(x1, x2) - y) ** 2 for (x1, x2), y in XOR) / len(XOR)

    return W1, W2, net, loss


def train_net(act, seed=SEED, steps=8000, lr=0.5):
    """9 个旋钮逐个『量坡下坡』(数值梯度;S3 手推链式法则后可省 99% 计算量)"""
    W1, W2, net, loss = make_net(act, seed)  # 初始化网络、权重、loss函数
    
    def bump(k, dv):  # 局部辅助函数，拨动第k个参数
        if k < 6:
            i, j = divmod(k, 3)
            W1[i][j] += dv
        else:
            W2[k - 6] += dv
    
    for _ in range(steps):         # 多轮迭代
        for k in range(9):         # 逐个参数算梯度、更新
            # 中心差分计算g
            bump(k, H)
            lp = loss()
            bump(k, -2 * H)
            lm = loss()
            bump(k, H)
            g = (lp - lm) / (2 * H)
            bump(k, -lr * g)
    return W1, W2, net, loss


def show_victory():
    print("第三幕:两层网络 + ReLU 学会 XOR(seed=21)")
    W1, W2, net, loss = train_net(relu)
    print(f"  训练后 loss = {loss():.6f}")
    for xy, y in XOR:
        p = net(*xy)
        print(f"    输入 {xy} → 预测 {p:>6.3f} | 答案 {y} {'✓' if abs(p - y) < 0.3 else '✗'}")

    print("\n  反证:同样的两层,激活换成恒等函数 f(t)=t:")
    Wi1, Wi2, net_i, loss_i = train_net(lambda t: t)
    for xy, y in XOR:
        p = net_i(*xy)
        print(f"    输入 {xy} → 预测 {p:>6.3f} | 答案 {y} {'✓' if abs(p - y) < 0.3 else '✗'}")
    print(f"  → 恒等激活 loss = {loss_i():.4f}:a·(w11x1+w12x2+b1) + b·(…) + c 展开")
    print("    合并后仍是 x1、x2 的线性式——『两层 = 一层』,直线依旧切不开\n")


# ═══ 第四幕:偷看隐层学到的"概念" ═════════════════════════════
def show_hidden():
    print("第四幕:偷看隐层(它自己发明了中间概念)")
    W1, W2, net, _ = train_net(relu)
    for xy, _ in XOR:
        x1, x2 = xy
        hs = tuple(relu(W1[i][0] * x1 + W1[i][1] * x2 + W1[i][2]) for i in range(2))
        print(f"    输入 {xy} → 隐层激活 {hs}")
    print("  → 隐层两只神经元 = 两个方向探测器:h1 ≈ −x1+x2(只 x2 开),h2 ≈ x1−x2(只 x1 开)")
    print("    读出层相加:『恰好一个开』= 两个探测器或开其一。隐层的全部工作 =")
    print("    把直刀切不开的输入空间,折叠成读出层一条直边就能切开的隐层空间")
    print("    (实测本解里 (0,1)→(1.03,0)、(1,0)→(0,1.08) 并不相邻——『折到相近』")
    print("     只是某些解的长相,不是必须;不变的是『不可分 → 可分』。学员抓错更正,2026-10-22)")
    print("    网络自己发明中间概念,这叫表示学习——大模型里几十亿参数的『特征』,就是它的豪华版")


if __name__ == "__main__":
    show_neuron()
    show_tragedy()
    show_victory()
    show_hidden()
