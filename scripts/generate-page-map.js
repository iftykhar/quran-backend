// Script to generate page-metadata.ts from the external JSON mapping
const fs = require('fs');
const path = require('path');

// Arabic surah name to sura_no mapping
const ARABIC_TO_NUM = {
  'الفاتحة': 1, 'البقرة': 2, 'آل عمران': 3, 'النساء': 4, 'المائدة': 5,
  'الأنعام': 6, 'الأعراف': 7, 'الأنفال': 8, 'التوبة': 9, 'يونس': 10,
  'هود': 11, 'يوسف': 12, 'الرعد': 13, 'إبراهيم': 14, 'الحجر': 15,
  'النحل': 16, 'الإسراء': 17, 'الكهف': 18, 'مريم': 19, 'طه': 20,
  'الأنبياء': 21, 'الحج': 22, 'المؤمنون': 23, 'النور': 24, 'الفرقان': 25,
  'الشعراء': 26, 'النمل': 27, 'القصص': 28, 'العنكبوت': 29, 'الروم': 30,
  'لقمان': 31, 'السجدة': 32, 'الأحزاب': 33, 'سبأ': 34, 'فاطر': 35,
  'يس': 36, 'الصافات': 37, 'ص': 38, 'الزمر': 39, 'غافر': 40,
  'فصلت': 41, 'الشورى': 42, 'الزخرف': 43, 'الدخان': 44, 'الجاثية': 45,
  'الأحقاف': 46, 'محمد': 47, 'الفتح': 48, 'الحجرات': 49, 'ق': 50,
  'الذاريات': 51, 'الطور': 52, 'النجم': 53, 'القمر': 54, 'الرحمن': 55,
  'الواقعة': 56, 'الحديد': 57, 'المجادلة': 58, 'الحشر': 59, 'الممتحنة': 60,
  'الصف': 61, 'الجمعة': 62, 'المنافقون': 63, 'التغابن': 64, 'الطلاق': 65,
  'التحريم': 66, 'الملك': 67, 'القلم': 68, 'الحاقة': 69, 'المعارج': 70,
  'نوح': 71, 'الجن': 72, 'المزمل': 73, 'المدثر': 74, 'القيامة': 75,
  'الإنسان': 76, 'المرسلات': 77, 'النبأ': 78, 'النازعات': 79, 'عبس': 80,
  'التكوير': 81, 'الانفطار': 82, 'المطففين': 83, 'الانشقاق': 84, 'البروج': 85,
  'الطارق': 86, 'الأعلى': 87, 'الغاشية': 88, 'الفجر': 89, 'البلد': 90,
  'الشمس': 91, 'الليل': 92, 'الضحى': 93, 'الشرح': 94, 'التين': 95,
  'العلق': 96, 'القدر': 97, 'البينة': 98, 'الزلزلة': 99, 'العاديات': 100,
  'القارعة': 101, 'التكاثر': 102, 'العصر': 103, 'الهمزة': 104, 'الفيل': 105,
  'قريش': 106, 'الماعون': 107, 'الكوثر': 108, 'الكافرون': 109, 'النصر': 110,
  'المسد': 111, 'الإخلاص': 112, 'الفلق': 113, 'الناس': 114,
  // Variants
  'ابراهيم': 14, 'سبإ': 34, 'الانسان': 76, 'النبإ': 78,
  'الإنفطار': 82, 'الإنشقاق': 84
};

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Usage: node generate-page-map.js <path-to-json>');
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const pages = JSON.parse(raw);

  // Extract: for each page, get the sura_no and first ayah index for each surah on that page
  const pageMap = [];

  for (const page of pages) {
    const pageIndex = page.page_index;
    const surahs = [];
    
    for (const [arabicName, verses] of Object.entries(page.verses_by_sura)) {
      const suraNo = ARABIC_TO_NUM[arabicName];
      if (!suraNo) {
        console.error(`Unknown surah: ${arabicName} on page ${pageIndex}`);
        continue;
      }
      const ayahIndices = verses.map(v => v.index).filter(i => i > 0);
      if (ayahIndices.length === 0) {
        // Bismillah-only entry (index 0), use ayah 1
        surahs.push({ sura: suraNo, start: 1, end: 1 });
      } else {
        surahs.push({ 
          sura: suraNo, 
          start: Math.min(...ayahIndices), 
          end: Math.max(...ayahIndices) 
        });
      }
    }

    pageMap.push({ page: pageIndex, surahs });
  }

  // Generate TypeScript
  let ts = `// Auto-generated Madani Mushaf page mapping (604 pages)
// Each entry: [page_number, [[sura_no, start_ayah, end_ayah], ...]]

export interface PageMapping {
  sura: number;
  startAyah: number;
  endAyah: number;
}

/** Standard Madani Mushaf 604-page layout */
export const PAGE_MAP: Record<number, PageMapping[]> = {\n`;

  for (const p of pageMap) {
    const entries = p.surahs.map(s => `{ sura: ${s.sura}, startAyah: ${s.start}, endAyah: ${s.end} }`).join(', ');
    ts += `  ${p.page}: [${entries}],\n`;
  }

  ts += `};\n\n`;
  ts += `export const TOTAL_PAGES = 604;\n`;

  const outPath = path.join(__dirname, '..', 'src', 'modules', 'quran', 'page-metadata.ts');
  fs.writeFileSync(outPath, ts, 'utf-8');
  console.log(`Generated ${outPath} with ${pageMap.length} pages`);
}

main().catch(console.error);
