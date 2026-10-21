/* 作品社区数据（对标 OiiOii 的 Oii TV）
   分类 tab + 作品流 + 发布作品
   作品素材来自本地 /public/cases（示例作品带作者与参数） */

export type WorkCategory = '短剧' | '动画' | '电商' | '口播' | '动作' | '自由';

export const WORK_CATEGORIES: WorkCategory[] = ['短剧', '动画', '电商', '口播', '动作', '自由'];

export interface WorkItem {
  id: string;
  title: string;
  desc: string;
  cover: string;
  category: WorkCategory;
  author: string;
  likes: number;
  params: string;
  createdAt: string;
  /** 我发布的作品 */
  mine?: boolean;
}

const C = (scene: string, id: string) => `/cases/${scene}/${id}.jpg`;

const AUTHORS = ['阿澈', '小满', '夜航船', '山门外', '半盏灯', '拾光', '南风', '默片时代'];

export const WORKS: WorkItem[] = [
  { id: 'w-009', title: '霓虹街头的她', desc: '都市夜景，独白式开场', cover: C('short-drama', '009'), category: '短剧', author: AUTHORS[0], likes: 42800, params: '9:16 · 720P · 42s', createdAt: '2 小时前' },
  { id: 'w-030', title: '午夜礼服', desc: '暖调人像，电影质感', cover: C('short-drama', '030'), category: '短剧', author: AUTHORS[1], likes: 38600, params: '9:16 · 720P · 38s', createdAt: '3 小时前' },
  { id: 'w-048', title: '雨夜序章', desc: '黑白影调，悬念留白', cover: C('short-drama', '048'), category: '短剧', author: AUTHORS[2], likes: 29100, params: '9:16 · 1080P · 45s', createdAt: '4 小时前' },
  { id: 'w-067', title: '剑与影', desc: '古风武侠，竹林对峙', cover: C('short-drama', '067'), category: '短剧', author: AUTHORS[3], likes: 51300, params: '16:9 · 720P · 102s', createdAt: '5 小时前' },
  { id: 'w-205', title: '悬崖之上', desc: '户外运动，垂直构图', cover: C('short-drama', '205'), category: '短剧', author: AUTHORS[4], likes: 17400, params: '9:16 · 720P · 32s', createdAt: '昨天' },
  { id: 'w-249', title: '荒野旅途', desc: '远景叙事，孤独感', cover: C('short-drama', '249'), category: '短剧', author: AUTHORS[5], likes: 22600, params: '16:9 · 1080P · 58s', createdAt: '昨天' },
  { id: 'w-275', title: '林间越野', desc: '森林公路，日景跟拍', cover: C('short-drama', '275'), category: '短剧', author: AUTHORS[6], likes: 15900, params: '16:9 · 720P · 41s', createdAt: '昨天' },
  { id: 'w-293', title: '溪谷秘境', desc: '自然水景，绿意通透', cover: C('short-drama', '293'), category: '短剧', author: AUTHORS[7], likes: 11300, params: '16:9 · 1080P · 36s', createdAt: '2 天前' },

  { id: 'w-081', title: '冰原少女', desc: '冰雪场景，柔光渲染', cover: C('animation', '081'), category: '动画', author: AUTHORS[1], likes: 55200, params: '9:16 · 720P · 35s', createdAt: '3 小时前' },
  { id: 'w-083', title: '金龙之城', desc: '云海城堡，宏大构图', cover: C('animation', '083'), category: '动画', author: AUTHORS[3], likes: 44100, params: '16:9 · 1080P · 52s', createdAt: '6 小时前' },
  { id: 'w-171', title: '国风庭院', desc: '写意留白，衣摆动势', cover: C('animation', '171'), category: '动画', author: AUTHORS[0], likes: 27800, params: '9:16 · 720P · 28s', createdAt: '昨天' },

  { id: 'w-060', title: '香水静物', desc: '深色岩面，侧逆光质感', cover: C('ecommerce', '060'), category: '电商', author: AUTHORS[2], likes: 63400, params: '1:1 · 1024px', createdAt: '1 小时前' },
  { id: 'w-227', title: '街头机车', desc: '夜景光斑，动态氛围', cover: C('ecommerce', '227'), category: '电商', author: AUTHORS[4], likes: 34200, params: '9:16 · 720P · 15s', createdAt: '4 小时前' },
  { id: 'w-211', title: '单车少女', desc: '生活方式，自然光', cover: C('ecommerce', '211'), category: '电商', author: AUTHORS[6], likes: 26100, params: '9:16 · 720P · 15s', createdAt: '昨天' },
  { id: 'w-279', title: '产品特写', desc: '棚拍布光，细节锐利', cover: C('ecommerce', '279'), category: '电商', author: AUTHORS[5], likes: 18900, params: '1:1 · 1024px', createdAt: '2 天前' },

  { id: 'w-240', title: '阳光下的微笑', desc: '正面构图，亲和力强', cover: C('portrait', '240'), category: '口播', author: AUTHORS[1], likes: 47300, params: '9:16 · 720P · 65s', createdAt: '2 小时前' },
  { id: 'w-073', title: '职场开场白', desc: '半身构图，专业形象', cover: C('portrait', '073'), category: '口播', author: AUTHORS[7], likes: 31500, params: '9:16 · 1080P · 48s', createdAt: '5 小时前' },
  { id: 'w-266', title: '骑行讲解', desc: '外景自然光，生活化', cover: C('portrait', '266'), category: '口播', author: AUTHORS[0], likes: 19400, params: '9:16 · 720P · 52s', createdAt: '昨天' },
  { id: 'w-020', title: '金发少女', desc: '柔光特写，肤质细腻', cover: C('portrait', '020'), category: '口播', author: AUTHORS[3], likes: 23800, params: '9:16 · 720P · 40s', createdAt: '昨天' },
  { id: 'w-234', title: '红发正脸', desc: '正面口播，眼神交流', cover: C('portrait', '234'), category: '口播', author: AUTHORS[5], likes: 14700, params: '9:16 · 720P · 44s', createdAt: '3 天前' },
  { id: 'w-283', title: '白裙撑伞', desc: '外景人像，氛围通透', cover: C('portrait', '283'), category: '口播', author: AUTHORS[2], likes: 12600, params: '9:16 · 1080P · 38s', createdAt: '3 天前' },

  { id: 'w-011', title: '霓光动作', desc: '霓虹光效，动势强', cover: C('motion', '011'), category: '动作', author: AUTHORS[4], likes: 36900, params: '16:9 · 720P · 12s', createdAt: '3 小时前' },
  { id: 'w-289', title: '街头律动', desc: '城市夜景，动态抓拍', cover: C('motion', '289'), category: '动作', author: AUTHORS[6], likes: 21200, params: '9:16 · 720P · 10s', createdAt: '昨天' },

  { id: 'w-019', title: '机械之心', desc: '科幻机械，未来质感', cover: C('free', '019'), category: '自由', author: AUTHORS[7], likes: 28700, params: '9:16 · 720P · 22s', createdAt: '4 小时前' },
  { id: 'w-075', title: '金属面孔', desc: '金属反射，冷调光影', cover: C('free', '075'), category: '自由', author: AUTHORS[0], likes: 25400, params: '9:16 · 720P · 18s', createdAt: '昨天' },
  { id: 'w-079', title: '湖畔日落', desc: '远山倒影，暖调电影感', cover: C('free', '079'), category: '自由', author: AUTHORS[1], likes: 36100, params: '16:9 · 720P · 30s', createdAt: '6 小时前' },
  { id: 'w-188', title: '巨蛛来袭', desc: '概念设计，压迫感构图', cover: C('free', '188'), category: '自由', author: AUTHORS[2], likes: 17300, params: '9:16 · 720P · 8s', createdAt: '2 天前' },
  { id: 'w-220', title: '机械巢穴', desc: '工业科幻，细节密度高', cover: C('free', '220'), category: '自由', author: AUTHORS[3], likes: 13800, params: '16:9 · 1080P · 14s', createdAt: '3 天前' },
];

/** 发布作品（存本机，刷新不丢） */
const MY_WORKS_KEY = 'cineva.myWorks';

export function loadMyWorks(): WorkItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MY_WORKS_KEY);
    return raw ? (JSON.parse(raw) as WorkItem[]) : [];
  } catch {
    return [];
  }
}

export function saveMyWorks(list: WorkItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MY_WORKS_KEY, JSON.stringify(list));
}

export function formatLikes(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)} 万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)} 千`;
  return String(n);
}
