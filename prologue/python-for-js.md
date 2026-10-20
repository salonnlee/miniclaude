# Python for JS 老手 · 速查卡

搓丹线(Python)随用随记,每遇到一个新语法点就增补一行。
对照基准:现代 JS / TypeScript。

## 模块从哪来(Python 的三层世界)

| 层 | Python | JS 对照 | 例子 |
|---|--------|---------|------|
| 语言内置,免 import | builtins | 全局对象(Math/JSON/console) | `print` `len` `zip` `max` `sum` `sorted` `set` `dict` `range` |
| 标准库,要 import | stdlib | Node 内置模块 `node:fs` | `collections` `json` `os` `re` `math` |
| 第三方包,pip 装 | site-packages | npm 包 | `numpy`(装在 `.venv`) |

## bigram.py 里出现的语法点

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
