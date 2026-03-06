// words.ts

export type Word = {
  id: string
  en: string
  ja: string
}

const baseWords = [
  { en: "prevent", ja: "防ぐ" },
  { en: "prior", ja: "前の / 事前の" },
  { en: "prospective", ja: "見込みのある / 将来の" },
  { en: "suitable", ja: "適した" },
  { en: "therefore", ja: "それゆえに" },
  { en: "transfer", ja: "移す / 移動 / 転勤" },
  { en: "appear", ja: "現れる / のように見える" },
  { en: "browse", ja: "閲覧する / 見て回る" },
  { en: "council", ja: "議会 / 評議会" },
  { en: "deal", ja: "扱う / 分配する" },
  { en: "designate", ja: "指定する / 任命する" },
  { en: "duty", ja: "職務 / 義務" },
  { en: "durable", ja: "耐久性のある" },
  { en: "eligible", ja: "資格がある" },
  { en: "environmentally", ja: "環境に関して" },
  { en: "essential", ja: "不可欠な" },
  { en: "former", ja: "以前の / かつての" },
  { en: "otherwise", ja: "別の方法で / さもなければ" },
  { en: "stationery", ja: "文房具" },
  { en: "via", ja: "~を通って" },
  { en: "bureau", ja: "案内所 / 局" },
  { en: "assume", ja: "引き受ける / 仮定する" },
  { en: "behalf", ja: "代わりに" },
  { en: "donation", ja: "寄付" },
  { en: "enthusiastic", ja: "熱心な" },
  { en: "evaluate", ja: "評価する" },
  { en: "fare", ja: "運賃" },
  { en: "utensil", ja: "器具 / 用具" },
  { en: "valid", ja: "有効な" },
  { en: "retail", ja: "小売 / 小売の" },
  { en: "predict", ja: "予測する" },
  { en: "insist", ja: "要求する / 主張する" },
  { en: "inquire", ja: "尋ねる" },
  { en: "inventory", ja: "在庫 / 在庫一覧" },
  { en: "cuisine", ja: "料理" },
  { en: "cupboard", ja: "食器棚 / 戸棚" },
  { en: "defective", ja: "欠陥のある" },
  { en: "appliance", ja: "器具 / 装置" },
  { en: "acclaim", ja: "称賛する" },
  { en: "demand", ja: "需要 / 要求する" },
  { en: "encourage", ja: "奨励する / 励ます" },
  { en: "frequently", ja: "頻繁に" },
  { en: "inspection", ja: "検査" },
  { en: "accommodate", ja: "収容する / 対応する" },
  { en: "indicate", ja: "示す" },
  { en: "modest", ja: "緩やかな / 控えめな" },
  { en: "conduct", ja: "実施する / 案内する" },
  { en: "remodel", ja: "~を改築する" },
  { en: "reach", ja: "~に連絡する" },
]

export const words: Word[] = baseWords.map((word, index) => ({
  id: `w${index + 1}`,
  en: word.en,
  ja: word.ja,
}))