const chapters = window.studyChapters;
const verses = window.studyVerses;
const renderings = window.studyRenderings;
const STORAGE_KEY = "stillpoint-study-progress";

const chapterList = document.querySelector("#chapter-list");
const chapterSearch = document.querySelector("#chapter-search");
const lessonContent = document.querySelector("#lesson-content");
const lessonLabel = document.querySelector("#lesson-label");
const stepDots = document.querySelector("#step-dots");
const previousButton = document.querySelector("#previous-chapter");
const nextButton = document.querySelector("#next-chapter");
const toast = document.querySelector("#toast");
const resetButton = document.querySelector("#reset-progress");
let activeChapter = 0;
let activeVerse = 0;
let toastTimeout;

const versesForChapter = (chapterIndex) => verses.filter((verse) => verse.chapter === chapterIndex + 1);

const readProgress = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    const opened = Array.isArray(saved.opened) ? saved.opened : [];
    const savedChapter = Number.isInteger(saved.lastChapter) && saved.lastChapter >= 0 && saved.lastChapter < chapters.length
      ? saved.lastChapter
      : 0;
    const savedVerse = Number.isInteger(saved.lastVerse) && saved.lastVerse >= 0 && saved.lastVerse < versesForChapter(savedChapter).length
      ? saved.lastVerse
      : 0;
    return {
      opened: opened.filter((chapter) => Number.isInteger(chapter) && chapter >= 0 && chapter < chapters.length),
      lastChapter: savedChapter,
      lastVerse: savedVerse
    };
  } catch (error) {
    console.error("Could not read study progress:", error);
    return { opened: [], lastChapter: 0, lastVerse: 0 };
  }
};

let progress = readProgress();

const saveProgress = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    document.querySelector("#saved-status").innerHTML = '<span class="status-dot"></span> Progress saved';
  } catch (error) {
    console.error("Could not save study progress:", error);
    document.querySelector("#saved-status").innerHTML = '<span class="status-dot status-warning"></span> Progress not saved';
  }
};

const announce = (message) => {
  window.clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 2600);
};

const renderChapterList = () => {
  const query = chapterSearch.value.trim().toLocaleLowerCase();
  const filtered = chapters
    .map((chapter, index) => ({ ...chapter, index }))
    .filter((chapter) => `${chapter.title} ${chapter.subtitle}`.toLocaleLowerCase().includes(query));

  chapterList.replaceChildren();
  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-search";
    empty.textContent = "No chapter matches that search.";
    chapterList.append(empty);
    return;
  }

  for (const chapter of filtered) {
    const button = document.createElement("button");
    button.className = `chapter-item${chapter.index === activeChapter ? " selected" : ""}`;
    button.type = "button";
    button.setAttribute("aria-current", chapter.index === activeChapter ? "step" : "false");

    const number = document.createElement("span");
    number.className = "chapter-number";
    number.textContent = String(chapter.index + 1).padStart(2, "0");

    const details = document.createElement("span");
    details.className = "chapter-details";
    const title = document.createElement("span");
    title.className = "chapter-title";
    title.textContent = chapter.title;
    const subtitle = document.createElement("span");
    subtitle.className = "chapter-subtitle";
    subtitle.textContent = chapter.subtitle;
    details.append(title, subtitle);

    const marker = document.createElement("span");
    marker.className = `chapter-marker${progress.opened.includes(chapter.index) ? " visited" : ""}`;
    marker.setAttribute("aria-label", progress.opened.includes(chapter.index) ? "Opened" : "Not opened");
    button.append(number, details, marker);
    button.addEventListener("click", () => selectChapter(chapter.index));
    chapterList.append(button);
  }

  const selectedChapter = chapterList.querySelector(".chapter-item.selected");
  if (selectedChapter && window.matchMedia("(max-width: 620px)").matches) {
    const listBounds = chapterList.getBoundingClientRect();
    const chapterBounds = selectedChapter.getBoundingClientRect();
    chapterList.scrollLeft += chapterBounds.left - listBounds.left - parseFloat(getComputedStyle(chapterList).paddingLeft);
  }
};

const renderDots = () => {
  stepDots.replaceChildren();
  chapters.forEach((_, index) => {
    const dot = document.createElement("span");
    dot.className = `step-dot${index === activeChapter ? " current" : ""}${progress.opened.includes(index) ? " visited" : ""}`;
    dot.setAttribute("aria-hidden", "true");
    stepDots.append(dot);
  });
};

