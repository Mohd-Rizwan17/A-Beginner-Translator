const fromLang = document.getElementById("fromLang");
const toLang = document.getElementById("toLang");
const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const translateBtn = document.getElementById("translateBtn");
const swapBtn = document.getElementById("swapBtn");
const micBtn = document.getElementById("micBtn");
const speakBtn = document.getElementById("speakBtn");
const themeToggle = document.getElementById("themeToggle");
const charCount = document.getElementById("charCount");
const wordCount = document.getElementById("wordCount");
const loaderBar = document.getElementById("loaderBar");
const progressText = document.getElementById("progressText");
const copyBtn = document.getElementById("copyBtn");
const fastModeBtn = document.getElementById("fastModeBtn");
const historyBox = document.getElementById("historyBox");

let fastMode = false;
let speechInstance = null;
let isSpeaking = false;
let currentWordIndex = 0;
let wordsArray = [];
/ ===== LANGUAGES ===== /;

const languages = {
  en: "English",
  hi: "Hindi",
  ur: "Urdu",
  ar: "Arabic",
  fr: "French",
  de: "German",
  es: "Spanish",
  ru: "Russian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  it: "Italian",
};

for (let code in languages) {
  fromLang.innerHTML += `<option value="${code}">${languages[code]}</option>`;
  toLang.innerHTML += `<option value="${code}">${languages[code]}</option>`;
}

fromLang.value = "en";
toLang.value = "hi";

/ ===== COUNTERS ===== /;

inputText.addEventListener("input", () => {
  const text = inputText.value;

  charCount.textContent = text.length + " characters";

  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  wordCount.textContent = words.length + " words";
});

/===== SWAP ===== /;

swapBtn.onclick = () => {
  [fromLang.value, toLang.value] = [toLang.value, fromLang.value];
  [inputText.value, outputText.value] = [outputText.value, inputText.value];
};

/ ===== DARK MODE ===== /;

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  themeToggle.textContent = document.body.classList.contains("dark")
    ? "☀️"
    : "🌙";
});

/ ===== FAST MODE ===== /;

fastModeBtn.onclick = () => {
  fastMode = !fastMode;
  fastModeBtn.textContent = fastMode ? "Fast Mode ON ⚡" : "Fast Mode ⚡";
};

/ ===== HISTORY SAVE ===== /;

function saveToHistory(original, translated) {
  const div = document.createElement("div");
  div.className = "history-item";

  const fromLanguage = languages[fromLang.value];
  const toLanguage = languages[toLang.value];

  div.innerHTML = `
    <div style="font-size:12px; color:#94a3b8; margin-bottom:4px;">
      ${fromLanguage} → ${toLanguage}
    </div>

    <strong>${original.slice(0, 60)}...</strong>
    <br>
    ${translated.slice(0, 80)}...
  `;

  historyBox.prepend(div);
}

/* ===== TRANSLATE ===== */

