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

const isMobile = ref(false)
function updateIsMobile() {
  isMobile.value = window.matchMedia("(max-width: 720px)").matches
}

const preferredVoice = ref<SpeechSynthesisVoice | null>(null)

function refreshVoiceCache() {
  const voices = window.speechSynthesis.getVoices()
  preferredVoice.value =
    voices.find(v => v.lang === "en-US") ||
    voices.find(v => v.lang?.startsWith("en")) ||
    null
}

const firstSpeakDone = ref(false)

const speechUnlocked = ref(false)

function unlockSpeechOnce() {
  if (speechUnlocked.value) return
  speechUnlocked.value = true

  const synth = window.speechSynthesis
  try {
    synth.cancel()
    synth.resume()

    const u = new SpeechSynthesisUtterance(" ")
    u.lang = "en-US"
    u.rate = 1.0
    u.pitch = 1.0
    u.volume = 0

    if (preferredVoice.value) u.voice = preferredVoice.value

    synth.speak(u)
  } catch {
  }
}

function speak(wordId: string) {
  const w = roundWords.value.find(x => x.id === wordId)
  if (!w) return

  const synth = window.speechSynthesis

  try {
    synth.cancel()
    synth.resume()

    const text = firstSpeakDone.value ? w.en : `, ${w.en}`

    const u = new SpeechSynthesisUtterance(text)
    u.lang = "en-US"
    u.rate = 1.0
    u.pitch = 1.0
    u.volume = 1.0

    if (preferredVoice.value) u.voice = preferredVoice.value

    synth.speak(u)
    firstSpeakDone.value = true
  } catch {
  }
}

function handleVisibility() {
  const synth = window.speechSynthesis
  try {
    if (document.visibilityState === "hidden") synth.cancel()
    else synth.resume()
  } catch {
  }
}

onMounted(() => {
  updateIsMobile()
  window.addEventListener("resize", updateIsMobile)

  refreshVoiceCache()
  window.speechSynthesis.addEventListener("voiceschanged", refreshVoiceCache)

  document.addEventListener("visibilitychange", handleVisibility)
})

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateIsMobile)
  window.speechSynthesis.removeEventListener("voiceschanged", refreshVoiceCache)
  document.removeEventListener("visibilitychange", handleVisibility)
})

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

function getJaText(wordId: string) {
  const w = roundWords.value.find(x => x.id === wordId)
  if (!w) return ""

  if (isMobile.value) {
    return w.ja.split(" / ")[0]
  }
  return w.ja
}

async function onPick(card: Card) {
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

    if (isMobile.value) {
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