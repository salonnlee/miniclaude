# Python for JS 老手 · 速查卡

搓丹线(Python)随用随记,每遇到一个新语法点就增补一行。
对照基准:现代 JS / TypeScript。

## 模块从哪来(Python 的三层世界)

| 层 | Python | JS 对照 | 例子 |
|---|--------|---------|------|
| 语言内置,免 import | builtins | 全局对象(Math/JSON/console) | `print` `len` `zip` `max` `sum` `sorted` `set` `dict` `range` |
| 标准库,要 import | stdlib | Node 内置模块 `node:fs` | `collections` `json` `os` `re` `math` |
| 第三方包,pip 装 | site-packages | npm 包 | `numpy`(装在 `.venv`) |

## 01_bigram.py 里出现的语法点

### 切片 `text[1:]` ↔ `text.slice(1)`
```python
text[1:]     # 去掉第 0 个字符,取到结尾   → "ello"
text[:3]     # 取前 3 个(含头不含尾)     → "hel"
text[-2:]    # 负数从尾部数              → "lo"
text[a:b]    # 通用式 ≈ text.slice(a, b)
```

### `zip(a, b)` ↔ 手写配对循环
把两个序列按位置拉成一对对,短的先耗尽就停(所以 `zip(text, text[1:])` 正好产出全部相邻对):
```python
zip("hello", "ello")  # (h,e) (e,l) (l,l) (l,o)
```
JS 等价:
```js
for (let i = 0; i < text.length - 1; i++) pairs.push([text[i], text[i+1]]);
```

### `*` 解包 ↔ `...` 展开
```python
chars, weights = zip(*probs[cur])   # * 把 [(ch,w),(ch,w)..] 摊开成两条序列
```
```js
const [chars, weights] = unzip(pairs);  // ≈ zip(...pairs) 的感觉
```

### `random.choices`(带权重抽签)↔ 手写轮盘赌
```python
random.choices(chars, weights=weights)[0]   # 按权重随机取 1 个;返回 list,故取 [0]
```
```js
function weightedPick(items, weights) {
  const r = Math.random() * weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += weights[i];
    if (r < acc) return items[i];
  }
  return items.at(-1);   // 浮点误差兜底
}
```

### `Counter` ↔ 自动计数的 Map(标准库 collections)
```python
cnt[nxt] += 1          # key 不存在从 0 起算,不报 KeyError
cnt.most_common(3)     # 按次数排序取 top3
```
```js
m.set(k, (m.get(k) ?? 0) + 1);        // JS 手写版
[...m].sort((a,b)=>b[1]-a[1]).slice(0,3)  // ≈ most_common(3)
```

### `defaultdict(Counter)` ↔ `map.get(k) ??= new Map()`
读不存在的 key 不报错,先自动建一个默认值再返回:
```python
counts = defaultdict(Counter)
counts['q']['u'] += 1  # 'q' 不存在?自动建空 Counter,再数
```
没有 defaultdict 的啰嗦版(两者等价):
```python
if prev not in counts:
    counts[prev] = Counter()
counts[prev][nxt] += 1
```
JS 精神孪生就是空值赋值:`obj[k] ??= {}`。

### 列表推导式 ↔ `.map()`
```python
[(ch, n / total) for ch, n in cnt.items()]
```
```js
Object.entries(cnt).map(([ch, n]) => [ch, n / total])
```
`for ch, n in pairs` 的 `ch, n` 是元组解构 ≈ `const [ch, n] of ...`。

### f-string ↔ 模板字符串
```python
f"语料 {len(text):,} 字符"   # :, = 千分位
```
```js
`语料 ${text.length.toLocaleString()} 字符`
```

## NumPy 速查(02_neural_bigram.py 起)

### 造数组与形状
```python
W = rng.standard_normal((67, 67))     # 造 67×67 随机矩阵,W.shape → (67, 67)
ids = np.array([...], dtype=np.int32) # 指定类型的数组
```
numpy 的多维是「真矩阵」(一整块内存 + 形状标签);JS 嵌套数组只是「数组的数组」。

### 花式索引:一次取多行
```python
W[cur_ids]     # cur_ids shape=(B,) → 结果 shape=(B, 67)
```
≈ `cur_ids.map(i => W[i])`,但是零拷贝、免 for——矩阵运算的地基。

### 广播 broadcasting
```python
e / e.sum(axis=1, keepdims=True)   # (B,67) ÷ (B,1):每行各自除以自己的和
```
JS 没有对应物:形状不同的数组按规则自动对齐,相当于「编译器替你写 for」。
`axis=1` = 沿列方向折叠(每行得一个数);`keepdims=True` 保留 (B,1) 形状以便继续广播。

### np.add.at:无缓冲散射
```python
np.add.at(W, cur, -lr * grads / batch)
```
同一行索引出现多次时逐次累加 ≈ `cur.forEach((r, i) => W[r] += g[i])` 的向量化版。

### 随机与抽样
```python
rng = np.random.default_rng(42)   # 可种子化随机源 ≈ 可复现版 Math.random
rng.integers(0, n, batch)         # 批量随机整数
rng.choice(V, p=p)                # 按概率抽签 ≈ 前面手写的 weightedPick
```

### 杂项
```python
{ch: i for i, ch in enumerate(vocab)}  # 字典推导式 ≈ Object.fromEntries(vocab.map((c,i)=>[c,i]))
if __name__ == "__main__":             # ≈ require.main === module(直接运行才执行)
probs[np.arange(B), nxt]               # 二维花式索引:按 (行号, 列号) 成对取/改元素
```
