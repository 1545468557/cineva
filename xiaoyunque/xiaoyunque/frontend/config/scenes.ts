/* 首页场景化配置：每个场景 = 一套 Agent 名称 + 输入坞提示 + 技能卡 + 案例流 + 默认生成配置
   对标 OiiOii 的场景 tab 结构；以后加场景只改这一个文件 */

export type SceneTone = 'magenta' | 'gold' | 'blue' | 'indigo' | 'teal' | 'neutral';

export type SceneSkillIcon =
  | 'story' | 'character' | 'scene' | 'prop' | 'product' | 'music'
  | 'video' | 'text' | 'avatar' | 'motion' | 'clapper' | 'image' | 'sparkles';

/** 切场景时会一并应用的生成配置（对应首页「生成配置」面板里的项） */
export interface SceneConfig {
  style?: string;
  ratio?: string;
  videoMode?: 'first_frame' | 'start_end_frame' | 'reference';
  resolution?: string;
  episodes?: number;
}

export interface SceneSkill {
  id: string;
  label: string;
  hint: string;
  icon: SceneSkillIcon;
  tone: SceneTone;
  /** 点「试试看」后填进输入坞的提示词 */
  prompt: string;
  /** 该技能自带的生成参数（优先于场景默认值） */
  ratio?: string;
  style?: string;
  videoMode?: 'first_frame' | 'start_end_frame' | 'reference';
}

export interface SceneCase {
  title: string;
  description: string;
  /** 有图用图；没有合适的图就用渐变卡 */
  image?: string;
  tone: SceneTone;
  prompt: string;
}

export interface Scene {
  id: string;
  label: string;
  agentName: string;
  tagline: string;
  placeholder: string;
  hints: string[];
  config: SceneConfig;
  skills: SceneSkill[];
  caseTitle: string;
  cases: SceneCase[];
  /** 封面：切到这个场景 tab 时首页顶部铺的视觉。video 优先，配 poster 兜底 */
  cover: SceneCover;
}

/** 场景封面。只有最需要氛围的场景用循环视频，其余用高清图，避免六个视频同时拖慢首屏 */
export interface SceneCover {
  video?: string;
  poster: string;
  /** 封面色调，用于微调遮罩强度 */
  tone?: 'ink' | 'warm' | 'neutral';
}

const IMG = {
  space: '/ui/inspiration-space.png',
  ink: '/ui/inspiration-ink.png',
  detective: '/ui/inspiration-detective.png',
  cat: '/ui/inspiration-cat.png',
  mars: '/ui/inspiration-mars.png',
  wuxia: '/ui/inspiration-wuxia.png',
};

/* 作品素材（本地：/public/cases/<场景>/<编号>.jpg） */
const CASE = (scene: string, id: string) => `/cases/${scene}/${id}.jpg`;

/* 精选作品流：跨场景铺开的作品墙（对标 OiiOii 首页的「社媒爆款」） */
export interface FeaturedWork {
  title: string;
  meta: string;
  image: string;
  tag: string;
}

export const FEATURED_WORKS: FeaturedWork[] = [
  { title: '霓虹街头的她', meta: '9:16 · 720P · 4s', image: CASE('short-drama', '009'), tag: '短剧' },
  { title: '午夜礼服', meta: '9:16 · 720P · 5s', image: CASE('short-drama', '030'), tag: '短剧' },
  { title: '雨夜序章', meta: '9:16 · 1080P · 4s', image: CASE('short-drama', '048'), tag: '短剧' },
  { title: '剑与影', meta: '16:9 · 720P · 5s', image: CASE('short-drama', '067'), tag: '短剧' },
  { title: '悬崖之上', meta: '9:16 · 720P · 3s', image: CASE('short-drama', '205'), tag: '短剧' },
  { title: '荒野旅途', meta: '16:9 · 1080P · 5s', image: CASE('short-drama', '249'), tag: '短剧' },
  { title: '香水静物', meta: '1:1 · 1024px', image: CASE('ecommerce', '060'), tag: '电商' },
  { title: '街头机车', meta: '9:16 · 720P · 4s', image: CASE('ecommerce', '227'), tag: '电商' },
  { title: '单车少女', meta: '9:16 · 720P · 4s', image: CASE('ecommerce', '211'), tag: '电商' },
  { title: '阳光下的微笑', meta: '9:16 · 720P · 5s', image: CASE('portrait', '240'), tag: '口播' },
  { title: '职场开场白', meta: '9:16 · 1080P · 4s', image: CASE('portrait', '073'), tag: '口播' },
  { title: '骑行讲解', meta: '9:16 · 720P · 4s', image: CASE('portrait', '266'), tag: '口播' },
  { title: '冰原少女', meta: '9:16 · 720P · 5s', image: CASE('animation', '081'), tag: '动画' },
  { title: '金龙城堡', meta: '16:9 · 1080P · 5s', image: CASE('animation', '083'), tag: '动画' },
  { title: '湖畔日落', meta: '16:9 · 720P · 4s', image: CASE('free', '079'), tag: '自由' },
  { title: '机械之心', meta: '9:16 · 720P · 4s', image: CASE('free', '075'), tag: '自由' },
];

