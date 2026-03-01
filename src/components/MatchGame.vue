<script setup lang="ts">
import { computed, reactive, ref, onMounted, onBeforeUnmount } from "vue"
import { words, type Word } from "@/data/words"
import "@/styles/match.css"
import { Volume2 } from "lucide-vue-next"

type CardKind = "en" | "ja"
type Card = { key: string; wordId: string; kind: CardKind; text: string }

const ROUND_SIZE = 5

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const ai = a[i]!
    const aj = a[j]!
    a[i] = aj
    a[j] = ai
  }
  return a
}

function buildCards(list: Word[]) {
  const left: Card[] = shuffle(
    list.map(w => ({ key: `en-${w.id}`, wordId: w.id, kind: "en", text: w.en }))
  )
  const right: Card[] = shuffle(
    list.map(w => ({ key: `ja-${w.id}`, wordId: w.id, kind: "ja", text: w.ja }))
  )
  return { left, right }
}

const state = reactive({
  left: [] as Card[],
  right: [] as Card[],
  locked: false,
})

const selected = ref<Card | null>(null)
const wrongPair = ref<{ a: string; b: string } | null>(null)

const matchedRound = reactive(new Set<string>()) // wordId

const round = ref(1)
const roundWords = ref<Word[]>([])

/* =========================
   SP判定
   ========================= */
const isMobile = ref(false)
function updateIsMobile() {
  isMobile.value = window.matchMedia("(max-width: 720px)").matches
}

/* =========================
   iPhone/Safari SpeechSynthesis 安定化
   - voicesの遅延ロード待ち
   - 初回の先頭欠け対策（1回だけプレフィックス）
   - voice を明示指定
   ========================= */
function waitVoicesReady(): Promise<void> {
  return new Promise(resolve => {
    const synth = window.speechSynthesis
    const voices = synth.getVoices()
    if (voices && voices.length > 0) return resolve()

    const onVoices = () => {
      synth.removeEventListener("voiceschanged", onVoices)
      resolve()
    }
    synth.addEventListener("voiceschanged", onVoices)

    // 保険：voiceschangedが来ない端末でも先に進める
    setTimeout(() => {
      synth.removeEventListener("voiceschanged", onVoices)
      resolve()
    }, 1200)
  })
}

function pickEnglishVoice() {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find(v => v.lang === "en-US") ||
    voices.find(v => v.lang?.startsWith("en")) ||
    null
  )
}

// 「最初の1回だけ先頭が欠ける」対策用フラグ
const firstSpeakDone = ref(false)

// ユーザー操作で一度でも触れたか（iOSの制限対策）
const speechUnlocked = ref(false)

function unlockSpeechOnce() {
  if (speechUnlocked.value) return
  speechUnlocked.value = true
  // ※ここでは「音を鳴らす」必要はない。フラグだけでOK。
  // iOSはユーザー操作があった事実が重要で、実際の発音はspeak側で行う。
}

async function speak(wordId: string) {
  const w = roundWords.value.find(x => x.id === wordId)
  if (!w) return

  try {
    const synth = window.speechSynthesis
    await waitVoicesReady()

    // 連続再生時の詰まり回避
    if (synth.speaking || synth.pending) synth.cancel()

    // iOS対策：cancel直後に少し待つ（最初の1回だけ欠けやすい）
    await new Promise(r => setTimeout(r, 120))

    // ★最初の1回だけ「, 」を付けて先頭欠けを防ぐ
    const text = firstSpeakDone.value ? w.en : `, ${w.en}`

    const u = new SpeechSynthesisUtterance(text)
    u.lang = "en-US"
    u.rate = 1.0
    u.pitch = 1.0
    u.volume = 1.0

    const v = pickEnglishVoice()
    if (v) u.voice = v

    synth.speak(u)

    firstSpeakDone.value = true
  } catch {
    // 端末差で失敗しても落とさない
  }
}

