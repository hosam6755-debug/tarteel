// Curated presets for backgrounds, fonts, and styles

export const PRESET_BACKGROUNDS = [
  // Curated Images
  {
    id: 'kaaba',
    type: 'image',
    name: 'الكعبة المشرفة - مكة',
    category: 'مقدسات',
    url: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=300&q=60',
  },
  {
    id: 'medina',
    type: 'image',
    name: 'المسجد النبوي الشريف',
    category: 'مقدسات',
    url: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=300&q=60',
  },
  {
    id: 'mosque_arch',
    type: 'image',
    name: 'أقواس إسلامية وفوانيس',
    category: 'إسلامي',
    url: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=300&q=60',
  },
  {
    id: 'night_sky',
    type: 'image',
    name: 'سماء ليلية ونجوم خاشعة',
    category: 'طبيعة',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=300&q=60',
  },
  {
    id: 'desert_sunset',
    type: 'image',
    name: 'غروب الصحراء الهادئ',
    category: 'طبيعة',
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=300&q=60',
  },
  {
    id: 'misty_mountains',
    type: 'image',
    name: 'سحاب وجبال خضراء',
    category: 'طبيعة',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=300&q=60',
  },
  {
    id: 'calm_ocean',
    type: 'image',
    name: 'بحر هادئ مع شفق المساء',
    category: 'طبيعة',
    url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=300&q=60',
  },

  // Ambient Video Loops (High performance lightweight royalty-free video loops)
  {
    id: 'vid_particles',
    type: 'video',
    name: 'ذرات ذهبية مضيئة (فيديو)',
    category: 'فيديو متحرك',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-dust-particles-in-the-dark-41710-large.mp4',
    thumb: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=60',
  },
  {
    id: 'vid_clouds',
    type: 'video',
    name: 'حركة السحاب فوق الجبال (فيديو)',
    category: 'فيديو متحرك',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-clouds-and-blue-sky-2408-large.mp4',
    thumb: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=300&q=60',
  },
  {
    id: 'vid_stars',
    type: 'video',
    name: 'دوران النجوم في الفضاء (فيديو)',
    category: 'فيديو متحرك',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4',
    thumb: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=300&q=60',
  },

  // Color & Gradient Presets
  {
    id: 'grad_obsidian',
    type: 'gradient',
    name: 'ليل ملكي عميق',
    category: 'تدرجات',
    value: 'linear-gradient(135deg, #091222 0%, #030712 50%, #1a0e2e 100%)',
  },
  {
    id: 'grad_emerald',
    type: 'gradient',
    name: 'زمردي إسلامي داكن',
    category: 'تدرجات',
    value: 'linear-gradient(135deg, #06281e 0%, #041410 50%, #16241a 100%)',
  },
  {
    id: 'grad_gold',
    type: 'gradient',
    name: 'أسود مع شفق ذهبي',
    category: 'تدرجات',
    value: 'linear-gradient(135deg, #21190c 0%, #0a0907 60%, #2f210e 100%)',
  },
  {
    id: 'color_obsidian',
    type: 'color',
    name: 'أسود فحمي نقي',
    category: 'ألوان',
    value: '#080b11',
  },
  {
    id: 'color_navy',
    type: 'color',
    name: 'أزرق كحلي داكن',
    category: 'ألوان',
    value: '#0c1626',
  },
  {
    id: 'color_emerald',
    type: 'color',
    name: 'أخضر إسلامي عتيق',
    category: 'ألوان',
    value: '#081c15',
  },
];

export const QURAN_FONTS = [
  {
    id: 'Amiri Quran',
    name: 'مصحف أميري (عثماني عريق)',
    fontFamily: '"Amiri Quran", "Amiri", serif',
  },
  {
    id: 'Scheherazade New',
    name: 'شهرزاد (خط عثماني حديث)',
    fontFamily: '"Scheherazade New", serif',
  },
  {
    id: 'Amiri',
    name: 'أميري كلاسيكي',
    fontFamily: '"Amiri", serif',
  },
  {
    id: 'Cairo',
    name: 'كايرو (عصري واضح)',
    fontFamily: '"Cairo", sans-serif',
  },
  {
    id: 'Tajawal',
    name: 'تجوّل (ناعم وبسيط)',
    fontFamily: '"Tajawal", sans-serif',
  },
];

export const FRAME_STYLES = [
  { id: 'islamic', name: 'إطار إسلامي مزخرف (أركان ذهبية)' },
  { id: 'minimal', name: 'إطار خطي أنيق وبسيط' },
  { id: 'glow', name: 'إطار نيون مضيء' },
  { id: 'none', name: 'بدون إطار' },
];

export const TEXT_COLOR_PALETTES = [
  { id: '#fdfbf7', name: 'أبيض لؤلؤي', color: '#fdfbf7' },
  { id: '#f7d070', name: 'ذهب ملكي', color: '#f7d070' },
  { id: '#e5b869', name: 'ذهب عتيق', color: '#e5b869' },
  { id: '#a7f3d0', name: 'زمرد فاتح', color: '#a7f3d0' },
  { id: '#bae6fd', name: 'سماوي هادئ', color: '#bae6fd' },
  { id: '#e2e8f0', name: 'فضي بلاتيني', color: '#e2e8f0' },
];