const renderLesson = () => {
  const chapter = chapters[activeChapter];
  const chapterVerses = versesForChapter(activeChapter);
  const verse = chapterVerses[activeVerse];
  const globalVerseIndex = verses.indexOf(verse);
  previousButton.disabled = globalVerseIndex === 0;
  nextButton.disabled = globalVerseIndex === verses.length - 1;
  lessonLabel.innerHTML = `CHAPTER ${String(activeChapter + 1).padStart(2, "0")} <span>·</span> ${chapter.title.toLocaleUpperCase()}`;
  lessonContent.replaceChildren();

  const heading = document.createElement("div");
  heading.className = "lesson-heading";
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = `A study in ${chapter.title.toLocaleLowerCase()}`;
  const title = document.createElement("h2");
  title.textContent = activeChapter === 0 ? "A question that opens the way." : chapter.subtitle + ".";
  const intro = document.createElement("p");
  intro.className = "lesson-intro";
  intro.textContent = activeChapter === 0
    ? "King Janaka asks the sage Ashtavakra how knowledge, freedom, and dispassion may be found."
    : `Explore ${chapter.subtitle.toLocaleLowerCase()} through the verses and reflections in this chapter.`;
  heading.append(eyebrow, title, intro);
  lessonContent.append(heading);

  const verseCard = document.createElement("article");
  verseCard.className = "verse-card";

  const verseMeta = document.createElement("div");
  verseMeta.className = "verse-meta";
  const verseNumber = document.createElement("span");
  verseNumber.textContent = `VERSE ${verse.chapter}.${verse.verse}`;
  const rule = document.createElement("span");
  rule.className = "verse-rule";
  rule.setAttribute("aria-hidden", "true");
  const count = document.createElement("span");
  count.textContent = `${String(globalVerseIndex + 1).padStart(3, "0")} / ${verses.length}`;
  verseMeta.append(verseNumber, rule, count);

  const sanskrit = document.createElement("p");
  sanskrit.className = "verse-sanskrit";
  sanskrit.lang = "sa";
  sanskrit.textContent = verse.sanskrit;

  const transliteration = document.createElement("p");
  transliteration.className = "verse-transliteration";
  transliteration.lang = "sa-Latn";
  transliteration.textContent = transliterate(verse.sanskrit);

  const translation = document.createElement("div");
  translation.className = "translation-block";
  const quotationMark = document.createElement("span");
  quotationMark.className = "translation-mark";
  quotationMark.setAttribute("aria-hidden", "true");
  quotationMark.textContent = "“";
  const rendering = document.createElement("p");
  rendering.textContent = renderings[`${verse.chapter}.${verse.verse}`] ?? "An English study rendering for this verse is being prepared.";
  translation.append(quotationMark, rendering);

  const note = document.createElement("p");
  note.className = "translation-note";
  const translationSource = document.createElement("a");
  translationSource.href = window.studyTranslationAttribution.sourceUrl;
  translationSource.target = "_blank";
  translationSource.rel = "noreferrer";
  translationSource.textContent = `Translation by ${window.studyTranslationAttribution.translator}`;
  note.append(translationSource, document.createTextNode(` · ${window.studyTranslationAttribution.license}`));
  verseCard.append(verseMeta, sanskrit, transliteration, translation, note);
  lessonContent.append(verseCard);

  const reflection = document.createElement("div");
  reflection.className = "reflection";
  const reflectionIcon = document.createElement("span");
  reflectionIcon.className = "reflection-icon";
  reflectionIcon.setAttribute("aria-hidden", "true");
  reflectionIcon.textContent = "✧";
  const reflectionCopy = document.createElement("div");
  const reflectionTitle = document.createElement("p");
  reflectionTitle.className = "reflection-title";
  reflectionTitle.textContent = "Sit with this";
  const reflectionPrompt = document.createElement("p");
  reflectionPrompt.textContent = activeChapter === 0 && activeVerse === 0
    ? "What does freedom mean to you—not as an idea, but in your experience right now?"
    : "Read the verse once more, then notice what it invites you to question in your own experience.";
  reflectionCopy.append(reflectionTitle, reflectionPrompt);
  reflection.append(reflectionIcon, reflectionCopy);
  lessonContent.append(reflection);
};