export const SCENES: Scene[] = [
  {
    id: 'short-drama',
    label: '短剧 / 剧情',
    agentName: 'Cineva 短剧 Agent',
    tagline: '从一句灵感开始，自动跑完六阶段出片',
    placeholder: '描述你的故事：一句灵感、一段大纲或完整剧本……',
    hints: [
      '描述你的故事：一句灵感、一段大纲或完整剧本……',
      '竹林深处，两位剑客静静对峙',
      '雨夜伦敦，侦探追着远处的煤气灯',
      '都市写字楼里，实习生第一次拿下大单',
    ],
    config: { style: 'realistic', ratio: '16:9', videoMode: 'first_frame', resolution: '720P', episodes: 4 },
    skills: [
      { id: 'storyboard-video', label: '故事板做视频', hint: '分镜拆解后直接出片', icon: 'clapper', tone: 'blue', prompt: '把以下故事拆成 6 个可直接开拍的分镜并生成成片。\n\n【分镜格式】每镜必须包含：镜号 / 景别（远景·全景·中景·近景·特写）/ 运镜（推·拉·摇·移·跟·环绕·固定）/ 时长（秒）/ 画面内容（主体+动作+环境+光位）/ 台词或旁白（无则写"无"）。\n【节奏要求】前 2 镜承担信息交代，第 3 镜做情绪拐点，末镜留白收尾；相邻镜头禁止同景别同机位重复。\n【成片参数】首帧生视频，比例 16:9，720P。\n\n故事内容：', videoMode: 'first_frame' },
      { id: 'character', label: '角色设计', hint: '三视图 + 设定特写', icon: 'character', tone: 'gold', prompt: '角色设定图：输出正面 / 侧面 / 背面三视图，三图服装、配色、发型、体型严格一致，另附一张表情设定特写。\n\n【格式要求】纯色浅灰背景，角色居中、全身入画、三图等距同尺寸；轮廓清晰，裙摆与衣纹走向明确；避免文字、水印、边框。\n【一致性要求】给出服装逐层描述与主色色号（不少于 3 个色），配饰位置与数量写死，便于后续镜头复用。\n【输出比例】1:1。\n\n主角是', ratio: '1:1' },
      { id: 'scene', label: '场景设计', hint: '关键场景概念图', icon: 'scene', tone: 'blue', prompt: '场景概念图：一张主视角 + 两张不同时段变体（同一机位、不同光线）。\n\n【格式要求】写明天空与色彩基调、光源方向与色温、大气元素（雾/尘/雨）、空间纵深层次（前中后景各一处主体）、镜头焦段。\n【构图要求】地平线位置、视觉重心、引导线三者写明；主体与画面的比例关系用"占画面上三分之一"这类可度量语言描述。\n【输出比例】16:9。\n\n场景是', ratio: '16:9' },
      { id: 'hit-remake', label: '爆款复刻', hint: '对标爆款重新演绎', icon: 'sparkles', tone: 'magenta', prompt: '复刻参考素材的节奏与镜头语言，但替换为全新故事。\n\n【保留项】镜头数量与时长的配比、机位运动类型、转场手法（match-cut / 硬切 / 甩镜）、整体节奏曲线。\n【替换项】故事、人物、场景、服装、道具全部替换为原创设定，不得出现原作的标志性元素。\n【输出格式】先列"原片镜头拆解表"（镜号 / 景别 / 运镜 / 时长 / 作用），再逐镜给出对应新片的画面描述。\n【生成参数】参考图生视频模式，用参考图锁定风格与构图。\n\n我自己的故事：', videoMode: 'reference' },
      { id: 'prop', label: '道具设计', hint: '关键物件设定图', icon: 'prop', tone: 'indigo', prompt: '道具设定图：三视图 + 一张细节特写（材质纹理）。\n\n【格式要求】纯色浅灰背景，道具居中、比例明确；写清整体尺寸、重量感、材质分层（表层/中层/芯材）与三处以上磨损或做旧细节。\n【可复用性】附一段"用于后续镜头的一致性描述"，把形状关键词、主色、光泽度固定下来。\n【输出比例】1:1。\n\n道具是', ratio: '1:1' },
      { id: 'script', label: '文案脚本', hint: 'logline + 旁白 + 镜头提示', icon: 'text', tone: 'neutral', prompt: '写一版可直接开拍的脚本，按以下结构输出：\n\n【Logline】一句话说清主角、目标、阻碍、代价（不超过 40 字）。\n【人物】主角 / 对立面 / 功能角色各一段，写明动机与转变。\n【三幕结构】建置（钩子）→ 对抗（升级两次）→ 收束（反转或留白），每幕标注时长占比。\n【分场表】场号 / 场景 / 内外景 / 时间 / 出场人物 / 本场功能。\n【旁白】逐句写出，每句标注对应镜头与时长，单句不超过 18 字。\n【镜头提示】每场给出景别与运镜建议。\n\n主题是' },
    ],
    caseTitle: '短剧案例',
    cases: [
      { title: '霓虹街头的她', description: '夜景霓虹，情绪开场', image: CASE('short-drama', '009'), tone: 'indigo', prompt: '夜色霓虹街头，一个女孩独自坐着，情绪低沉的电影感开场' },
      { title: '午夜礼服', description: '暖调人像，电影质感', image: CASE('short-drama', '030'), tone: 'gold', prompt: '暖光下的礼服人像，电影质感特写，情绪张力强' },
      { title: '雨夜序章', description: '黑白街头，悬念感', image: CASE('short-drama', '048'), tone: 'blue', prompt: '雨夜街头黑白画面，人物撑伞行走，悬念感开场' },
    ],
    cover: {
      video: '/ui/hero/scene-short-drama.mp4',
      poster: '/ui/hero/scene-short-drama.jpg',
      tone: 'ink',
    },
  },
  {
    id: 'animation',
    label: '水墨 / 动画',
    agentName: 'Cineva 动画 Agent',
    tagline: '画风统一、镜头连贯的动画短片',
    placeholder: '描述画面和画风，比如「水墨山水中一叶扁舟穿过薄雾」……',
    hints: ['描述画面和画风……', '水墨山水中，一叶扁舟穿过薄雾', '霓虹街头，舞者在雨里轻轻转身'],
    config: { style: 'chinese-ink', ratio: '16:9', videoMode: 'first_frame', resolution: '720P', episodes: 2 },
    skills: [
      { id: 'ink-animation', label: '水墨动画', hint: '写意留白，国风质感', icon: 'image', tone: 'teal', prompt: '水墨中国风动画，笔触写意、大量留白。\n\n【格式要求】墨色浓淡分五层（焦浓重淡清），只取两三层入画；笔触外轮廓用湿墨渲染，内部结构一笔带过；宣纸底纹可见。\n【构图要求】主体压在画面非中心位置，留出至少三分之一空白作"气口"；题款与印章位置预留但留空。\n【运动要求】物体运动要带动墨韵扩散（雨点入水起涟漪、衣袂带风起墨丝），禁止机械位移。\n【风格锁定】国风水墨，禁用油画、赛璐璐、3D 渲染质感。\n\n画面是', style: 'chinese-ink' },
      { id: 'gif-design', label: 'Gif 动画设计', hint: '短循环动态素材', icon: 'sparkles', tone: 'magenta', prompt: '设计一个可无缝循环的 Gif。\n\n【格式要求】输出为循环动画，首帧与末帧在构图上严格对齐，做到"看不出接缝"；总时长 2–4 秒，帧序列简洁。\n【循环结构】采用"起幅 → 主体运动 → 回落到起幅位置"的闭环，运动曲线缓入缓出。\n【视觉要求】线条干净、色块独立、背景单色，避免高频闪烁与细密纹理（防止 GIF 抖动）。\n【输出比例】1:1。\n\n内容是', ratio: '1:1' },
      { id: 'character', label: '角色设计', hint: '画风统一的主角设定', icon: 'character', tone: 'gold', prompt: '动画角色设定：正面 / 侧面 / 背面三视图 + 表情集（喜 / 怒 / 哀 / 惊）。\n\n【格式要求】三图服装、配色、比例严格一致；写清头身比、头部占画面比例、服装分层与主色色号；线条粗细统一，描边色与固有色分列。\n【画风要求】全片统一为同一套上色法（平涂 / 厚涂 / 半厚涂二选一并写明），阴影形状统一方向。\n【输出比例】1:1。\n\n主角是', ratio: '1:1' },
      { id: 'scene', label: '场景设计', hint: '背景与氛围', icon: 'scene', tone: 'blue', prompt: '动画场景概念图：同一机位三个时段（晨光 / 正午 / 黄昏）。\n\n【格式要求】写清地平线与视高、光源方向、大气透视（远处降饱和提明度）、前中后景层次、镜头焦段与景深。\n【氛围要求】用天气、粒子（雨/雪/尘/萤）、湿反射三项至少两项营造氛围；情绪基调写一句话。\n【输出比例】16:9。\n\n场景是', ratio: '16:9' },
      { id: 'storyboard', label: '分镜设计', hint: '镜头语言逐格拆解', icon: 'clapper', tone: 'indigo', prompt: '把内容拆成 6 个分镜，逐格标注镜头语言。\n\n【单镜格式】镜号 / 景别 / 机位高度（平·仰·俯·顶）/ 运镜（推拉摇移跟环绕固定）/ 时长 / 画面内容（主体 + 动作 + 环境 + 光位）/ 声音（台词 / 音效 / 静默）/ 剪辑关系（硬切·叠化·匹配剪辑·跳切）。\n【检查项】相邻镜不得同景别同机位；六镜的景别变化要形成小起伏；至少一处 match-cut 或呼应构图。\n【风格】分镜用线稿风格呈现，标注可读。\n\n内容是：', style: 'comic-book' },
      { id: 'video', label: '视频生成', hint: '单镜头动态画面', icon: 'video', tone: 'teal', prompt: '生成一段 5 秒单镜头动态画面。\n\n【镜头语言】写明景别、机位高度、运镜（含起幅 / 过程 / 落幅三段）、焦段。\n【运动描述】主体做什么动作、动作速度、运动方向、是否与镜头运动叠加；环境要有反应（风、尘、反射、蒸汽）。\n【光线】光源方向、色温、是否逆光 / 轮廓光。\n【约束】单一镜头内不切换场景；禁止文字、字幕、水印、UI 元素。\n\n画面内容是：' },
    ],
    caseTitle: '动画案例',
    cases: [
      { title: '冰原少女', description: '冰雪场景，柔光渲染', image: CASE('animation', '081'), tone: 'teal', prompt: '冰雪荒原上的少女，柔光渲染，动画电影质感' },
      { title: '金龙城堡', description: '奇幻场景，宏大构图', image: CASE('animation', '083'), tone: 'gold', prompt: '云海之上的城堡与金龙，宏大奇幻场景概念图' },
      { title: '红裙与风', description: '国风人物，动势明显', image: CASE('animation', '171'), tone: 'magenta', prompt: '国风红裙人物，衣摆动势明显，写意动画风格' },
    ],
    cover: {
      video: '/ui/hero/scene-animation.mp4',
      poster: '/ui/hero/scene-animation.jpg',
      tone: 'ink',
    },
  },
  {
    id: 'ecommerce',
    label: '电商 / 带货',
    agentName: 'Cineva 电商 Agent',
    tagline: '主图、套图、带货视频一条龙',
    placeholder: '上传商品图，或描述卖点：材质、卖点、目标人群……',
    hints: ['上传商品图或描述卖点……', '一瓶精华液，柔和顶光，突出质感', '键盘开箱展示，桌面场景'],
    config: { style: 'realistic', ratio: '9:16', videoMode: 'first_frame', resolution: '720P', episodes: 1 },
    skills: [
      { id: 'product-poster', label: '商品主图', hint: '干净构图突出质感', icon: 'product', tone: 'magenta', prompt: '商品主图：构图干净、主体突出。\n\n【格式要求】商品居中占据画面约 60%，完整无裁切；纯色或微渐变背景，无杂物；顶部柔光箱做主光，侧后方加轮廓光把商品边缘从背景里剥离。\n【质感表达】写清材质反射类型（镜面 / 哑光 / 丝绸 / 拉丝金属）、高光形状、透视校正（ logo 与文字严格对齐原图，不变形）。\n【后期要求】四周留 5% 安全边，便于平台二次裁切；禁止文字、水印、人手遮挡。\n【输出比例】1:1。\n\n商品是', ratio: '1:1' },
      { id: 'product-set', label: '商品套图', hint: '一张商品多场景', icon: 'image', tone: 'blue', prompt: '同一商品的多场景套图（输出 4 张）。\n\n【一致性要求】4 张图中商品的造型、比例、配色、 logo 位置严格一致，只允许环境与光位变化。写一份"商品锁定描述"放在最前面：形状关键词、主色与辅色色号、材质、材质反光强度、logo 朝向。\n【场景清单】白底棚拍 / 生活桌面 / 户外自然光 / 暗调质感，四张风格跨度要清晰可辨。\n【输出比例】1:1。\n\n商品是', ratio: '1:1' },
      { id: 'goods-video', label: '带货短视频', hint: '展示 + 卖点口播', icon: 'video', tone: 'indigo', prompt: '生成一条 15 秒带货短视频脚本与画面。\n\n【结构】0–3 秒钩子（痛点或反常识画面）→ 3–11 秒卖点演示（三条卖点，每条配一个镜头）→ 11–15 秒行动号召（价格锚点 + 促单）。\n【单镜格式】镜号 / 景别 / 运镜 / 时长 / 画面（商品动作 + 环境 + 光位）/ 口播文案 / 字幕要点。\n【镜头语言】商品特写必须环绕或推近，展示面要覆盖三个角度；手持质感允许轻微晃动增强真实感。\n【口播要求】每条卖点不超过 12 字，禁用违禁词与绝对化用语。\n【输出比例】9:16。\n\n商品是', ratio: '9:16' },
      { id: 'digital-human', label: '数字人口播', hint: '真人形象讲解商品', icon: 'avatar', tone: 'magenta', prompt: '数字人口播视频。\n\n【形象要求】以上传照片为唯一形象来源，五官、发型、肤色、服装严格一致，禁止换脸或美化漂移；动作限定为自然口型 + 适度手势。\n【构图】半身或七分身，9:16 竖屏，主体居中偏下三分之一，头顶留 15% 空间；背景简洁、带一点景深虚化。\n【口型要求】口播稿按句拆分，每句 6–14 字，句间留 0.3 秒停顿；标注重读词。\n【灯光】顺光为主，加柔光箱弱化阴影，避免侧光造成的阴阳脸。\n【输出比例】9:16，参考图生视频模式。\n\n商品是', ratio: '9:16', videoMode: 'reference' },
      { id: 'scene', label: '场景设计', hint: '商品摆放场景', icon: 'scene', tone: 'teal', prompt: '商品展示场景设计。\n\n【格式要求】写清台面材质与颜色、背景层次（至少三层）、主光方向与色温、环境反光强度。\n【氛围要求】用肤色协调原则写清三色搭配方案（主色 / 辅色 / 点缀色及占比 60:30:10）；点缀道具不超过三件，且形状必须与商品轮廓有区分，避免抢主体。\n【输出比例】16:9。\n\n场景是', ratio: '16:9' },
      { id: 'script', label: '文案脚本', hint: '卖点提炼 + 口播稿', icon: 'text', tone: 'neutral', prompt: '提炼商品卖点并写成口播稿。\n\n【卖点结构】3 条卖点，按"功能型 → 对比型 → 场景型"排序，每条给出"卖点 + 证据 + 一句用户收益"三件套。\n【口播稿】总分 30 秒口播：3 秒钩子、9 秒卖点演示、3 秒信任背书、15 秒拆成三个卖点模块，每模块一句结论 + 一句解释。\n【格式】逐句输出并标注停顿位置与语速（快 / 中 / 慢），单句不超过 12 字。\n【约束】不用"最好/第一/绝对"等违禁表述，不用夸张承诺。\n\n商品是' },
    ],
    caseTitle: '带货案例',
    cases: [
      { title: '香水静物', description: '深色背景，光影突出质感', image: CASE('ecommerce', '060'), tone: 'magenta', prompt: '香水瓶静物主图：深色岩面前景、侧逆光打透瓶身、突出冷冽质感' },
      { title: '街头机车', description: '动态场景，氛围拉满', image: CASE('ecommerce', '227'), tone: 'indigo', prompt: '机车与骑手街头场景，夜景光斑，动态氛围感产品短片' },
      { title: '单车少女', description: '生活方式，自然光', image: CASE('ecommerce', '211'), tone: 'gold', prompt: '自然光下的骑行少女，生活方式带货短视频，清新氛围' },
    ],
    cover: {
      video: '/ui/hero/scene-ecommerce.mp4',
      poster: '/ui/hero/scene-ecommerce.jpg',
      tone: 'neutral',
    },
  },
  {
    id: 'portrait',
    label: '数字人口播',
    agentName: 'Cineva 口播 Agent',
    tagline: '一张形象照，生成讲解视频',
    placeholder: '写一段口播稿，或上传形象照让我来演……',
    hints: ['写一段口播稿，或上传形象照……', '大家好，今天用 30 秒讲清楚这件事'],
    config: { style: 'realistic', ratio: '9:16', videoMode: 'reference', resolution: '720P', episodes: 1 },
    skills: [
      { id: 'digital-human', label: '数字人口播', hint: '参考形象生成讲解视频', icon: 'avatar', tone: 'magenta', prompt: '数字人口播视频：以上传形象照为唯一形象来源。\n\n【形象一致性】五官、发型、肤色、服装严格对齐照片，禁止换脸、美化漂移、改变年龄感；允许自然眨眼与微表情。\n【构图】半身，9:16 竖屏，眼睛位于上三分之一线，头顶留 15%；目光平视镜头，背景虚化、无杂乱元素。\n【口型与台词】口播稿逐句拆分，每句 6–14 字，句间 0.3 秒停顿；唇形开合幅度自然，避免夸张嘴型。\n【手势】适度手势辅助，手部不得遮挡面部，不得出现六指或穿模。\n【灯光】柔和顺光，弱化鼻影与眼袋，禁止侧光阴阳脸。\n【输出】9:16，参考图生视频模式。\n\n口播稿是', ratio: '9:16', videoMode: 'reference' },
      { id: 'portrait-consistency', label: '角色一致性', hint: '多镜头保持同一张脸', icon: 'character', tone: 'gold', prompt: '保持人物身份与外观一致，输出同一角色的多角度画面（正面 / 侧面 / 背面 / 微仰）。\n\n【一致性要求】先写一份"人物锁定描述"：脸型、眉形、眼型与瞳色、鼻型、唇形、发型发色、标志性特征（痣/疤痕/眼镜）、服装逐层描述与主色色号。后续每个镜头都必须复用同一段描述，不得改写。\n【镜头格式】角度 / 视线方向 / 光位 / 表情 / 景别，逐条列出。\n【检查项】四张图的脸部特征点位置关系必须一致，禁止脸漂移与年龄漂移。\n【输出比例】1:1。\n\n内容是', ratio: '1:1' },
      { id: 'subtitle', label: '字幕生成', hint: '分句打轴 + 样式建议', icon: 'text', tone: 'neutral', prompt: '把内容整理成可用的字幕稿。\n\n【格式要求】每行不超过 14 个汉字；按语义断句而非按字数硬切；标注入屏时间点（秒）与停留时长；同屏最多两行。\n【打轴规则】语速按每秒 5–6 字估算，长句主动词前置；数字与单位写全称；英文专有名词保留原文并给中文注释。\n【样式建议】字体（黑体 / 圆体）、字号相对画面高度、描边宽度、颜色与背景条、出现动效（淡入 / 上移 / 打字机）、安全区（避开平台 UI）。\n\n内容：' },
      { id: 'bgm', label: '智能配乐', hint: '按节奏配背景音乐', icon: 'music', tone: 'indigo', prompt: '为视频推荐背景音乐方案。\n\n【分析】先读节奏：统计镜头数量与时长，标出重拍位置与情绪拐点，给出 BPM 区间建议。\n【配乐结构】按"铺垫（0–15%）→ 推进（15–60%）→ 高潮（60–85%）→ 收尾（85–100%）"四段配乐，每段写清使用乐器、和弦倾向、鼓点密度。\n【点位表】列出卡点点位表：时间点 / 画面事件 / 音乐事件（重拍 / 齐奏 / 静默）。\n【音量】建议对白 / 音效 / 音乐三层底线与峰值（dB），人声区音乐做 6–10 dB 侧链避让。\n\n内容是' },
      { id: 'video', label: '视频生成', hint: '单镜头动态画面', icon: 'video', tone: 'teal', prompt: '生成一段 5 秒单镜头动态画面。\n\n【镜头语言】写清景别、机位高度、焦段、运镜的起幅 / 过程 / 落幅三段。\n【运动描述】主体动作、速度、方向，以及环境反应（风、尘、反射、蒸汽、衣袂）。\n【光线】主光方向与色温、是否逆光 / 轮廓光 / 霓虹反射。\n【约束】单镜头不切场景；禁止文字、字幕、水印、UI。\n\n画面内容是：' },
    ],
    caseTitle: '口播案例',
    cases: [
      { title: '阳光下的微笑', description: '正面构图，亲和力强', image: CASE('portrait', '240'), tone: 'magenta', prompt: '数字人口播：正面构图、自然微笑、柔和环境光，口播稿是' },
      { title: '职场开场白', description: '半身构图，专业感', image: CASE('portrait', '073'), tone: 'indigo', prompt: '数字人口播：半身构图、职业穿搭、简洁背景，口播稿是' },
      { title: '骑行讲解', description: '外景场景，生活化', image: CASE('portrait', '266'), tone: 'blue', prompt: '数字人口播：外景自然光、生活化场景，讲解内容是' },
    ],
    cover: {
      video: '/ui/hero/scene-portrait.mp4',
      poster: '/ui/hero/scene-portrait.jpg',
      tone: 'ink',
    },
  },
  {
    id: 'motion',
    label: '动作迁移',
    agentName: 'Cineva 动作 Agent',
    tagline: '把参考视频的动作搬到你的角色上',
    placeholder: '上传参考视频和角色图，我让角色动起来……',
    hints: ['上传参考视频和角色图……', '让这个角色跳参考视频里的那段舞'],
    config: { style: 'realistic', ratio: '16:9', videoMode: 'reference', resolution: '720P', episodes: 1 },
    skills: [
      { id: 'action-transfer', label: '动作迁移', hint: '参考视频动作 + 我的角色', icon: 'motion', tone: 'indigo', prompt: '动作迁移：把参考视频的运动搬到角色图上。\n\n【保留项】参考视频的动作节奏、肢体轨迹、关键帧时间点、身体各部位相对关系。\n【替换项】角色外观、服装、场景、光照全部来自角色图，不得参考原视频人物长相。\n【格式要求】写清需迁移的肢体部位（头 / 躯干 / 上肢 / 下肢 / 手指）、运动幅度、速度曲线（缓入缓出 / 匀速 / 爆发式）。\n【一致性检查】角色五官与服装全程锁定原图；迁移后若原动作超出人体结构，标注"已做结构补偿"并说明补偿方式。\n【约束】禁止改变角色身份；禁止手指穿模与四肢反关节。\n【生成参数】参考图生视频模式。', videoMode: 'reference' },
      { id: 'character', label: '角色设计', hint: '先定角色再迁动作', icon: 'character', tone: 'gold', prompt: '角色设定图：为动作迁移准备的角色图。\n\n【格式要求】全身、居中、T-pose / A-pose 二选一并写明（迁移用建议 A-pose，双臂与躯干留 30° 夹角，避免遮挡）；四肢完整不被裁切。\n【一致性要求】写一份"人物锁定描述"：脸型、发型发色、服装逐层、配色色号、鞋款；作为后续迁移的唯一外观来源。\n【针对性要求】动作迁移场景下，关节处服装要有可见分隔（袖口 / 裤脚 / 腰线），保证动作幅度大时结构仍可读。\n【输出比例】1:1。\n\n主角是', ratio: '1:1' },
      { id: 'video', label: '视频生成', hint: '单镜头动态画面', icon: 'video', tone: 'teal', prompt: '生成一段 5 秒单镜头动态画面。\n\n【镜头语言】景别、机位高度、焦段、运镜的起幅 / 过程 / 落幅。\n【运动描述】主体动作与速度，环境反应（风、尘、反射、衣袂、粒子）。\n【光线】主光方向与色温、轮廓光、地面反射。\n【约束】单镜头不切场景；禁止文字、字幕、水印、UI。\n\n画面内容是：' },
      { id: 'scene', label: '场景设计', hint: '动作发生的环境', icon: 'scene', tone: 'blue', prompt: '动作场景概念图。\n\n【格式要求】为动作留出空间：主体运动范围至少占画面宽度的一半，前中后景层次分明；地平线位置与机位高度写明。\n【光照要求】写清主光方向、色温、补光方式；动作瞬间高光要能勾勒轮廓。\n【氛围要求】地面材质（抓地力 / 反射 / 积水）与运动相关的三项环境反应写出来。\n【输出比例】16:9。\n\n场景是', ratio: '16:9' },
      { id: 'bgm', label: '智能配乐', hint: '卡点节奏', icon: 'music', tone: 'magenta', prompt: '为动作视频做卡点配乐。\n\n【节拍分析】统计动作的关键帧（起跳 / 落地 / 转身 / 出手）时间点，反推 BPM 与重拍位置。\n【配乐结构】按动作组数分段，一段动作一组鼓点；爆发点配齐奏；落地配底鼓。\n【点位表】输出卡点点位表：时间点 / 动作事件 / 音乐事件；标注"每几拍一个镜头"的剪辑建议。\n【音效层】给出手部 / 脚步 / 布料 / 环境四层拟音建议。\n\n内容是' },
    ],
    caseTitle: '动作案例',
    cases: [
      { title: '霓光动作', description: '动态姿势，光效强', image: CASE('motion', '011'), tone: 'indigo', prompt: '把这段动作迁到我的角色上：霓虹光效、动感姿势、赛博场景' },
      { title: '街头律动', description: '城市街头，动态抓拍', image: CASE('motion', '289'), tone: 'blue', prompt: '把这段动作迁到我的角色上：城市街头夜景、动态抓拍质感' },
      { title: '机械之心', description: '科幻角色，可复刻动作', image: CASE('free', '019'), tone: 'teal', prompt: '把这段动作迁移到科幻机械角色上，未来感场景' },
    ],
    cover: {
      video: '/ui/hero/scene-motion.mp4',
      poster: '/ui/hero/scene-motion.jpg',
      tone: 'ink',
    },
  },
  {
    id: 'free',
    label: '自由创作',
    agentName: 'Cineva Agent',
    tagline: '想到什么就做什么，图 / 视频 / 文案都行',
    placeholder: '描述你的创作需求，也可以直接上传参考图……',
    hints: ['描述你的创作需求，也可以直接上传参考图……', '帮我写一个 30 秒短片的分镜', '把这张图换成水墨风格'],
    config: { style: 'realistic', ratio: '16:9', videoMode: 'first_frame', resolution: '720P', episodes: 1 },
    skills: [
      { id: 'free-image', label: '自由创作图片', hint: '按描述或参考图出图', icon: 'image', tone: 'blue', prompt: '自由创作图片。\n\n【必填要素】主体 / 动作 / 环境 / 景别 / 机位高度 / 运镜或静帧 / 光位与色温 / 色彩基调 / 情绪一句话 —— 九项缺失时先补齐再生成。\n【参考图规则】如提供了参考图，明确写"参考图用于：①构图 ②风格 ③色板 ④角色外观"，只选需要的项，禁止笼统说"参考这张图"。\n【输出格式】1:1。\n【约束】禁止文字、水印、logo、UI。\n\n我的需求：' },
      { id: 'free-video', label: '自由创作视频', hint: '文生视频 / 图生视频', icon: 'video', tone: 'teal', prompt: '自由创作一段视频。\n\n【必填要素】景别 / 机位高度 / 运镜的起幅 / 过程 / 落幅 / 主体动作与速度 / 环境反应 / 光位色温 / 时长。\n【参考图规则】如有首帧图，说明"首帧用于确定构图与主体外观"，运动部分自由发挥但不得改变主体身份。\n【约束】单镜头内不切场景；禁止文字、字幕、水印、UI、闪屏。\n\n我的需求：' },
      { id: 'img2img', label: '图生图改造', hint: '换风格、换氛围', icon: 'sparkles', tone: 'magenta', prompt: '在保持构图一致的前提下改造这张图。\n\n【保持不变】主体轮廓、构图、透视、主体数量与位置关系、视觉重心 —— 逐项列出不得改动的内容。\n【可改变】风格、色板、光位、氛围、材质、背景细节。\n【风格描述】新风格要写清媒介（水彩 / 油画 / 3D / 赛璐璐 / 胶片摄影）、笔触或渲染特征、主色与饱和度区间、对比度。\n【格式要求】输出与原图同尺寸同比例。\n\n改造要求：换风格为' },
      { id: 'script', label: '文案脚本', hint: '随时随地写脚本', icon: 'text', tone: 'neutral', prompt: '写一版可直接开拍的脚本。\n\n【结构】Logline（40 字内）→ 人物小传（主角 / 对立面 / 功能角色）→ 三幕结构（建置 / 对抗 / 收束，各标时长占比）→ 分场表（场号 / 场景 / 内外 / 时间 / 人物 / 功能）→ 逐场台词与动作 → 镜头表（镜号 / 景别 / 运镜 / 时长 / 画面 / 声音）。\n【节奏检查】三幕中对抗部分至少要升级两次；每场必须有冲突或信息增量。\n\n主题是' },
      { id: 'upscale', label: '图片放大', hint: '低清素材变可用', icon: 'image', tone: 'gold', prompt: '放大并增强细节，同时严格保持原始构图与配色。\n\n【保持不变】构图、透视、主体轮廓、色彩关系、明暗关系、边缘位置 —— 不得重绘画面内容。\n【增强项】分辨率提升、边缘锐度、材质纹理细节、轻微噪点控制。\n【禁止项】不得新增或移除物体、不得改变主体比例、不得改变色温与色调倾向、不得"脑补"原图没有的细节。\n【输出】给出目标尺寸与格式建议。\n\n图片内容：' },
      { id: 'storyboard', label: '分镜设计', hint: '把想法变成画面清单', icon: 'clapper', tone: 'indigo', prompt: '把想法拆成 6 个分镜画面。\n\n【单镜格式】镜号 / 景别 / 机位高度 / 运镜 / 时长 / 画面内容（主体 + 动作 + 环境 + 光位）/ 声音 / 剪辑关系。\n【检查项】相邻镜不得同景别同机位；六镜景别变化要有起伏；至少一处构图呼应或 match-cut。\n【输出形态】每镜一张线稿，配一行文字描述。\n\n我的想法：' },
    ],
    caseTitle: '灵感示例',
    cases: [
      { title: '机械之心', description: '科幻人像，金属质感', image: CASE('free', '075'), tone: 'blue', prompt: '科幻机械人像，金属质感与光效，竖屏构图' },
      { title: '湖畔日落', description: '自然风光，暖调', image: CASE('free', '079'), tone: 'gold', prompt: '湖面日落风光，远山倒影，暖调电影感' },
      { title: '巨蛛来袭', description: '概念设计，压迫感', image: CASE('free', '188'), tone: 'indigo', prompt: '巨型机械蜘蛛概念设计，压迫感构图，冷色调' },
    ],
    cover: {
      video: '/ui/hero/scene-free.mp4',
      poster: '/ui/hero/scene-free.jpg',
      tone: 'ink',
    },
  },
];

export function findScene(id: string): Scene {
  return SCENES.find(scene => scene.id === id) || SCENES[0];
}
