/* main.js —— 课程表唯一脚本入口(ESM)
   ----------------------------------------------------------------------------
   COURSE.html 页尾只引这一个文件;加载顺序 = import 顺序 = 依赖顺序:
   实验室(各家 import shared.js 自挂载)→ 数据 + 渲染器(课次/卡/徽章)
   → 更新记录 → 页级行为(架构图播放器 + 锚点联动)。
   新增实验室 = labs/ 加一对样式/脚本文件 + 这里按位置挂一行 import。 */
import './labs/lab-bigram.js';
import './labs/lab-mlp.js';
import './labs/lab-nn.js';
import './labs/lab-3b.js';
import './labs/lab-3b7.js';
import './labs/lab-ch1.js';
import './labs/lab-chat.js';
import './COURSE-render.js';
import './COURSE-LOG.js';
import './COURSE-page.js';
