import math

def forward(params, x1, x2):
    w11, w21, b1, w12, w22, b2, w20, w21o, b2o = params
    h1 = w11*x1 + w21*x2 + b1
    h2 = w12*x1 + w22*x2 + b2
    h1r = max(0, h1)
    h2r = max(0, h2)
    out_pre = w20*h1r + w21o*h2r + b2o
    out = 1/(1+math.exp(-out_pre))
    return out, (h1, h2, h1r, h2r, out_pre)

print(forward([1,1,-1, 1,1,-2, 1,1,0], 0, 1))

def loss_and_out_grads(params, x1, x2, y):
    out, (h1, h2, h1r, h2r, out_pre) = forward(params, x1, x2)
    loss = (out - y)**2
    delta = 2*(out - y) * out*(1 - out)
    return loss, (h1r*delta, h2r*delta, delta)

print(loss_and_out_grads([1,1,-1, 1,1,-2, 1,1,0], 0, 1, 0))


def loss_only(params, x1, x2, y):
    out, _ = forward(params, x1, x2)
    return (out - y)**2


def full_grads(params, x1, x2, y):
    """手推反向传播:一次前向 + 一次反向,返回 (loss, 九个梯度)"""
    w11, w21, b1, w12, w22, b2, w20, w21o, b2o = params
    out, (h1, h2, h1r, h2r, out_pre) = forward(params, x1, x2)
    loss = (out - y)**2

    # ---- 读出层:三旋钮 = 各自乘的东西 × δ ----
    delta = 2*(out - y) * out*(1 - out)   # 链尾责任,过了 sigmoid
    dw20  = h1r * delta
    dw21o = h2r * delta
    db2o  = 1    * delta

    # ---- 穿 ReLU 进隐层:δ1/δ2 = 读出权重 × δ × relu 本地导数 ----
    d1 = w20  * delta * (1 if h1 > 0 else 0)
    d2 = w21o * delta * (1 if h2 > 0 else 0)
    dw11, dw21, db1 = x1*d1, x2*d1, 1*d1   # 各自乘的东西 × δ1
    dw12, dw22, db2 = x1*d2, x2*d2, 1*d2

    return loss, (dw11, dw21, db1, dw12, dw22, db2, dw20, dw21o, db2o)


def num_grads(params, x1, x2, y, H=0.00001):
    """NN1 的老尺子:每旋钮量两次。第四幕拿来当裁判"""
    g = []
    for i in range(len(params)):
        old = params[i]
        params[i] = old + H;  lp = loss_only(params, x1, x2, y)
        params[i] = old - H;  lm = loss_only(params, x1, x2, y)
        params[i] = old
        g.append((lp - lm) / (2*H))
    return g


print("\n== 第一幕账单:数值梯度每步前向次数 ==")
print("9 个旋钮:num_grads =", 2*9, "次前向;full_grads = 1 次")

print("\n== 第四幕:互证,两种方法逐旋钮对表 ==")
cases = [
    ([1, 1, -1,  1, 1, -2,  1, 1, 0], 0, 1, 0, "NN2 手搓参数,x=(0,1)"),
    ([0.5, -0.9, 0.1,  -0.3, 0.8, -0.2,  1.2, 0.7, -0.4], 1, 0, 1, "随机参数,x=(1,0)"),
    ([0.5, -0.9, 0.1,  -0.3, 0.8, -0.2,  1.2, 0.7, -0.4], 1, 1, 0, "同上,x=(1,1)"),
]
names = ["w11", "w21", "b1", "w12", "w22", "b2", "w20", "w21o", "b2o"]
for params, x1, x2, y, tag in cases:
    p = list(params)
    loss, g = full_grads(p, x1, x2, y)
    gn = num_grads(p, x1, x2, y)
    print(f"\n-- {tag} · loss={loss:.6f} --")
    for n, a, b in zip(names, g, gn):
        ok = "✓" if abs(a - b) < 1e-6 else "✗ 差太多!"
        print(f"  {n:5s} 手推 {a:+.6f}   数值 {b:+.6f}   {ok}")


# ---- 动手题:用反向传播训练 XOR(NN2 的活,这次梯度来自 full_grads)----
import random

DATA = [(0, 0, 0), (0, 1, 1), (1, 0, 1), (1, 1, 0)]

random.seed(10)   # 别的种子可能踩进死区(NN2 老朋友),10 号起点学得动
params = [random.uniform(-1, 1) for _ in range(9)]
LR = 0.5

for step in range(8001):
    total = 0.0
    for x1, x2, y in DATA:                    # 四行轮流喂,梯度累加
        loss, grads = full_grads(params, x1, x2, y)
        total += loss
        params = [p - LR*g for p, g in zip(params, grads)]
    if step % 1000 == 0:
        print(f"step {step:5d}  loss {total/4:.6f}")

print("\n学完的预测:")
for x1, x2, y in DATA:
    out, _ = forward(params, x1, x2)
    print(f"  x=({x1},{x2})  真值 {y}  预测 {out:.3f}  {'✓' if abs(out-y) < 0.5 else '✗'}")