translateBtn.onclick = async () => {
  const text = inputText.value;
  if (!text.trim()) return;

  outputText.value = "Translating...";
  loaderBar.style.width = "0%";
  progressText.textContent = "";

  const chunks = text.match(/.{1,400}/g);
  let translatedParts = [];
  let completed = 0;

  const translateChunk = async (chunk, index) => {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${fromLang.value}|${toLang.value}`,
    );

    const data = await res.json();
    translatedParts[index] = data.responseData.translatedText;

    completed++;
    let percent = (completed / chunks.length) * 100;
    loaderBar.style.width = percent + "%";
    progressText.textContent = Math.round(percent) + "%";
  };

  try {
    if (fastMode) {
      await Promise.all(chunks.map((c, i) => translateChunk(c, i)));
    } else {
      for (let i = 0; i < chunks.length; i++) {
        await translateChunk(chunks[i], i);
      }
    }

    const finalText = translatedParts.join(" ");
    outputText.innerHTML = finalText
      .split(" ")
      .map((word) => `<span>${word}</span>`)
      .join(" ");
    wordsArray = finalText.split(" ");
    currentWordIndex = 0;

    saveToHistory(text, finalText);
    // Auto scroll to translated box on mobile
    if (window.innerWidth <= 768) {
      outputText.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  } catch (err) {
    console.log(err);
    outputText.value = "Translation failed 🚨";
  }
};

/ ===== COPY ===== /;

copyBtn.onclick = async () => {
  const text = outputText.innerText.trim();
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);

    copyBtn.textContent = "Copied ✅";

    setTimeout(() => {
      copyBtn.textContent = "Copy";
    }, 1500);
  } catch (err) {
    console.log(err);
  }
};

/* ===== SPEAK ===== */
// Stop speech on page reload
window.addEventListener("beforeunload", () => {
  window.speechSynthesis.cancel();
});

speakBtn.onclick = () => {
  if (!wordsArray.length) return;

  if (isSpeaking) {
    window.speechSynthesis.cancel();
    clearInterval(window._highlightInterval);
    speakBtn.textContent = "🔊";
    isSpeaking = false;
    return;
  }

  const fullText = wordsArray.join(" ");
  speechInstance = new SpeechSynthesisUtterance(fullText);
  speechInstance.lang = toLang.value;

  // adjust speech speed if needed
  speechInstance.rate = 1;

  const wordSpans = outputText.querySelectorAll("span");
  currentWordIndex = 0;

  let boundaryWorking = false;

  speechInstance.onboundary = (event) => {
    if (event.name !== "word") return;

    boundaryWorking = true;

    if (currentWordIndex >= wordSpans.length) return;

    wordSpans.forEach((w) => w.classList.remove("highlight-word"));

    const currentSpan = wordSpans[currentWordIndex];
    currentSpan.classList.add("highlight-word");

    // scroll inside output box
    currentSpan.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });

    currentWordIndex++;
  };

  speechInstance.onstart = () => {
    // small delay to detect boundary support
    setTimeout(() => {
      if (!boundaryWorking) {
        // estimate speed based on speech rate
        const baseSpeed = 350;
        const intervalSpeed = baseSpeed / speechInstance.rate;

        window._highlightInterval = setInterval(() => {
          if (currentWordIndex >= wordSpans.length) {
            clearInterval(window._highlightInterval);
            return;
          }

          wordSpans.forEach((w) => w.classList.remove("highlight-word"));

          const currentSpan = wordSpans[currentWordIndex];
          currentSpan.classList.add("highlight-word");

          currentSpan.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });

          currentWordIndex++;
        }, intervalSpeed);
      }
    }, 700);
  };

  speechInstance.onend = () => {
    clearInterval(window._highlightInterval);
    wordSpans.forEach((w) => w.classList.remove("highlight-word"));
    speakBtn.textContent = "🔊";
    isSpeaking = false;
  };

  window.speechSynthesis.speak(speechInstance);
  speakBtn.textContent = "⏹ Stop";
  isSpeaking = true;
};
/* ===== IMAGE ===== */

const cameraBtn = document.getElementById("cameraBtn");
const imageInput = document.getElementById("imageInput");

cameraBtn.onclick = () => {
  imageInput.click();
};

imageInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  inputText.value = "Detecting language & scanning image...";

  const worker = Tesseract.createWorker();

  await worker.load();

  // Load multiple languages
  await worker.loadLanguage("eng+hin+urd+ara");
  await worker.initialize("eng+hin+urd+ara");

  await worker.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
    preserve_interword_spaces: "1",
  });

  const result = await worker.recognize(file);

  let rawText = result.data.text;

  // 🧠 Smart Language Guess
  let detectedLang = "English";

  if (/[\u0600-\u06FF]/.test(rawText)) {
    detectedLang = "Urdu / Arabic";
  } else if (/[\u0900-\u097F]/.test(rawText)) {
    detectedLang = "Hindi";
  }

  console.log("Detected Language:", detectedLang);

  // ✨ Better Paragraph Formatting
  let formattedText = rawText
    .replace(/\n{2,}/g, "\n\n") // remove extra blank lines
    .replace(/([a-z])\n([a-z])/gi, "$1 $2") // fix broken lines
    .replace(/\s{2,}/g, " ") // remove extra spaces
    .trim();

  inputText.value = formattedText;

  charCount.textContent = formattedText.length + " characters";

  await worker.terminate();
};
