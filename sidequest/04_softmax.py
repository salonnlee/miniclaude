# NN4: softmax + 交叉熵
# 铺位:sidequest/04_softmax.py · 学完回主线 02_neural_bigram.py
# 规矩:只造轮子,不 import 神经网络库

import math
import random

def softmax(z):
    m = max(z)
    exps = [math.exp(v - m) for v in z]   # 减最大值:平移不变,防溢出
    s = sum(exps)
    return [e / s for e in exps]

def cross_entropy(p, y):
    for i in range(len(p)):
        if y[i] == 1:
            return -math.log(p[i])

def loss_on_logits(z, y):
    return cross_entropy(softmax(z), y)


def num_grads(z, y):
    H = 0.00001
    out = []
    for i in range(len(z)):
        z2 = list(z)
        z2[i] += H
        out.append((loss_on_logits(z2, y) - loss_on_logits(z, y)) / H)
    return out


if __name__ == "__main__":
    print(softmax([2.0, 1.0, 0.1]))
    print(softmax([20.0, 19.0, 18.1]))   # 应与上面完全相同
    print(cross_entropy([0.659, 0.242, 0.099], [0, 0, 1]))
    print("---")

    z = [2.0, 1.0, 0.1]
    y = [0, 0, 1]                            # 正确答案:c
    p = softmax(z)
    hand = [p[i] - y[i] for i in range(3)]   # 主角:p − y
    num = num_grads(z, y)                    # 查账:数值梯度

    print("p     =", [round(v, 6) for v in p])
    print("p - y =", [round(v, 6) for v in hand])
    print("数值   =", [round(v, 6) for v in num])
    for i in range(3):
        print(f"z[{i}]: {'✓' if abs(hand[i] - num[i]) < 1e-5 else '✗'}")

    # 收官小实验:z 当旋钮,p − y 带队下山,把答案 c 押满
    print("---")
    z = [2.0, 1.0, 0.1]
    y = [0, 0, 1]
    LR = 1.0
    for step in range(501):
        p = softmax(z)
        if step % 100 == 0:
            print(f"step {step:3d}  loss={cross_entropy(p, y):.4f}  p={round(p[0],3)},{round(p[1],3)},{round(p[2],3)}")
        g = [p[i] - y[i] for i in range(3)]
        z = [zi - LR * gi for zi, gi in zip(z, g)]