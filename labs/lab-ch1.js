/* labs/lab-ch1.js —— CH1 实验室：curl 素颜相见台 + messages 解剖台
   ----------------------------------------------------------------------------
   A 台：把 CH1 那次真机裸调的请求行与响应 JSON 摆上台面，色块可点，
         解剖卡交代每个字段的来处与用途（数据取自 2026-10-27 实测，非示意）。
   B 台：四组开关组合 × 真机实测——不带历史问「我刚才说了什么」一脸茫然，
         问答原文塞回数组立刻「记起」；prompt_tokens 17 / 24 / 40 / 47 全部实测，
         不做估算器，「记忆按 token 收费」当场对账。 */
(function () {
  var $id = window.Lab.$id;

  /* ---------- A · 素颜相见台 ---------- */
  var EXP = {
    url: ['端点：聊天补全',
      '<code>chat/completions</code>——「补全」补的就是下一个词，端点名字没骗人：' +
      '你眼里是聊天，服务器眼里是「给这段前文续下文」。智谱的地址带 <code>/v4</code> 版本号，' +
      '换一家厂商就是换个域名，形状不变。'],
    auth: ['钥匙：Authorization',
      'Bearer 后面就是 API key（实验室里以 <code>$GLM_API_KEY</code> 环境变量出镜，key 永远不写进代码——' +
      'CH2 会专门讲怎么管它）。服务器凭这串字符认账：谁在调用、费用记谁头上。它泄露等于把银行卡借给别人。'],
    ctype: ['声明：Content-Type',
      '告诉服务器 <code>-d</code> 带的 body 是 JSON。不说的话服务器按表单猜，猜错就报错。三件套里最没戏份但缺不得。'],
    body: ['body：对话的全部形状',
      '整个 body 就两个键：<code>model</code> 点名要哪个型号，<code>messages</code> 是「角色＋内容」的数组。' +
      '这次只带一条 <code>user</code>——没有历史、没有设定，模型看到的全部世界就是这一行字。' +
      'B 台就来拧这个数组。'],
    choices: ['choices：回答装在盒子里',
      '回答不裸放，装在 <code>choices[0].message</code> 里——数组是给「一次生成多个候选」留的位子，日常只取第 0 个。' +
      '<code>finish_reason: "stop"</code> 是它说「我说完了」；另一个常见值 <code>length</code> 是被 max_tokens 掐断的。'],
    content: ['content：出口的话',
      '真正打印给你看的正文。glm-4.6 是带思考腔的型号——出口前先在肚里打草稿，成品就在这个字段。'],
    reason: ['reasoning_content：肚子里的草稿',
      '模型出声前的自我推演，实测 1,204 个 token。默认不展示但<b>照样计费</b>——想省钱可以关掉思考，答案成色自己权衡。'],
    usage: ['usage：账单',
      '每次调用回来都带账单：<code>prompt_tokens</code> 是你发的话、<code>completion_tokens</code> 是它吐的话（含思考草稿），' +
      '合计 <code>total_tokens</code> = 16 + 1221 = 1237。CH2 的 CLI 退出时报告花了多少钱，数就从这取。'],
    ptok: ['prompt_tokens：你发的话的价',
      '「用一句话介绍你自己」12 个汉字，计 16 个 token——token 是模型的计量单位，大致一字一词一切分，不等于字符数。'],
    rtok: ['reasoning_tokens：草稿的价',
      '1,221 个 completion 里 1,204 个是思考草稿，正文只占 17 个。草稿藏在响应里不展示，账单一分不少。']
  };
  var expBox = $id('c1-exp');
  var onSeg = null;
  Array.prototype.forEach.call(document.querySelectorAll('#ch1-lab .c1-sg'), function (el) {
    el.addEventListener('click', function () {
      if (onSeg) onSeg.classList.remove('on');
      onSeg = el;
      el.classList.add('on');
      var e = EXP[el.getAttribute('data-exp')];
      expBox.innerHTML = '<h4>' + e[0] + '</h4><div>' + e[1] + '</div>';
    });
  });

  /* ---------- B · messages 解剖台 ---------- */
  var FINAL = { role: 'user', content: '我刚才说了什么？' };
  var TURN1 = [
    { role: 'user', content: '用一句话介绍你自己' },
    { role: 'assistant', content: '我是一个致力于通过处理信息和生成创意来帮助你实现目标的人工智能助手。' }
  ];
  var SYSTEM = { role: 'system', content: '你是一个简洁的助手。' };
  /* 四组真机实测（2026-10-27，glm-4.6， replies 取原文首段） */
  var REAL = {
    '0-0': { tok: 17, reply: '这是我们对话的第一条消息，所以我这边没有看到您之前说过的内容。……（它无法访问之前的对话记录）' },
    '1-0': { tok: 24, reply: '这是我们对话的第一条消息，我没有看到您之前说过的话。如果您想讨论某个话题，请告诉我。' },
    '0-1': { tok: 40, reply: '你刚才让我用一句话介绍我自己。' },
    '1-1': { tok: 47, reply: '你刚才说：“用一句话介绍你自己”。' }
  };
  var state = { system: false, turn1: false };

  function render() {
    var msgs = [];
    if (state.system) msgs.push(SYSTEM);
    if (state.turn1) msgs = msgs.concat(TURN1);
    msgs.push(FINAL);
    var text = JSON.stringify({ model: 'glm-4.6', messages: msgs }, null, 1);
    /* 只高亮角色字段，正文原样可读 */
    text = text.replace(/"role": "(\w+)"/g, '"role": "<b class="c1-r-$1">$1</b>"');
    $id('c1-msgs').innerHTML = text;
    var r = REAL[(state.system ? 1 : 0) + '-' + (state.turn1 ? 1 : 0)];
    $id('c1-tok').textContent = r.tok;
    $id('c1-delta').textContent = r.tok > 17
      ? '← 比不带记忆多 ' + (r.tok - 17) + ' 个，「记忆」的价钱'
      : '← 底价：只发最后一条';
    $id('c1-reply').innerHTML = '<i>assistant</i>' + r.reply;
  }
  Array.prototype.forEach.call(document.querySelectorAll('#ch1-lab .c1-tg'), function (el) {
    el.addEventListener('click', function () {
      var k = el.getAttribute('data-k');
      state[k] = !state[k];
      el.classList.toggle('on', state[k]);
      render();
    });
  });
  render();
})();
