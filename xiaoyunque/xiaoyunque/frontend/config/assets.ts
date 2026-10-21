/* 「资产」库数据
   对标 OiiOii 的 /asset：我的资产 / 演员库 / 回收站 + 角色 · 场景 · 道具 · 合集 · 其他
   真实资产来自后端（本机生成产物），示例资产用本地 /public/cases 里的素材 */

export type AssetKind = '角色' | '场景' | '道具' | '合集' | '其他';

export const ASSET_KINDS: AssetKind[] = ['角色', '场景', '道具', '合集', '其他'];

export interface AssetItem {
  id: string;
  name: string;
  kind: AssetKind;
  cover: string;
  tags: string[];
  model: string;
  createdAt: string;
  origin: '示例' | '本机生成';
}

const C = (scene: string, id: string) => `/cases/${scene}/${id}.jpg`;

/** 骨架数据（模型与时间统一生成，避免重复） */
const SEED: Omit<AssetItem, 'model' | 'createdAt' | 'origin'>[] = [
  // ── 角色（人像）──
  { id: 'ch-001', name: '霓虹皮衣女孩', kind: '角色', cover: C('short-drama', '009'), tags: ['都市', '女性', '夜景'] },
  { id: 'ch-002', name: '午夜礼服', kind: '角色', cover: C('short-drama', '030'), tags: ['礼服', '女性', '暖光'] },
  { id: 'ch-003', name: '雨夜黑衣', kind: '角色', cover: C('short-drama', '048'), tags: ['都市', '黑白', '氛围'] },
  { id: 'ch-004', name: '剑客', kind: '角色', cover: C('short-drama', '067'), tags: ['古风', '武士', '武器'] },
  { id: 'ch-005', name: '攀岩者', kind: '角色', cover: C('short-drama', '205'), tags: ['运动', '户外', '动态'] },
  { id: 'ch-006', name: '金发少女', kind: '角色', cover: C('portrait', '020'), tags: ['女性', '特写', '柔光'] },
  { id: 'ch-007', name: '职场女性', kind: '角色', cover: C('portrait', '073'), tags: ['职业', '女性', '口播'] },
  { id: 'ch-008', name: '红发正脸', kind: '角色', cover: C('portrait', '234'), tags: ['女性', '正面', '亲和'] },
  { id: 'ch-009', name: '微笑主持', kind: '角色', cover: C('portrait', '240'), tags: ['女性', '口播', '亲和'] },
  { id: 'ch-010', name: '骑行少女', kind: '角色', cover: C('portrait', '266'), tags: ['户外', '生活', '自然光'] },
  { id: 'ch-011', name: '白裙撑伞', kind: '角色', cover: C('portrait', '283'), tags: ['白裙', '女性', '外景'] },
  { id: 'ch-012', name: '机械人像', kind: '角色', cover: C('free', '019'), tags: ['科幻', '机械', '未来'] },
  { id: 'ch-013', name: '金属面孔', kind: '角色', cover: C('free', '075'), tags: ['科幻', '金属', '冷调'] },
  // ── 场景（环境 / 风光）──
  { id: 'sc-001', name: '荒野旅途', kind: '场景', cover: C('short-drama', '249'), tags: ['荒野', '远景', '叙事'] },
  { id: 'sc-002', name: '林间越野', kind: '场景', cover: C('short-drama', '275'), tags: ['森林', '户外', '日景'] },
  { id: 'sc-003', name: '溪谷秘境', kind: '场景', cover: C('short-drama', '293'), tags: ['自然', '水景', '绿意'] },
  { id: 'sc-004', name: '冰原', kind: '场景', cover: C('animation', '081'), tags: ['冰雪', '动画', '冷调'] },
  { id: 'sc-005', name: '云海城堡', kind: '场景', cover: C('animation', '083'), tags: ['奇幻', '宏大', '金色'] },
  { id: 'sc-006', name: '国风庭院', kind: '场景', cover: C('animation', '171'), tags: ['国风', '红色', '写意'] },
  { id: 'sc-007', name: '湖畔日落', kind: '场景', cover: C('free', '079'), tags: ['湖景', '日落', '暖调'] },
  { id: 'sc-008', name: '巨蛛巢穴', kind: '场景', cover: C('free', '188'), tags: ['概念', '压迫感', '暗调'] },
  { id: 'sc-009', name: '机械巢穴', kind: '场景', cover: C('free', '220'), tags: ['机械', '科幻', '工业'] },
  // ── 道具（物件 / 商品）──
  { id: 'pr-001', name: '香水瓶', kind: '道具', cover: C('ecommerce', '060'), tags: ['商品', '静物', '侧逆光'] },
  { id: 'pr-002', name: '复古单车', kind: '道具', cover: C('ecommerce', '211'), tags: ['商品', '生活方式', '自然光'] },
  { id: 'pr-003', name: '街头机车', kind: '道具', cover: C('ecommerce', '227'), tags: ['商品', '机车', '夜景'] },
  { id: 'pr-004', name: '产品特写', kind: '道具', cover: C('ecommerce', '279'), tags: ['商品', '特写', '棚拍'] },
  // ── 其他 ──
  { id: 'ot-001', name: '霓光动作', kind: '其他', cover: C('motion', '011'), tags: ['动作', '霓虹', '动势'] },
  { id: 'ot-002', name: '街头律动', kind: '其他', cover: C('motion', '289'), tags: ['动作', '街头', '抓拍'] },
  // ── 合集 ──
  { id: 'cl-001', name: '短剧角色合集', kind: '合集', cover: C('short-drama', '067'), tags: ['合集', '短剧', '6 个资产'] },
  { id: 'cl-002', name: '电商商品套图', kind: '合集', cover: C('ecommerce', '060'), tags: ['合集', '电商', '4 个资产'] },
  { id: 'cl-003', name: '场景氛围合集', kind: '合集', cover: C('animation', '083'), tags: ['合集', '场景', '9 个资产'] },
];

const MODELS = ['wan2.7-image', 'doubao-seedream-5-0', 'qwen-image', 'wan2.7-image-pro'];

/** 补全模型与时间（越靠前的越新） */
export const DEMO_ASSETS: AssetItem[] = SEED.map((item, i) => ({
  ...item,
  model: MODELS[i % MODELS.length],
  createdAt: i < 6 ? `${i * 7 + 4} 分钟前` : i < 14 ? `${i - 3} 小时前` : `${Math.floor((i - 12) / 4) + 1} 天前`,
  origin: '示例',
}));
