
import React from 'react';
import { Language } from '../types';
import { 
  Lightbulb, 
  Layers, 
  Scissors, 
  Palette, 
  Grid3x3, 
  FileJson, 
  Zap, 
  AlertTriangle,
  MousePointerClick,
  Save,
  Layout,
  Monitor,
  Smartphone,
  Share,
  Download
} from 'lucide-react';

export interface ManualSection {
  id: string;
  title: string;
  icon?: React.ElementType;
  content: React.ReactNode;
}

const Callout = ({ title, children, type = 'info' }: { title: string, children?: React.ReactNode, type?: 'info' | 'warning' }) => (
  <div className={`my-6 p-5 border-l-4 rounded-r ${
    type === 'warning' 
    ? 'bg-amber-50 border-amber-500 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100' 
    : 'bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100'
  }`}>
    <div className="font-bold text-lg mb-2 flex items-center gap-2">
      {type === 'warning' ? <AlertTriangle size={20} /> : <Lightbulb size={20} />}
      {title}
    </div>
    <div className="text-base leading-relaxed opacity-90">
      {children}
    </div>
  </div>
);

const zhContent: ManualSection[] = [
  {
    id: 'intro',
    title: '简介',
    icon: Lightbulb,
    content: (
      <>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Pixler 是一款专为像素艺术爱好者、拼豆（Perler Beads）玩家和十字绣设计者打造的在线工具。
          它可以帮助你将任何图片转换为带有详细坐标、网格和色号的图纸，让创作实体像素作品变得简单高效。
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h4 className="font-bold mb-2 text-lg text-primary-600 dark:text-primary-400">核心功能</h4>
                <ul className="list-disc list-inside space-y-2 text-base text-gray-600 dark:text-gray-400">
                    <li>智能识别像素块大小</li>
                    <li>自动背景裁剪与去背</li>
                    <li>多品牌色号自动匹配</li>
                    <li>高精度矢量网格导出</li>
                </ul>
            </div>
            <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h4 className="font-bold mb-2 text-lg text-primary-600 dark:text-primary-400">适用场景</h4>
                <ul className="list-disc list-inside space-y-2 text-base text-gray-600 dark:text-gray-400">
                    <li>拼豆 / 熨斗珠图纸制作</li>
                    <li>十字绣打版</li>
                    <li>像素实体艺术的颜色标注</li>
                </ul>
            </div>
        </div>
      </>
    )
  },
  {
    id: 'best-experience',
    title: '最佳体验指南',
    icon: Monitor,
    content: (
      <>
        <p className="text-lg text-gray-700 dark:text-gray-300">为了获得最流畅的制图体验，请参考以下建议：</p>
        
        <h4 className="font-bold text-lg mt-8 mb-3 flex items-center gap-2 text-primary-600 dark:text-primary-400">
             <Monitor size={20} /> 优先使用大屏设备
        </h4>
        <p className="text-base text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            虽然 Pixler 兼容手机，但<strong>电脑 (PC/Mac) 或 平板 (iPad/Android Tablet)</strong> 拥有更大的屏幕空间，在处理复杂的像素点、查看图例以及编辑色板时，体验会远好于手机。
        </p>

        <h4 className="font-bold text-lg mt-8 mb-3 flex items-center gap-2 text-primary-600 dark:text-primary-400">
             <Smartphone size={20} /> 移动端 / iOS 用户必读
        </h4>
        <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                <div className="font-bold text-base mb-2">1. 添加到主屏幕 (PWA)</div>
                <div className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    手机浏览器的地址栏和工具栏会占用宝贵的屏幕空间。
                    <br/>
                    <strong>iOS Safari 用户：</strong> 点击底部的 <Share size={14} className="inline mx-0.5" /> 分享按钮，选择<strong>“添加到主屏幕”</strong>。
                    <br/>
                    这样 Pixler 就会像原生 APP 一样全屏运行，操作视野更大。
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                <div className="font-bold text-base mb-2">2. 关于图片保存</div>
                <div className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    在 iOS 上点击“导出”后，如果图片直接在浏览器中打开：
                    <ul className="list-disc list-inside mt-1 ml-1">
                        <li><strong>长按图片</strong>，选择“存储到‘照片’”。</li>
                        <li>或者点击底部的 <Share size={14} className="inline mx-0.5" /> 分享按钮，选择<strong>“存储到‘文件’”</strong>。</li>
                    </ul>
                </div>
            </div>
        </div>
      </>
    )
  },
  {
    id: 'workflow',
    title: '基础流程',
    icon: Zap,
    content: (
      <>
        <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 mt-4 space-y-10">
            <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-primary-900">
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-300">1</span>
                </span>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">添加图片</h3>
                <p className="text-base text-gray-600 dark:text-gray-400">
                    点击上传区域或直接拖拽图片。支持 PNG, JPG。
                    <br/>
                    <span className="text-sm text-gray-400">* 对于像素画，PNG 格式最清晰，不会有模糊杂色。</span>
                </p>
            </li>
            <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-primary-900">
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-300">2</span>
                </span>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">图像处理 (像素画)</h3>
                <div className="space-y-3 text-base text-gray-600 dark:text-gray-400">
                    <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200">调整像素倍数 (Scale)：</span>
                        如果网格和画面没对齐，说明软件自动识别的倍数不对。请手动调整此数值，直到网格线完美贴合每一个像素点。
                    </div>
                    <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200">自动裁剪 (Auto Crop)：</span>
                        选择“透明”或“纯色”模式，自动切除四周无用的空白背景，让图纸更紧凑。
                    </div>
                </div>
            </li>
            <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-primary-900">
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-300">3</span>
                </span>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">豆色匹配</h3>
                <div className="space-y-3 text-base text-gray-600 dark:text-gray-400">
                    <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200">开启匹配：</span>
                        在“豆色匹配”栏中，选择<strong>“系统默认”</strong>（全色表）或<strong>“我的豆色”</strong>（仅库存）。
                    </div>
                    <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200">原理：</span>
                        系统会计算图片颜色与豆子颜色的差异（DeltaE），找出最接近的色号。你可以调整“精度阈值”来控制匹配的严格程度。
                    </div>
                </div>
            </li>
            <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-primary-900">
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-300">4</span>
                </span>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">图纸设置</h3>
                <p className="text-base text-gray-600 dark:text-gray-400">
                    在“图纸设置”栏，你可以调整网格线的粗细颜色、是否显示坐标轴，以及图例是放在底部还是右侧。
                </p>
            </li>
            <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-primary-900">
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-300">5</span>
                </span>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">保存</h3>
                <p className="text-base text-gray-600 dark:text-gray-400">点击底部的“导出 PNG”按钮即可生成高清图纸。</p>
            </li>
        </ol>
      </>
    )
  },
  {
    id: 'processing',
    title: '参数详解：处理与外观',
    icon: Layers,
    content: (
      <>
        <h4 className="text-xl font-bold mt-8 mb-3 flex items-center gap-2"><Grid3x3 size={20} /> 像素倍数 (Block Size)</h4>
        <p className="text-lg text-gray-700 dark:text-gray-300">此参数告诉系统原图中多少个物理像素代表一个“像素格”。</p>
        <ul className="list-disc list-inside mt-3 space-y-2 text-base text-gray-600 dark:text-gray-400 pl-4">
            <li><strong>自动 (Auto)：</strong> 系统分析图像规律自动计算。</li>
            <li><strong>手动：</strong> 如果自动检测导致网格错位，请手动微调。</li>
        </ul>

        <h4 className="text-xl font-bold mt-10 mb-3 flex items-center gap-2"><Palette size={20} /> 颜色容差 (Tolerance)</h4>
        <p className="text-lg text-gray-700 dark:text-gray-300">用于合并相近颜色，减少图纸色数。</p>
        <ul className="list-disc list-inside mt-3 space-y-2 text-base text-gray-600 dark:text-gray-400 pl-4">
            <li><strong>数值越大：</strong> 合并越激进。</li>
            <li><strong>数值为0：</strong> 保留所有细微色差。</li>
        </ul>

        <h4 className="text-xl font-bold mt-10 mb-3 flex items-center gap-2"><Layout size={20} /> 图纸缩放 (Scale)</h4>
        <p className="text-lg text-gray-700 dark:text-gray-300">这是导出图片的<strong>清晰度</strong>设置。</p>
        <ul className="list-disc list-inside mt-3 space-y-2 text-base text-gray-600 dark:text-gray-400 pl-4">
            <li>数值代表导出图中每个格子占多少像素。</li>
            <li>例如设为 40，则一个 10x10 的像素画导出后宽度约为 400px + 边距。</li>
            <li>想要更高清的图纸，请调大此数值。</li>
        </ul>
      </>
    )
  },
  {
    id: 'beads',
    title: '豆色匹配深度解析',
    icon: Palette,
    content: (
      <>
        <h4 className="font-bold text-lg mt-6 mb-3">匹配模式</h4>
        <div className="space-y-4 text-base">
            <div className="border-l-4 border-primary-500 pl-4 py-2 bg-gray-50 dark:bg-gray-800">
                <strong>系统默认 (System Only)</strong><br/>
                <span className="text-gray-600 dark:text-gray-400">全量匹配。使用软件内置的所有品牌色卡。适合设计新图纸。</span>
            </div>
            <div className="border-l-4 border-green-500 pl-4 py-2 bg-gray-50 dark:bg-gray-800">
                <strong>我的豆色 (My Beads)</strong><br/>
                <span className="text-gray-600 dark:text-gray-400">库存匹配。仅使用你在「豆色管理」中录入的颜色。确保生成的图纸你立刻就能做。</span>
            </div>
        </div>

        <h4 className="font-bold text-lg mt-10 mb-3">精度阈值 (Delta E)</h4>
        <p className="text-base mb-3 text-gray-700 dark:text-gray-300">控制系统判定“颜色相近”的严格程度：</p>
        <ul className="list-disc list-inside space-y-2 text-base text-gray-600 dark:text-gray-400 pl-4">
            <li><strong>宽松 (Loose / &gt;20)：</strong> 几乎匹配所有豆色。系统会强制找出最接近的颜色，即使色差肉眼可见。</li>
            <li><strong>严格 (Strict / &lt;10)：</strong> 只有当豆子颜色非常接近原图时才匹配。否则会显示红色叉号（缺失）。</li>
        </ul>

        <h4 className="font-bold text-lg mt-10 mb-3">缺色处理</h4>
        <p className="text-base mb-3 text-gray-700 dark:text-gray-300">当使用「我的豆色」模式时，如果库存里没有合适的颜色：</p>
        <ul className="list-disc list-inside space-y-2 text-base text-gray-600 dark:text-gray-400 pl-4">
            <li><strong>红色叉号：</strong> 图纸上该区域会打叉，表示“库存不足”。</li>
            <li><strong>智能推荐：</strong> 图例中会用括号显示系统全库中最接近的色号（如 <code>(COCO:S01)</code>），作为补货建议。</li>
        </ul>
      </>
    )
  },
  {
    id: 'bead-manager',
    title: '豆色管理与创建',
    icon: FileJson,
    content: (
      <>
        <p className="text-lg text-gray-700 dark:text-gray-300">
            在「豆色管理」页，你可以建立一个与现实库存一一对应的数字化色板。
            我们提供了简单直观的 GUI 模式和适合高级用户的 YAML 模式。
        </p>

        <h3 className="text-xl font-bold mt-12 mb-4 flex items-center gap-2 text-primary-600 dark:text-primary-400">
            <MousePointerClick size={24} /> 方式一：点选创建 (推荐)
        </h3>
        <p className="mb-4 text-base text-gray-700 dark:text-gray-300">
            这是最简单的创建方式。你只需要在列表中点选你拥有的颜色。
        </p>
        <ol className="list-decimal list-inside space-y-4 text-base text-gray-700 dark:text-gray-300">
            <li className="pl-2">
                <strong>新建色板：</strong> 进入「豆色管理」页，点击「新建文件」开始。
            </li>
            <li className="pl-2">
                <strong>筛选品牌：</strong> 在左侧栏，点击顶部的品牌标签来缩小范围。
            </li>
            <li className="pl-2">
                <strong>点选颜色：</strong> 点击色块即可选中它（再次点击取消）。
            </li>
            <li className="pl-2">
                <strong>插入到库存：</strong> 选中所有你拥有的颜色后，点击左侧栏底部的 <strong>「插入 (Insert)」</strong> 按钮。
            </li>
            <li className="pl-2">
                <strong>保存备份：</strong> 
                <span className="block mt-1 text-gray-500 text-sm">
                    <strong>强烈建议</strong>点击右上角的 <strong className="text-primary-600"><Save size={14} className="inline"/> 验证并下载</strong> 
                    按钮。将色板保存为 <code>.yaml</code> 文件。
                </span>
            </li>
        </ol>

        <h3 className="text-xl font-bold mt-12 mb-4 flex items-center gap-2 text-primary-600 dark:text-primary-400">
            <FileJson size={24} /> 方式二：YAML 编辑 (高级)
        </h3>
        <p className="mb-4 text-base text-gray-700 dark:text-gray-300">
            点击顶部的 <strong>「GUI / YAML」</strong> 切换按钮进入代码模式。
            可以使用 <code>patch_brands</code> 字段来全局覆盖系统的默认颜色定义。
        </p>
        
        <div className="bg-gray-800 text-gray-200 p-6 rounded text-sm font-mono overflow-x-auto shadow-inner border border-gray-700">
            <pre>{`meta:
  name: "我的库存与修正"
  updated_at: "2024-05-20"

# has_brands: 定义你拥有的颜色 (库存)
has_brands:
  "Perler":
    "P01": "#FFFFFF"
    "P02": "#000000"
  "Artkal":
    "S01": "#123456"

# patch_brands: 修正/覆盖系统内置的颜色数值
# (即使你没有这个库存，也可以修正它以便更准确的匹配)
patch_brands:
  "Perler":
    "P01": "#F0F0F0" # 觉得系统白色太亮？改暗一点`}</pre>
        </div>
      </>
    )
  }
];