const selectVerse = (chapterIndex, verseIndex) => {
  activeChapter = chapterIndex;
  activeVerse = verseIndex;
  progress.lastChapter = chapterIndex;
  progress.lastVerse = verseIndex;
  if (!progress.opened.includes(chapterIndex)) progress.opened.push(chapterIndex);
  saveProgress();
  renderChapterList();
  renderDots();
  renderLesson();
};

const selectChapter = (index) => selectVerse(index, 0);

const moveVerse = (offset) => {
  const currentIndex = verses.findIndex((verse) => verse.chapter === activeChapter + 1 && verse.verse === activeVerse + 1);
  const nextVerse = verses[currentIndex + offset];
  if (nextVerse) selectVerse(nextVerse.chapter - 1, nextVerse.verse - 1);
};

const transliterate = (text) => {
  const independentVowels = new Map([
    ["अ", "a"], ["आ", "ā"], ["इ", "i"], ["ई", "ī"], ["उ", "u"], ["ऊ", "ū"],
    ["ऋ", "ṛ"], ["ॠ", "ṝ"], ["ऌ", "ḷ"], ["ए", "e"], ["ऐ", "ai"], ["ओ", "o"], ["औ", "au"]
  ]);
  const consonants = new Map([
    ["क", "k"], ["ख", "kh"], ["ग", "g"], ["घ", "gh"], ["ङ", "ṅ"], ["च", "c"], ["छ", "ch"],
    ["ज", "j"], ["झ", "jh"], ["ञ", "ñ"], ["ट", "ṭ"], ["ठ", "ṭh"], ["ड", "ḍ"], ["ढ", "ḍh"],
    ["ण", "ṇ"], ["त", "t"], ["थ", "th"], ["द", "d"], ["ध", "dh"], ["न", "n"], ["प", "p"],
    ["फ", "ph"], ["ब", "b"], ["भ", "bh"], ["म", "m"], ["य", "y"], ["र", "r"], ["ल", "l"],
    ["व", "v"], ["श", "ś"], ["ष", "ṣ"], ["स", "s"], ["ह", "h"]
  ]);
  const vowelSigns = new Map([
    ["ा", "ā"], ["ि", "i"], ["ी", "ī"], ["ु", "u"], ["ू", "ū"], ["ृ", "ṛ"], ["ॄ", "ṝ"],
    ["ॢ", "ḷ"], ["े", "e"], ["ै", "ai"], ["ो", "o"], ["ौ", "au"]
  ]);
  let output = "";
  let consonantPending = false;
  for (const character of text) {
    if (consonants.has(character)) {
      if (consonantPending) output += "a";
      output += consonants.get(character);
      consonantPending = true;
    } else if (vowelSigns.has(character)) {
      output += vowelSigns.get(character);
      consonantPending = false;
    } else if (character === "्") {
      consonantPending = false;
    } else if (independentVowels.has(character)) {
      if (consonantPending) output += "a";
      output += independentVowels.get(character);
      consonantPending = false;
    } else {
      if (consonantPending) output += "a";
      consonantPending = false;
      output += new Map([
        ["ं", "ṃ"], ["ँ", "m̐"], ["ः", "ḥ"], ["ऽ", "’"], ["।", " |"], ["॥", " ||"],
        ["़", ""], ["ॐ", "oṃ"]
      ]).get(character) ?? character;
    }
  }
  if (consonantPending) output += "a";
  return output.replace(/\s+/g, " ").trim();
};

chapterSearch.addEventListener("input", renderChapterList);
chapterSearch.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    chapterSearch.value = "";
    renderChapterList();
    chapterSearch.blur();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== chapterSearch && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    chapterSearch.focus();
  }
});

previousButton.addEventListener("click", () => moveVerse(-1));
nextButton.addEventListener("click", () => moveVerse(1));
resetButton.addEventListener("click", () => {
  if (!progress.opened.length) {
    announce("No study progress to reset yet.");
    return;
  }
  progress = { opened: [], lastChapter: 0, lastVerse: 0 };
  activeChapter = 0;
  activeVerse = 0;
  saveProgress();
  renderChapterList();
  renderDots();
  renderLesson();
  announce("Your study progress has been reset.");
});

activeChapter = progress.lastChapter;
activeVerse = progress.lastVerse;
if (!progress.opened.includes(activeChapter)) progress.opened.push(activeChapter);
saveProgress();
renderChapterList();
renderDots();
renderLesson();