onMounted(async () => {
  updateIsMobile()
  window.addEventListener("resize", updateIsMobile)

  // 初回からvoicesを温める（iPhone対策）
  await waitVoicesReady()
})

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateIsMobile)
})

/* =========================
   Round handling
   ========================= */
function pickRoundWords() {
  roundWords.value = shuffle(words).slice(0, Math.min(ROUND_SIZE, words.length))
}

function resetRound() {
  pickRoundWords()

  const { left, right } = buildCards(roundWords.value)
  state.left = left
  state.right = right

  matchedRound.clear()
  state.locked = false
  selected.value = null
  wrongPair.value = null
}

function nextRound() {
  round.value += 1
  resetRound()
}

resetRound()

const clearedRound = computed(() => matchedRound.size === roundWords.value.length)

function isSelected(card: Card) {
  return selected.value?.key === card.key
}

function isMatched(card: Card) {
  return matchedRound.has(card.wordId)
}

function isWrong(card: Card) {
  if (!wrongPair.value) return false
  return wrongPair.value.a === card.key || wrongPair.value.b === card.key
}

/* =========================
   SP用：日本語表示を1つにする
   ========================= */
function getJaText(wordId: string) {
  const w = roundWords.value.find(x => x.id === wordId)
  if (!w) return ""

  if (isMobile.value) {
    return w.ja.split(" / ")[0]
  }
  return w.ja
}

async function onPick(card: Card) {
  // SPは最初のタップで「ユーザー操作があった」ことを確定させる（iOS対策）
  if (isMobile.value) unlockSpeechOnce()

  if (state.locked) return
  if (isMatched(card)) return

  if (isSelected(card)) {
    selected.value = null
    return
  }

  if (!selected.value) {
    selected.value = card
    return
  }

  if (selected.value.kind === card.kind) {
    selected.value = card
    return
  }

  state.locked = true

  const a = selected.value
  const b = card

  if (a.wordId === b.wordId) {
    matchedRound.add(a.wordId)

    // ★SPではマッチした瞬間に自動で発音（英語）
    if (isMobile.value) {
      // iOS: 「ユーザー操作」から近いタイミングの方が通りやすい
      speak(a.wordId)
    }

    selected.value = null
    state.locked = false
    return
  }

  wrongPair.value = { a: a.key, b: b.key }
  await new Promise(r => setTimeout(r, 600))
  wrongPair.value = null
  selected.value = null
  state.locked = false
}
</script>

<template>
  <header class="appbar">
    <div class="appbarInner">
      <div>
        <h1>Vocab Match</h1>
        <p class="sub">
          TOEIC High-Frequency Vocabulary Matching Practice • Round {{ round }}
        </p>
      </div>
    </div>
  </header>

  <main class="wrap">
    <section class="board">
      <div class="col">
        <h3>English</h3>

        <button
          v-for="c in state.left"
          :key="c.key"
          class="card"
          :class="{
            selected: isSelected(c),
            matched: isMatched(c),
            wrong: isWrong(c),
          }"
          @click="onPick(c)"
        >
          <span class="cardText">{{ c.text }}</span>

          <!-- PCでは残す / SPではCSSで非表示（display:none） -->
          <button class="audio" @click.stop="speak(c.wordId)" aria-label="Play audio">
            <Volume2 :size="18" />
          </button>
        </button>
      </div>

      <div class="col">
        <h3>Japanese</h3>

        <button
          v-for="c in state.right"
          :key="c.key"
          class="card"
          :class="{
            selected: isSelected(c),
            matched: isMatched(c),
            wrong: isWrong(c),
          }"
          @click="onPick(c)"
        >
          <span class="cardText">{{ getJaText(c.wordId) }}</span>
        </button>
      </div>
    </section>

    <div class="actions">
      <button class="btn" @click="nextRound" :disabled="!clearedRound">
        Next
      </button>
    </div>
  </main>
</template>