const enContent: ManualSection[] = [
  {
    id: 'intro',
    title: 'Introduction',
    icon: Lightbulb,
    content: (
      <>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Pixler is an online tool designed for pixel art enthusiasts and bead artists.
          It converts images into detailed blueprints with coordinates, grids, and color codes.
        </p>
        <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm mt-6">
            <h4 className="font-bold mb-2 text-lg text-primary-600 dark:text-primary-400">Key Features</h4>
            <ul className="list-disc list-inside space-y-2 text-base text-gray-600 dark:text-gray-400">
                <li>Smart Pixel Scale Detection</li>
                <li>Auto Background Cropping</li>
                <li>Multi-brand Bead Matching</li>
                <li>High-res Blueprint Export</li>
            </ul>
        </div>
      </>
    )
  },
  {
    id: 'best-experience',
    title: 'Best Experience Guide',
    icon: Monitor,
    content: (
      <>
        <p className="text-lg text-gray-700 dark:text-gray-300">For the smoothest experience, please check the following tips:</p>
        
        <h4 className="font-bold text-lg mt-8 mb-3 flex items-center gap-2 text-primary-600 dark:text-primary-400">
             <Monitor size={20} /> Desktop / Tablet First
        </h4>
        <p className="text-base text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            While Pixler works on mobile, <strong>PC or Tablet</strong> offers much more screen space for managing complex grids and legends.
        </p>

        <h4 className="font-bold text-lg mt-8 mb-3 flex items-center gap-2 text-primary-600 dark:text-primary-400">
             <Smartphone size={20} /> iOS / Mobile Tips
        </h4>
        <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                <div className="font-bold text-base mb-2">1. Add to Home Screen (PWA)</div>
                <div className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    Browser bars take up too much space.
                    <br/>
                    <strong>iOS Safari:</strong> Tap the <Share size={14} className="inline mx-0.5" /> Share button and select <strong>"Add to Home Screen"</strong>.
                    <br/>
                    Pixler will run like a native full-screen app.
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                <div className="font-bold text-base mb-2">2. Saving Images</div>
                <div className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    If the image opens in the browser after clicking "Download":
                    <ul className="list-disc list-inside mt-1 ml-1">
                        <li><strong>Long press</strong> the image and select "Save to Photos".</li>
                        <li>Or use the <Share size={14} className="inline mx-0.5" /> Share button and select <strong>"Save to Files"</strong>.</li>
                    </ul>
                </div>
            </div>
        </div>
      </>
    )
  },
  {
    id: 'workflow',
    title: 'Basic Workflow',
    icon: Zap,
    content: (
      <>
        <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 mt-4 space-y-10">
            <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-primary-900">
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-300">1</span>
                </span>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Add Image</h3>
                <p className="text-base text-gray-600 dark:text-gray-400">
                    Upload PNG, JPG.
                    <br/>
                    <span className="text-sm text-gray-400">* PNG is recommended for pixel art.</span>
                </p>
            </li>
            <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-primary-900">
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-300">2</span>
                </span>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Image Processing</h3>
                <div className="space-y-3 text-base text-gray-600 dark:text-gray-400">
                    <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200">Scale:</span>
                        Adjust manually if the grid doesn't align with pixels.
                    </div>
                    <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200">Auto Crop:</span>
                        Remove transparent or solid backgrounds.
                    </div>
                </div>
            </li>
            <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-primary-900">
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-300">3</span>
                </span>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Bead Matching</h3>
                <div className="space-y-3 text-base text-gray-600 dark:text-gray-400">
                    <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200">Enable:</span>
                        Select <strong>"System Only"</strong> (All) or <strong>"User Only"</strong> (Inventory).
                    </div>
                </div>
            </li>
            <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-primary-900">
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-300">4</span>
                </span>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Blueprint Settings</h3>
                <p className="text-base text-gray-600 dark:text-gray-400">
                    Configure grid lines, coordinates display, and legend position.
                </p>
            </li>
            <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-primary-900">
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-300">5</span>
                </span>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Save</h3>
                <p className="text-base text-gray-600 dark:text-gray-400">Click "Download PNG".</p>
            </li>
        </ol>
      </>
    )
  },
  {
    id: 'processing',
    title: 'Parameters Explained',
    icon: Layers,
    content: (
      <>
        <h4 className="text-xl font-bold mt-8 mb-3 flex items-center gap-2"><Grid3x3 size={20} /> Pixel Scale</h4>
        <p className="text-lg text-gray-700 dark:text-gray-300">Defines how many physical pixels equal one grid block.</p>

        <h4 className="text-xl font-bold mt-10 mb-3 flex items-center gap-2"><Palette size={20} /> Color Tolerance</h4>
        <p className="text-lg text-gray-700 dark:text-gray-300">Merges similar colors to reduce total color count.</p>

        <h4 className="text-xl font-bold mt-10 mb-3 flex items-center gap-2"><Layout size={20} /> Blueprint Scale</h4>
        <p className="text-lg text-gray-700 dark:text-gray-300">This determines the <strong>resolution</strong> of the exported image.</p>
      </>
    )
  },
  {
    id: 'beads',
    title: 'Bead Matching',
    icon: Palette,
    content: (
      <>
        <h4 className="font-bold text-lg mt-6 mb-3">Matching Modes</h4>
        <ul className="space-y-4 text-base">
            <li className="bg-gray-50 dark:bg-gray-800 p-4 rounded border border-gray-100 dark:border-gray-700">
                <div className="font-bold text-base">System Only</div>
                <div className="text-sm text-gray-500 mt-1">
                  Uses the built-in full palette.
                </div>
            </li>
            <li className="bg-gray-50 dark:bg-gray-800 p-4 rounded border border-gray-100 dark:border-gray-700">
                <div className="font-bold text-base">User Only (My Beads)</div>
                <div className="text-sm text-gray-500 mt-1">
                  Matches against your inventory in "Bead Manager".
                </div>
            </li>
        </ul>

        <h4 className="font-bold text-lg mt-10 mb-3">Precision Threshold (Delta E)</h4>
        <p className="text-base mb-3 text-gray-700 dark:text-gray-300">Controls how strictly colors are matched:</p>
        <ul className="list-disc list-inside space-y-2 text-base text-gray-600 dark:text-gray-400 pl-4">
            <li><strong>Loose (&gt;20):</strong> Matches almost anything. The system finds the nearest bead even if it looks very different.</li>
            <li><strong>Strict (&lt;10):</strong> Matches only if the bead color is very close to the original. Otherwise, it shows as missing (X).</li>
        </ul>
      </>
    )
  },
  {
    id: 'bead-manager',
    title: 'Bead Manager',
    icon: FileJson,
    content: (
      <>
        <p className="text-lg text-gray-700 dark:text-gray-300">Create a digital palette matching your inventory.</p>
        <ol className="list-decimal list-inside space-y-4 mt-6 text-base text-gray-700 dark:text-gray-300">
            <li className="pl-2">
                <strong>Create New:</strong> Click "Create New" in Bead Manager.
            </li>
            <li className="pl-2">
                <strong>Select Colors:</strong> Click swatches from the System Palette on the left.
            </li>
            <li className="pl-2">
                <strong>Insert:</strong> Click <strong>"Insert"</strong> to add them to your palette.
            </li>
            <li className="pl-2">
                <strong>Save:</strong> Click <strong>Validate & Download</strong> to save a <code>.yaml</code> backup.
            </li>
        </ol>

        <h3 className="text-xl font-bold mt-12 mb-4 flex items-center gap-2 text-primary-600 dark:text-primary-400">
            <FileJson size={24} /> Method 2: YAML Edit (Advanced)
        </h3>
        <p className="mb-4 text-base text-gray-700 dark:text-gray-300">
            Switch to <strong>"GUI / YAML"</strong> to edit code directly.
            You can use <code>patch_brands</code> to override system defaults.
        </p>
        
        <div className="bg-gray-800 text-gray-200 p-6 rounded text-sm font-mono overflow-x-auto shadow-inner border border-gray-700">
            <pre>{`meta:
  name: "My Inventory & Fixes"
  updated_at: "2024-05-20"

# has_brands: Define what you own (Inventory)
has_brands:
  "Perler":
    "P01": "#FFFFFF"
    "P02": "#000000"
  "Artkal":
    "S01": "#123456"

# patch_brands: Override system color definitions
# (Useful for fixing incorrect default colors)
patch_brands:
  "Perler":
    "P01": "#F0F0F0" # Override P01 to be slightly darker`}</pre>
        </div>
      </>
    )
  }
];

