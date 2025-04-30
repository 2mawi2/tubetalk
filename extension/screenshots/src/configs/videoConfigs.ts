import { resolve } from 'path';

export interface VideoConfig {
  id: string;
  youtubeUrl: string;
  frameImagePath: string;
  attribution: {
    channel: string;
    title: string;
  };
  languages: {
    code: string;
    name: string;
    heading: string;
    subheading: string;
  }[];
}

export const SUPPORTED_LANGUAGES = [
  'en',
  'de',
  'es',
  'fr',
  'ja',
  'ar',
  'pt',
  'id',
  'hi'
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Main video config showcasing chat and timestamps
export const DEFAULT_VIDEO_CONFIG: VideoConfig = {
  id: 'chat_with_any_video',
  youtubeUrl: 'https://www.youtube.com/watch?v=0mh3qXtw5Xg',
  frameImagePath: resolve(process.cwd(), 'screenshots', 'assets', 'chat_with_any_video.png'),
  attribution: {
    channel: 'Scenic Relaxation',
    title: 'Wild Zambezi – 4K Full Documentary'
  },
  languages: [
    {
      code: 'en',
      name: 'English',
      heading: 'Chat with Any Video',
      subheading: 'Get instant answers with exact timestamps'
    },
    {
      code: 'de',
      name: 'German',
      heading: 'Chatte mit jedem Video',
      subheading: 'Erhalte sofortige Antworten mit genauen Zeitstempeln'
    },
    {
      code: 'es',
      name: 'Spanish',
      heading: 'Chatea con cualquier video',
      subheading: 'Obtén respuestas instantáneas con marcas de tiempo exactas'
    },
    {
      code: 'fr',
      name: 'French',
      heading: 'Dialoguez avec chaque vidéo',
      subheading: 'Obtenez des réponses instantanées avec des timestamps précis'
    },
    {
      code: 'ja',
      name: 'Japanese',
      heading: '動画と対話',
      subheading: '正確なタイムスタンプで即座に回答'
    },
    {
      code: 'ar',
      name: 'Arabic',
      heading: 'تحدث مع أي فيديو',
      subheading: 'احصل على إجابات فورية مع توقيتات دقيقة'
    },
    {
      code: 'pt',
      name: 'Portuguese',
      heading: 'Converse com qualquer vídeo',
      subheading: 'Obtenha respostas instantâneas com timestamps exatos'
    },
    {
      code: 'id',
      name: 'Indonesian',
      heading: 'Ngobrol dengan Video Apapun',
      subheading: 'Dapatkan jawaban instan dengan timestamp akurat'
    },
    {
      code: 'hi',
      name: 'Hindi',
      heading: 'किसी भी वीडियो से चैट करें',
      subheading: 'सटीक टाइमस्टैम्प के साथ तुरंत जवाब पाएं'
    }
  ]
};

export const VIDEO_CONFIGS: Record<string, VideoConfig> = {
  [DEFAULT_VIDEO_CONFIG.id]: DEFAULT_VIDEO_CONFIG,

  summary: {
    id: 'summary',
    youtubeUrl: 'https://www.youtube.com/watch?v=29vYpV-el48',
    frameImagePath: resolve(process.cwd(), 'screenshots', 'assets', 'summary.png'),
    attribution: {
      channel: 'Mythillogical Podcast',
      title: 'King Arthur – Mythillogical Podcast'
    },
    languages: [
      {
        code: 'en',
        name: 'English',
        heading: 'Quick Video Summaries',
        subheading: 'Get main points in seconds'
      },
      {
        code: 'de',
        name: 'German',
        heading: 'Schnelle Video-Zusammenfassungen',
        subheading: 'Hauptpunkte in Sekunden erfassen'
      },
      {
        code: 'es',
        name: 'Spanish',
        heading: 'Resúmenes rápidos de videos',
        subheading: 'Obtén los puntos principales en segundos'
      },
      {
        code: 'fr',
        name: 'French',
        heading: 'Résumés vidéo rapides',
        subheading: 'Obtenez les points clés en quelques secondes'
      },
      {
        code: 'ja',
        name: 'Japanese',
        heading: '素早いビデオ要約',
        subheading: '数秒で要点を把握'
      },
      {
        code: 'ar',
        name: 'Arabic',
        heading: 'ملخصات سريعة للفيديو',
        subheading: 'احصل على النقاط الرئيسية في ثوان'
      },
      {
        code: 'pt',
        name: 'Portuguese',
        heading: 'Resumos rápidos de vídeo',
        subheading: 'Obtenha os pontos principais em segundos'
      },
      {
        code: 'id',
        name: 'Indonesian',
        heading: 'Ringkasan Video Cepat',
        subheading: 'Dapatkan poin utama dalam hitungan detik'
      },
      {
        code: 'hi',
        name: 'Hindi',
        heading: 'त्वरित वीडियो सारांश',
        subheading: 'सेकंडों में मुख्य बिंदु प्राप्त करें'
      }
    ]
  },

  smart_search: {
    id: 'smart_search',
    youtubeUrl: 'https://www.youtube.com/watch?v=HKDbnpWsjv0',
    frameImagePath: resolve(process.cwd(), 'screenshots', 'assets', 'smart_search.png'),
    attribution: {
      channel: 'GOTO Conferences',
      title: 'DFD (Documentation-First Development) with FastAPI'
    },
    languages: [
      {
        code: 'en',
        name: 'English',
        heading: 'Smart Video Search',
        subheading: 'Find any topic instantly'
      },
      {
        code: 'de',
        name: 'German',
        heading: 'Intelligente Videosuche',
        subheading: 'Finde jedes Thema sofort'
      },
      {
        code: 'es',
        name: 'Spanish',
        heading: 'Búsqueda inteligente',
        subheading: 'Encuentra cualquier tema al instante'
      },
      {
        code: 'fr',
        name: 'French',
        heading: 'Recherche vidéo intelligente',
        subheading: 'Trouvez n\'importe quel sujet instantanément'
      },
      {
        code: 'ja',
        name: 'Japanese',
        heading: 'スマート動画検索',
        subheading: 'どんな話題もすぐに見つかる'
      },
      {
        code: 'ar',
        name: 'Arabic',
        heading: 'بحث ذكي في الفيديو',
        subheading: 'اعثر على أي موضوع فوراً'
      },
      {
        code: 'pt',
        name: 'Portuguese',
        heading: 'Busca inteligente de vídeo',
        subheading: 'Encontre qualquer tópico instantaneamente'
      },
      {
        code: 'id',
        name: 'Indonesian',
        heading: 'Pencarian Video Pintar',
        subheading: 'Temukan topik apapun secara instan'
      },
      {
        code: 'hi',
        name: 'Hindi',
        heading: 'स्मार्ट वीडियो खोज',
        subheading: 'कोई भी विषय तुरंत खोजें'
      }
    ]
  },

  skip_sponsored: {
    id: 'skip_sponsored',
    youtubeUrl: 'https://www.youtube.com/watch?v=CoGTTom4O1s',
    frameImagePath: resolve(process.cwd(), 'screenshots', 'assets', 'skip_sponsored.png'),
    attribution: {
      channel: 'Marques Brownlee',
      title: 'MKBHD: Draw My Life'
    },
    languages: [
      {
        code: 'en',
        name: 'English',
        heading: 'Skip Sponsored Parts',
        subheading: 'Auto-detect and skip ads'
      },
      {
        code: 'de',
        name: 'German',
        heading: 'Überspringe Werbung',
        subheading: 'Automatisch Werbung erkennen und überspringen'
      },
      {
        code: 'es',
        name: 'Spanish',
        heading: 'Salta partes patrocinadas',
        subheading: 'Detecta y salta anuncios automáticamente'
      },
      {
        code: 'fr',
        name: 'French',
        heading: 'Passer les parties sponsorisées',
        subheading: 'Détection et saut automatique des pubs'
      },
      {
        code: 'ja',
        name: 'Japanese',
        heading: 'スポンサー部分をスキップ',
        subheading: '広告を自動検出してスキップ'
      },
      {
        code: 'ar',
        name: 'Arabic',
        heading: 'تخطي الأجزاء المدعومة',
        subheading: 'كشف وتخطي الإعلانات تلقائياً'
      },
      {
        code: 'pt',
        name: 'Portuguese',
        heading: 'Pular partes patrocinadas',
        subheading: 'Detecte e pule anúncios automaticamente'
      },
      {
        code: 'id',
        name: 'Indonesian',
        heading: 'Lewati Bagian Sponsor',
        subheading: 'Deteksi dan lewati iklan otomatis'
      },
      {
        code: 'hi',
        name: 'Hindi',
        heading: 'प्रायोजित भाग छोड़ें',
        subheading: 'विज्ञापनों को स्वचालित रूप से पहचानें और छोड़ें'
      }
    ]
  }
};

export function getVideoConfig(id: string): VideoConfig {
  const config = VIDEO_CONFIGS[id];
  if (!config) {
    throw new Error(`No video configuration found for id: ${id}`);
  }
  return config;
}
