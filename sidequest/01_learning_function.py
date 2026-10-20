"""支线 S1《会学习的函数》:神经网络的第一性原理。

三个零件,缺一不可:
  模型  = 带旋钮的函数 f(x) = w * x + b(旋钮 w、b 就是「参数」)
  loss = 一个数字,给「错得多离谱」打分(越小越对)
  训练 = 反复「用尺子量坡度 → 朝下坡方向拧一点旋钮」

零依赖纯标准库:每个零件都裸露可见。跑法:
  .venv/bin/python sidequest/01_learning_function.py
"""
import random

random.seed(42)

# ① 造数据:暗中写的规律是 y = 2x + 1,再加一点噪声(更像真实测量)──
# data 长相:[(0.0, 1.04), (0.1, 1.19), (0.2, 1.38), ...] 共 20 个 (x, y)
data = []
for i in range(20):
    x = i * 0.1
    y = 2 * x + 1 + random.uniform(-0.1, 0.1)
    data.append((x, y))

def model(x, w, b):
    """带两个旋钮的函数:旋钮值不同,函数就不同"""
    return w * x + b

def loss(w, b):
    """给一组旋钮打分:预测与答案的平均平方差,越小越好"""
    total = 0.0
    for x, y in data:
        diff = model(x, w, b) - y        # 差多少(带正负方向)
        total += diff * diff             # 平方:去负号 + 离谱重罚
    return total / len(data)

# ② 探测坡度:数值梯度(有限差分)——不背微积分,直接拿尺子量 ──────
# 问:「把 w 拧大一根头发丝 H,loss 涨了多少?」涨了 → 该往反方向拧
H = 1e-5

def grad_w(w, b):
    return (loss(w + H, b) - loss(w - H, b)) / (2 * H)

def grad_b(w, b):
    return (loss(w, b + H) - loss(w, b - H)) / (2 * H)

# ③ 训练:从一无所知 (w=0, b=0) 出发,反复下坡 ──────────────────
w, b = 0.0, 0.0
LR = 0.1                                   # 学习率:每步拧多大

print(f"起点    | w {w:.3f} b {b:.3f} | loss {loss(w, b):.4f}")
for step in range(1, 201):
    w -= LR * grad_w(w, b)                 # 梯度为正 → w 调小;为负 → 调大
    b -= LR * grad_b(w, b)                 # 始终朝 loss 的下坡方向走
    if step % 40 == 0:
        print(f"step {step:3d} | w {w:.3f} b {b:.3f} | loss {loss(w, b):.6f}")

print(f"\n机器学到的:f(x) = {w:.3f} * x + {b:.3f}")
print("暗中写的真相:f(x) = 2.000 * x + 1.000")
print("没人告诉它规律,它只是被罚了两百次,就自己摸出了规律。")