const jaContent: ManualSection[] = [
  {
    id: 'intro',
    title: 'はじめに',
    icon: Lightbulb,
    content: (
      <>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Pixlerは、ドット絵やアイロンビーズのための図案作成ツールです。
          画像を座標、グリッド、色番号付きの図案に変換します。
        </p>
      </>
    )
  },
  {
    id: 'best-experience',
    title: '推奨環境ガイド',
    icon: Monitor,
    content: (
      <>
        <p className="text-lg text-gray-700 dark:text-gray-300">快適にご利用いただくためのヒントです。</p>
        
        <h4 className="font-bold text-lg mt-8 mb-3 flex items-center gap-2 text-primary-600 dark:text-primary-400">
             <Monitor size={20} /> PC / タブレット推奨
        </h4>
        <p className="text-base text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            大きな画面の方が、細かいグリッドや凡例の確認、パレット編集が快適です。
        </p>

        <h4 className="font-bold text-lg mt-8 mb-3 flex items-center gap-2 text-primary-600 dark:text-primary-400">
             <Smartphone size={20} /> iOS / モバイルの方へ
        </h4>
        <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                <div className="font-bold text-base mb-2">1. ホーム画面に追加 (PWA)</div>
                <div className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    ブラウザのアドレスバーを消して全画面で使用できます。
                    <br/>
                    <strong>iOS Safari:</strong> <Share size={14} className="inline mx-0.5" /> 共有ボタンから<strong>「ホーム画面に追加」</strong>を選択してください。
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                <div className="font-bold text-base mb-2">2. 画像の保存</div>
                <div className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    「ダウンロード」後に画像がブラウザで開く場合：
                    <ul className="list-disc list-inside mt-1 ml-1">
                        <li><strong>画像を長押し</strong>して「“写真”に保存」。</li>
                        <li>または <Share size={14} className="inline mx-0.5" /> 共有ボタンから<strong>「“ファイル”に保存」</strong>。</li>
                    </ul>
                </div>
            </div>
        </div>
      </>
    )
  },
  {
    id: 'workflow',
    title: '基本フロー',
    icon: Zap,
    content: (
      <>
        <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 mt-4 space-y-10">
            <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-primary-900">
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-300">1</span>
                </span>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">画像追加</h3>
                <p className="text-base text-gray-600 dark:text-gray-400">
                    PNG、JPGをアップロード。ドット絵にはPNGが最適です。
                </p>
            </li>
            <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-primary-900">
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-300">2</span>
                </span>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">画像処理</h3>
                <div className="space-y-3 text-base text-gray-600 dark:text-gray-400">
                    <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200">倍率 (Scale):</span>
                        グリッドがずれる場合は手動で調整します。
                    </div>
                    <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200">自動トリミング:</span>
                        不要な背景を削除します。
                    </div>
                </div>
            </li>
            <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-primary-900">
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-300">3</span>
                </span>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">ビーズマッチング</h3>
                <div className="space-y-3 text-base text-gray-600 dark:text-gray-400">
                    <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200">有効化:</span>
                        <strong>「システムのみ」</strong>（全色）または<strong>「マイビーズ」</strong>（在庫）を選択。
                    </div>
                </div>
            </li>
            <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-primary-900">
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-300">4</span>
                </span>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">図案設定</h3>
                <p className="text-base text-gray-600 dark:text-gray-400">
                    グリッド線、座標、凡例の位置などを設定します。
                </p>
            </li>
            <li className="ml-8">
                <span className="absolute flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-primary-900">
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-300">5</span>
                </span>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">保存</h3>
                <p className="text-base text-gray-600 dark:text-gray-400">PNG画像をダウンロードします。</p>
            </li>
        </ol>
      </>
    )
  },
  {
    id: 'processing',
    title: 'パラメータ詳細',
    icon: Layers,
    content: (
      <>
        <h4 className="text-xl font-bold mt-8 mb-3 flex items-center gap-2"><Grid3x3 size={20} /> ピクセル倍率 (Scale)</h4>
        <p className="text-lg text-gray-700 dark:text-gray-300">1マスを構成する画像のピクセル数です。</p>

        <h4 className="text-xl font-bold mt-10 mb-3 flex items-center gap-2"><Palette size={20} /> 色の許容誤差</h4>
        <p className="text-lg text-gray-700 dark:text-gray-300">似た色を統合して色数を減らします。</p>
      </>
    )
  },
  {
    id: 'beads',
    title: 'ビーズマッチング',
    icon: Palette,
    content: (
      <>
        <h4 className="font-bold text-lg mt-6 mb-3">マッチングモード</h4>
        <ul className="space-y-4 text-base">
            <li className="bg-gray-50 dark:bg-gray-800 p-4 rounded border border-gray-100 dark:border-gray-700">
                <div className="font-bold text-base">システムのみ (System Only)</div>
                <div className="text-sm text-gray-500 mt-1">
                  内蔵の全色を使用します。
                </div>
            </li>
            <li className="bg-gray-50 dark:bg-gray-800 p-4 rounded border border-gray-100 dark:border-gray-700">
                <div className="font-bold text-base">マイビーズ (User Only)</div>
                <div className="text-sm text-gray-500 mt-1">
                  「ビーズ管理」の在庫とマッチングします。
                </div>
            </li>
        </ul>

        <h4 className="font-bold text-lg mt-10 mb-3">精度しきい値 (Delta E)</h4>
        <p className="text-base mb-3 text-gray-700 dark:text-gray-300">色差の許容範囲を制御します：</p>
        <ul className="list-disc list-inside space-y-2 text-base text-gray-600 dark:text-gray-400 pl-4">
            <li><strong>緩やか (&gt;20)：</strong> ほぼすべてのビーズをマッチさせます。色が異なっていても、最も近いものを強制的に選択します。</li>
            <li><strong>厳格 (&lt;10)：</strong> 色が非常に近い場合のみマッチし、それ以外は「不足 (X)」として扱います。</li>
        </ul>
      </>
    )
  },
  {
    id: 'bead-manager',
    title: 'ビーズ管理',
    icon: FileJson,
    content: (
      <>
        <p className="text-lg text-gray-700 dark:text-gray-300">在庫パレットを作成します。</p>
        <ol className="list-decimal list-inside space-y-4 mt-6 text-base text-gray-700 dark:text-gray-300">
            <li className="pl-2">
                <strong>新規作成：</strong> 「ビーズ管理」で新規作成。
            </li>
            <li className="pl-2">
                <strong>色を選択：</strong> 左のシステムパレットから選択。
            </li>
            <li className="pl-2">
                <strong>挿入：</strong> <strong>「挿入 (Insert)」</strong>ボタンをクリック。
            </li>
            <li className="pl-2">
                <strong>保存：</strong> <strong>検証してダウンロード</strong>でYAMLファイルを保存。
            </li>
        </ol>

        <h3 className="text-xl font-bold mt-12 mb-4 flex items-center gap-2 text-primary-600 dark:text-primary-400">
            <FileJson size={24} /> 方法2：YAML編集 (上級者向け)
        </h3>
        <p className="mb-4 text-base text-gray-700 dark:text-gray-300">
            <strong>「GUI / YAML」</strong>を切り替えてコードを直接編集できます。
            <code>patch_brands</code>を使用してシステム定義を上書きできます。
        </p>
        
        <div className="bg-gray-800 text-gray-200 p-6 rounded text-sm font-mono overflow-x-auto shadow-inner border border-gray-700">
            <pre>{`meta:
  name: "My Inventory & Fixes"
  updated_at: "2024-05-20"

# has_brands: 所有している色 (在庫)
has_brands:
  "Perler":
    "P01": "#FFFFFF"
    "P02": "#000000"
  "Artkal":
    "S01": "#123456"

# patch_brands: システムのデフォルト色定義を上書き
# (システムの色が間違っている場合に修正できます)
patch_brands:
  "Perler":
    "P01": "#F0F0F0" # P01を少し暗く上書き`}</pre>
        </div>
      </>
    )
  }
];

export const getManualContent = (lang: Language): ManualSection[] => {
  switch (lang) {
    case 'zh': return zhContent;
    case 'ja': return jaContent;
    default: return enContent;
  }
};
