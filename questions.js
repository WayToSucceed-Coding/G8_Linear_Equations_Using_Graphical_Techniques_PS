var questions = [];
var i = 0;
var count = 0;
var score = 0;
var Ansgiven = [];
var previousQuestionIndex = null;
var topicName = "";
const submitSound = document.getElementById("submit-sound");

const uniqueKey = "G8_Solving Linear Equations Using Graphical Techniques";

// ─── LocalStorage helpers ─────────────────────────────────────────────────────
function saveToLocalStorage(key, value) {
  let storageData = JSON.parse(localStorage.getItem(uniqueKey)) || {};
  storageData[key] = value;
  localStorage.setItem(uniqueKey, JSON.stringify(storageData));
}

function getFromLocalStorage(key) {
  let storageData = JSON.parse(localStorage.getItem(uniqueKey)) || {};
  return storageData[key];
}

// ─── Fetch questions ──────────────────────────────────────────────────────────
fetch("questions.json")
  .then((response) => response.json())
  .then((data) => {
    const urlParams = new URLSearchParams(window.location.search);
    topicName = urlParams.get("topic");

    const selectedTopic = data.topics.find((t) => t.heading === topicName);

    if (selectedTopic) {
      questions = selectedTopic.questions;
      count = questions.length;

      const savedAnswers = getFromLocalStorage("Ansgiven");
      if (
        savedAnswers &&
        Array.isArray(savedAnswers) &&
        savedAnswers.length === count
      ) {
        Ansgiven = savedAnswers;
      } else {
        Ansgiven = new Array(count).fill(null);
      }

      saveToLocalStorage(topicName + "_totalQuestions", count);
      document.getElementById("heading").innerText = topicName || "PS";

      const savedIndex = getFromLocalStorage("currentQuestionIndex");
      if (
        savedIndex !== undefined &&
        savedIndex !== null &&
        savedIndex < count
      ) {
        i = savedIndex;
      }

      loadButtons();
      loadQuestion(i);

      const topics = JSON.parse(localStorage.getItem("topics")) || [];
      if (!topics.find((t) => t.heading === topicName)) {
        topics.push(selectedTopic);
        saveToLocalStorage("topics", topics);
      }
    } else {
      document.getElementById("heading").innerText = "Topic not found";
      document.getElementById("buttonContainer").innerHTML =
        "No questions available for this topic.";
    }
  });

// ─── Question buttons ─────────────────────────────────────────────────────────
function loadButtons() {
  var buttonContainer = document.getElementById("buttonContainer");
  buttonContainer.innerHTML = "";
  for (var j = 0; j < questions.length; j++) {
    var btn = document.createElement("button");
    btn.className = "btnButton btn smallbtn";
    btn.innerHTML = "Q" + (j + 1);
    btn.setAttribute("onclick", "abc(" + (j + 1) + ")");
    if (getFromLocalStorage(topicName + "_completed")) {
      btn.classList.add("disabled-btn");
      btn.disabled = true;
    }
    buttonContainer.appendChild(btn);
  }
  updateButtonStyles();
}

// ─── NEW: render a fraction numerator/denominator which may be array (nested) ─
// ── NEW: a text segment may itself contain ___dropdown___ tokens ──
// Uses the same window.__currentDropdown* cursor as the array branch below,
// so selects are consumed in DOM order and line up with the answer array.
// Returns the text unchanged when there is no token, so nothing else moves.
function renderFractionDropdownText(text) {
  if (text.indexOf("___dropdown___") === -1) return `<span>${text}</span>`;
  const segs = text.split("___dropdown___");
  let out = "";
  segs.forEach((seg, idx) => {
    if (seg) out += `<span>${seg}</span>`;
    if (idx < segs.length - 1) {
      const ddList = window.__currentDropdownList__;
      const ddIdx = window.__currentDropdownIndex__ || 0;
      if (ddList && ddList[ddIdx]) {
        window.__currentDropdownIndex__ = ddIdx + 1;
        let sel = `<select class="answer-input" style="height:36px;font-size:0.85em;padding:2px 4px;border-radius:6px;border:2px solid #444;background:white;margin:0 3px;">`;
        sel += `<option value=""></option>`;
        ddList[ddIdx].forEach((opt) => {
          sel += `<option value="${opt}">${opt}</option>`;
        });
        sel += `</select>`;
        out += sel;
      } else {
        out += `<span>___dropdown___</span>`;
      }
    }
  });
  return out;
}
// ── END NEW ──

// ── NEW: tall bracket that scales to the height of a fraction ──
// JSON:  { "bracket": "(" }              default height, fits one fraction
//        { "bracket": "(", "scale": 4 }  taller/shorter (multiplier of font size)
// Works for any character: ( ) [ ] { } | etc.
// Height comes mostly from a vertical stretch rather than a large font-size,
// because scaling the font up thickens the stroke too. Same height, thin line.
//   { "bracket": "(", "scale": 4 }        taller / shorter
//   { "bracket": "(", "color": "#999" }   lighter / darker
function renderBracketHTML(part) {
  const scale = part.scale || 3;
  const fontSize = (scale * 0.6).toFixed(2);
  const color = part.color || "black";
  return (
    `<span style="display:inline-flex;align-items:center;justify-content:center;` +
    `font-size:${fontSize}em;line-height:1;font-weight:300;color:${color};` +
    `transform:scaleY(1.667);transform-origin:center;` +
    `vertical-align:middle;margin:0 6px;">` +
    `${part.bracket}</span>`
  );
}
// ── END NEW ──

function renderFractionPart(value, color) {
  if (typeof value === "string") {
    if (value.indexOf("______") !== -1) {
      let parts = value.split("______");
      let html = "";
      parts.forEach((part, idx) => {
        if (part) html += renderFractionDropdownText(part);
        if (idx < parts.length - 1) {
          html += `<input type="text" class="answer-input"
            style="width:80px;height:36px;font-size:0.9em;border:2px solid #ccc;
            border-radius:6px;text-align:center;background:white;outline:none;padding:4px;"/>`;
        }
      });
      return html;
    }
    if (value.indexOf("___dropdown___") !== -1) {
      return renderFractionDropdownText(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          if (item.indexOf("______") !== -1) {
            let parts = item.split("______");
            let html = "";
            parts.forEach((part, idx) => {
              if (part) html += `<span>${part}</span>`;
              if (idx < parts.length - 1) {
                html += `<input type="text" class="answer-input"
                style="width:80px;height:36px;font-size:0.9em;border:2px solid #ccc;
                border-radius:6px;text-align:center;background:white;outline:none;padding:4px;"/>`;
              }
            });
            return html;
          }
          // ── NEW: dropdown inside fraction numerator/denominator ──
          if (
            item.trim() === "___dropdown___" ||
            item.indexOf("___dropdown___") !== -1
          ) {
            const ddList = window.__currentDropdownList__;
            const ddIdx = window.__currentDropdownIndex__ || 0;
            if (ddList && ddList[ddIdx]) {
              window.__currentDropdownIndex__ = ddIdx + 1;
              let sel = `<select class="answer-input" style="height:36px;font-size:0.85em;padding:2px 4px;border-radius:6px;border:2px solid #444;background:white;margin:0 3px;">`;
              sel += `<option value=""></option>`;
              ddList[ddIdx].forEach((opt) => {
                sel += `<option value="${opt}">${opt}</option>`;
              });
              sel += `</select>`;
              return sel;
            }
            return item;
          }
          // ── END NEW ──
          return item;
        }
        if (item.fraction) return renderFractionPartHTML(item.fraction);
        if (item.root) return renderRoot(item.root, color || "currentColor");
        if (item.power) {
          const { baseInputId, exponentInputId } = item.power;
          return `<span style="position:relative;display:inline-flex;vertical-align:middle;margin:0 4px;">
  <input type="text" id="${baseInputId}" class="answer-input"
    style="width:55px;height:45px;font-size:1.1em;border:2px solid #667eea;border-radius:6px;text-align:center;background:white;outline:none;padding:0px;"/>
  <input type="text" id="${exponentInputId}" class="answer-input"
    style="width:28px;height:24px;font-size:0.72em;border:2px solid #667eea;border-radius:4px;
    position:absolute;top:-22px;right:-28px;padding:0;text-align:center;background:white;outline:none;"/>
</span>`;
        }
        return "";
      })
      .join("");
  }
  if (value && typeof value === "object" && value.power) {
    const { baseInputId, exponentInputId } = value.power;
    return `<span style="position:relative;display:inline-flex;vertical-align:middle;margin:0 4px;">
  <input type="text" id="${baseInputId}" class="answer-input"
    style="width:55px;height:45px;font-size:1.1em;border:2px solid #667eea;border-radius:6px;text-align:center;background:white;outline:none;padding:0;"/>
  <input type="text" id="${exponentInputId}" class="answer-input"
    style="width:28px;height:24px;font-size:0.72em;border:2px solid #667eea;border-radius:4px;
    position:absolute;top:-1px;right:-28px;padding:0;text-align:center;background:white;outline:none;"/>
</span>`;
  }
  return String(value);
}

function renderFractionPartHTML(fractionObj) {
  const { whole, numerator, denominator } = fractionObj;
  const numHTML = renderFractionPart(numerator, "currentColor");
  const denHTML = renderFractionPart(denominator, "currentColor");
  let html =
    '<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 8px;font-size:0.85em;color:inherit;">';
  if (whole !== undefined && whole !== "") {
    html =
      `<span style="display:inline-flex;align-items:center;vertical-align:middle;gap:2px;color:inherit;">
      <span style="color:inherit;">${whole}</span>` + html;
  }
  html += `<span style="display:inline-flex;align-items:center;justify-content:center;padding:0;overflow:visible;">${numHTML}</span>
<span style="width:100%;border-top:3px solid black;margin:0;display:block;"></span>
<span style="display:inline-flex;align-items:center;justify-content:center;padding:0;overflow:visible;">${denHTML}</span>
</span>`;
  if (whole !== undefined && whole !== "") {
    html += "</span>";
  }
  return html;
}

function renderPowerStep(psObj) {
  const { base, fracNum, fracDen } = psObj;
  const fracHTML = `<span style="display:inline-flex;flex-direction:column;align-items:center;
    font-size:0.75em;vertical-align:middle;margin:0 2px;">
    <span style="padding:0 3px;">${fracNum}</span>
    <span style="border-top:1.5px solid currentColor;padding:0 3px;">${fracDen}</span>
  </span>`;

  return `
  <span style="display:inline-flex;align-items:baseline;vertical-align:middle;margin:0 2px;">
    <span style="font-size:1.8em;font-weight:bold;line-height:1;">${base}</span>
    <span style="font-size:0.85em;position:relative;top:-20px;">
      (${fracHTML} × <input type="text" class="super-input answer-input" autocomplete="off"
        style="width:28px;height:22px;font-size:1em;border:2px solid #667eea;border-radius:4px;
        text-align:center;background:white;outline:none;padding:0;"/>)
    </span>
  </span>
  <span style="font-size:1.4em;font-weight:bold;margin:0 6px;vertical-align:middle;">=</span>
  <span style="display:inline-flex;align-items:baseline;vertical-align:middle;margin:0 2px;">
    <span style="font-size:1.8em;font-weight:bold;line-height:1;">${base}</span>
    <span style="font-size:0.85em;position:relative;top:-20px;">
      <input type="text" class="super-input answer-input" autocomplete="off"
        style="width:28px;height:22px;font-size:1em;border:2px solid #667eea;border-radius:4px;
        text-align:center;background:white;outline:none;padding:0;"/>
    </span>
  </span>`;
}
// ─── NEW: renderRoot ──────────────────────────────────────────────────────────
function renderRoot(rootObj, overrideColor) {
  const { index, value, coeff, inputId, nested } = rootObj;
  const rootColor = overrideColor || "#1a2a4a";
  const textColor = overrideColor || "#222";

  // NEW: nested root support (e.g. 4th root of square root of 128)
  if (nested) {
    const innerHTML = renderRoot(nested.root || nested, overrideColor);
    const indexHTML =
      index && index !== 2
        ? `<span style="font-size:0.8em;font-weight:bold;color:${rootColor};position:relative;top:-12px;margin-right:-2px;">${index}</span>`
        : "";
    return `<span style="display:inline-flex;align-items:flex-end;vertical-align:middle;margin:0 4px;color:${textColor};">
      <span style="display:inline-flex;align-items:center;vertical-align:middle;margin:0 3px;position:relative;">
        ${indexHTML}
        <span style="font-size:1.6em;font-family:serif;line-height:1;color:${rootColor};margin-right:-2px;position:relative;top:4px;">√</span>
        <span style="border-top:2.5px solid ${rootColor};display:inline-flex;align-items:center;padding:2px 6px 2px 4px;white-space:nowrap;margin-top:4px;">
          ${innerHTML}
        </span>
      </span>
    </span>`;
  }

  if (value !== undefined && !inputId) {
    const coeffHTML = coeff
      ? `<span style="font-weight:bold;color:${textColor}">${coeff}</span>`
      : "";
    const indexHTML =
      index && index !== 2
        ? `<span style="font-size:0.8em;font-weight:bold;color:${rootColor};position:relative;top:-12px;margin-right:-2px;">${index}</span>`
        : "";
    return `<span style="display:inline-flex;align-items:flex-end;vertical-align:middle;margin:0 4px;color:${textColor};">
      ${coeffHTML}
      <span style="display:inline-flex;align-items:center;vertical-align:middle;margin:0 3px;position:relative;">
        ${indexHTML}
        <span style="font-size:1.6em;font-family:serif;line-height:1;color:${rootColor};margin-right:-2px;position:relative;top:4px;">√</span>
        <span style="border-top:2.5px solid ${rootColor};display:inline-flex;align-items:center;padding:9px 6px 2px 4px;white-space:nowrap;margin-top:4px;">
          <span style="font-size:1em;font-weight:bold;padding:0 3px;color:${textColor};">${value}</span>
        </span>
      </span>
    </span>`;
  }

  if (inputId) {
    let indexHTML = "";
    if (rootObj.indexInputId) {
      indexHTML = `<input type="text" id="${rootObj.indexInputId}" class="answer-input" autocomplete="off"
        style="width:28px;height:24px;font-size:0.75em;border:2px solid #1a2a4a;border-radius:4px;
        position:relative;top:-10px;margin-right:-3px;z-index:1;text-align:center;
        background:white;outline:none;padding:0;"/>`;
    } else if (rootObj.index && rootObj.index !== 2) {
      indexHTML = `<span style="font-size:0.8em;font-weight:bold;color:#1a2a4a;position:relative;top:-12px;margin-right:-2px;">${rootObj.index}</span>`;
    }
    return `<span class="sqrt-wrapper" style="align-items:flex-end;">
      ${indexHTML}
      <span class="sqrt-radical">√</span>
      <span class="sqrt-content">
        <input type="text" id="${inputId}" class="answer-input" autocomplete="off" style="width:80px;height:36px;text-align:center;" />
      </span>
    </span>`;
  }

  return "";
}

// ─── NEW: renderPowerFrac ─────────────────────────────────────────────────────
function renderPowerFrac(pfObj) {
  const { baseInputId, numInputId, denInputId, fixedBase, fixedNum, fixedDen } =
    pfObj;

  const numHTML = fixedNum
    ? `<span style="font-size:1em;font-weight:bold;">${fixedNum}</span>`
    : `<input type="text" id="${numInputId}" class="answer-input" autocomplete="off"
        style="width:30px;height:22px;font-size:0.8em;padding:0;margin:0;border:2px solid #ccc;border-radius:4px;text-align:center;background:white;outline:none;"/>`;

  const denHTML = fixedDen
    ? `<span style="font-size:1em;font-weight:bold;">${fixedDen}</span>`
    : `<input type="text" id="${denInputId}" class="answer-input" autocomplete="off"
        style="width:30px;height:22px;font-size:0.8em;padding:0;margin:0;border:2px solid #ccc;border-radius:4px;text-align:center;background:white;outline:none;"/>`;

  const baseHTML = fixedBase
    ? `<span style="font-size:1.1em;font-weight:bold;">${fixedBase}</span>`
    : `<input type="text" id="${baseInputId}" class="answer-input" autocomplete="off"
        style="width:55px;height:45px;font-size:1.1em;border:2px solid #ccc;border-radius:8px;text-align:center;background:white;outline:none;"/>`;

  return `<span style="display:inline-flex;align-items:flex-start;vertical-align:middle;margin:0 8px;">
    ${baseHTML}
    <span style="display:inline-flex;flex-direction:column;align-items:center;
      font-size:0.5em;margin-left:3px;margin-top:-20px;gap:3px;line-height:1.2;">
      ${numHTML}
      <span style="width:100%;min-width:28px;height:2px;background:#444;display:block;margin:3px 0;"></span>
      ${denHTML}
    </span>
  </span>`;
}

function renderFracPow(fpObj) {
  const { numerator, denominator, power, whole } = fpObj;
  const wholeHTML = whole
    ? `<span style="font-size:1.1em;font-weight:bold;margin-right:3px;">${whole}</span>`
    : "";
  const fracHTML = `<span style="display:inline-flex;align-items:center;vertical-align:middle;">
    <span style="font-size:2em;font-weight:300;margin-right:1px;">(</span>
    <span style="display:inline-flex;flex-direction:column;align-items:center;font-size:1em;">
      <span>${numerator}</span>
      <span style="border-top:2px solid currentColor;width:100%;margin:1px 0;"></span>
      <span>${denominator}</span>
    </span>
    <span style="font-size:2em;font-weight:300;margin-left:1px;">)</span>
  </span>`;
  const powerHTML = power
    ? `<span style="font-size:0.6em;font-weight:bold;position:relative;top:-2px;margin-left:0px;">${power}</span>`
    : "";
  return `<span style="display:inline-flex;align-items:flex-start;vertical-align:middle;">
    ${wholeHTML}${fracHTML}${powerHTML}
  </span>`;
}

// ─── Render fraction in question text ────────────────────────────────────────
function renderQuestionText(questionParts, questionElement) {
  questionElement.innerHTML = "";
  questionParts.forEach((part) => {
    if (typeof part === "string") {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = part;
      if (part.includes("<") && part.includes(">")) {
        while (tempDiv.firstChild)
          questionElement.appendChild(tempDiv.firstChild);
      } else {
        questionElement.appendChild(document.createTextNode(part));
      }
    } else if (part.fraction) {
      const span = document.createElement("span");
      span.innerHTML = renderFractionPartHTML(part.fraction);
      questionElement.appendChild(span);
      // NEW: root and powerFrac support in question text
    } else if (part.bracket) {
      const span = document.createElement("span");
      span.innerHTML = renderBracketHTML(part);
      questionElement.appendChild(span);
    } else if (part.root) {
      const span = document.createElement("span");
      span.innerHTML = renderRoot(part.root);
      questionElement.appendChild(span);
    } else if (part.powerFrac) {
      const span = document.createElement("span");
      span.innerHTML = renderPowerFrac(part.powerFrac);
      questionElement.appendChild(span);
    } else if (part.fracPow) {
      const span = document.createElement("span");
      span.innerHTML = renderFracPow(part.fracPow);
      questionElement.appendChild(span);
    } else if (part.powerStep) {
      const span = document.createElement("span");
      span.innerHTML = renderPowerStep(part.powerStep);
      questionElement.appendChild(span);
    } else if (part.power) {
      const span = document.createElement("span");
      const { baseInputId, exponentInputId } = part.power;
      span.innerHTML = `<span style="position:relative;display:inline-flex;vertical-align:middle;margin:0 4px;">
    <input type="text" id="${baseInputId}" class="answer-input"
      style="width:55px;height:45px;font-size:1.1em;border:2px solid rgb(204, 204, 204);;border-radius:6px;text-align:center;background:white;outline:none;padding:0;"/>
    <input type="text" id="${exponentInputId}" class="answer-input"
      style="width:30px;height:25px;font-size:0.75em;border:2px solid rgb(204, 204, 204);;border-radius:4px;
      position:absolute;top:-18px;right:-29px;padding:0;text-align:center;background:white;outline:none;"/>
  </span>`;
      questionElement.appendChild(span);
    } else if (part.fractionPower) {
      const span = document.createElement("span");
      const { numerator, denominator, power } = part.fractionPower;
      span.innerHTML = `<span style="display:inline-flex;align-items:flex-start;vertical-align:middle;margin:0 6px;">
    <span style="font-size:2em;font-weight:100;line-height:1;align-self:center;">(</span>
    <span style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;margin:0 2px;">
      <span style="font-size:1em;line-height:1.2;">${numerator}</span>
      <span style="width:100%;height:2.5px;background:#222;margin:2px 0;display:block;"></span>
      <span style="font-size:1em;line-height:1.2;">${denominator}</span>
    </span>
    <span style="font-size:2em;font-weight:300;line-height:1;align-self:center;">)</span>
    <span style="font-size:0.7em;font-weight:bold;align-self:flex-start;margin-top:2px;margin-left:1px;">${power}</span>
  </span>`;
      questionElement.appendChild(span);
    }
  });
}

// ─── Main question loader ─────────────────────────────────────────────────────
function loadQuestion(index) {
  var randomQuestion = questions[index];
  if (!randomQuestion) {
    console.error("No question found at index:", index);
    return;
  }

  var questionElement = document.getElementById("question");
  var optionsElement = document.getElementById("options");
  optionsElement.innerHTML = "";

  // Show question image
  var picDiv = document.getElementById("picdiv");
  picDiv.innerHTML = "";
  if (randomQuestion.image) {
    document.querySelector(".question-image-area").style.display = "block";
    picDiv.style.display = "flex";
    document.querySelector(".question-content").style.display = "flex";
    var img = document.createElement("img");
    img.src = randomQuestion.image;
    img.alt = "Question Image";
    img.style.cssText =
      "max-width:100%;max-height:300px;object-fit:contain;border-radius:8px;";
    picDiv.appendChild(img);
  } else {
    picDiv.style.display = "none";
    document.querySelector(".question-image-area").style.display = "none";
    document.querySelector(".question-content").style.display = "block";
  }

  // ── DIAGRAM question ──────────────────────────────────────────────────────
  if (randomQuestion.diagram) {
    if (Array.isArray(randomQuestion.question)) {
      renderQuestionText(randomQuestion.question, questionElement);
    } else {
      questionElement.innerHTML = randomQuestion.question;
    }
    loadDiagramQuestion(randomQuestion, optionsElement, index);

    // ── INPUT question ────────────────────────────────────────────────────────
  } else if (randomQuestion.type === "hybrid") {
    // Show introductory text in #question (everything before the first expression line)
    var hybridQuestionText = Array.isArray(randomQuestion.question)
      ? randomQuestion.question[0]
      : randomQuestion.question;
    if (typeof hybridQuestionText === "string") {
      var firstBreak = hybridQuestionText.indexOf("<br><br>");
      if (firstBreak === -1) firstBreak = hybridQuestionText.indexOf("<br>");
      var headingPart =
        firstBreak > -1
          ? hybridQuestionText.substring(0, firstBreak)
          : hybridQuestionText;
      questionElement.innerHTML = headingPart;
    } else {
      questionElement.innerHTML = "";
    }
    loadHybridQuestion(randomQuestion, optionsElement, index);
  } else if (randomQuestion.input && Array.isArray(randomQuestion.input)) {
    questionElement.innerHTML = "";
    // ── NEW: expose dropdown list for renderFractionPart ──
    window.__currentDropdownList__ = randomQuestion.dropdown || null;
    window.__currentDropdownIndex__ = 0;
    // ── END NEW ──
    loadInputQuestion(randomQuestion, optionsElement, index);

    // ── MCQ question ──────────────────────────────────────────────────────────
  } else {
    if (Array.isArray(randomQuestion.question)) {
      renderQuestionText(randomQuestion.question, questionElement);
    } else {
      questionElement.innerHTML = randomQuestion.question;
    }
    loadOptionQuestion(randomQuestion, optionsElement, index);
  }

  updateButtonVisibility();
  updateButtonStyles();
  updateButtonText();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DIAGRAM QUESTION
// ═══════════════════════════════════════════════════════════════════════════════
function loadHybridQuestion(randomQuestion, optionsElement, index) {
  optionsElement.innerHTML = "";
  optionsElement.style.display = "flex";
  optionsElement.style.flexDirection = "column";
  optionsElement.style.alignItems = "center";
  optionsElement.classList.add("input-question");

  var questionContainer = document.createElement("div");
  questionContainer.className = "question-container";
  questionContainer.style.cssText =
    "display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:5px;font-size:1.5em;text-align:center;";

  // Strip the heading sentence (already shown in #question above) from the first string part
  var processedQuestion = randomQuestion.question.map((part, partIdx) => {
    if (partIdx === 0 && typeof part === "string") {
      var firstBreak = part.indexOf("<br><br>");
      if (firstBreak !== -1) {
        return part.substring(firstBreak + 8); // skip "<br><br>"
      }
      var singleBreak = part.indexOf("<br>");
      if (singleBreak !== -1) {
        return part.substring(singleBreak + 4); // skip "<br>"
      }
    }
    return part;
  });

  let inputIndex = 0;
  let localDropdownIndex = 0;
  processedQuestion.forEach((part) => {
    if (typeof part === "string") {
      let tokens = part
        .split(/(______| ?___dropdown___ ?)/)
        .filter((t) => t !== undefined && t !== "");
      tokens.forEach((token) => {
        const t = token.trim();
        if (t === "______") {
          if (inputIndex < randomQuestion.input.length) {
            addInputField(questionContainer, randomQuestion.input[inputIndex]);
            inputIndex++;
          }
        } else if (t === "___dropdown___") {
          if (
            randomQuestion.dropdown &&
            localDropdownIndex < randomQuestion.dropdown.length
          ) {
            const sel = document.createElement("select");
            sel.className = "answer-input";
            sel.style.cssText =
              "height:45px;font-size:0.8em;padding:5px;border-radius:6px;border:2px solid #444;text-align:center;margin:0 4px;";
            const defaultOpt = document.createElement("option");
            defaultOpt.value = "";
            defaultOpt.textContent = "";
            sel.appendChild(defaultOpt);
            randomQuestion.dropdown[localDropdownIndex].forEach((optVal) => {
              const o = document.createElement("option");
              o.value = optVal;
              o.textContent = optVal;
              sel.appendChild(o);
            });
            sel.addEventListener("change", handleInputAnswerChange);
            questionContainer.appendChild(sel);
            localDropdownIndex++;
            inputIndex++;
          }
        } else {
          if (token.includes("<br>")) {
            token.split("<br>").forEach((brPart, brIdx, arr) => {
              if (brPart.trim()) {
                let span = document.createElement("span");
                span.innerHTML = brPart;
                questionContainer.appendChild(span);
              }
              if (brIdx < arr.length - 1) {
                questionContainer.appendChild(document.createElement("br"));
                let lb = document.createElement("div");
                lb.style.cssText = "flex-basis:100%;height:0;";
                questionContainer.appendChild(lb);
              }
            });
          } else {
            let span = document.createElement("span");
            span.innerHTML = token;
            questionContainer.appendChild(span);
          }
        }
      });
    }
  });

  optionsElement.appendChild(questionContainer);

  // Option buttons below
  var optionsList = document.createElement("ul");
  optionsList.style.cssText =
    "list-style:none;padding:0;margin-top:16px;display:grid;grid-template-columns:repeat(2,1fr);gap:20px;width:100%;";
  optionsList.classList.add("text-only");

  randomQuestion.options.forEach((option, idx) => {
    var li = document.createElement("li");
    li.classList.add("option-container");
    var radioButton = document.createElement("input");
    radioButton.type = "radio";
    radioButton.name = "hybrid-answer";
    radioButton.value = idx;
    radioButton.style.display = "none";

    var btn = document.createElement("button");
    btn.className = "btnOption";
    btn.style.fontSize = "1.4em";
    btn.innerHTML = option.text || option;
    btn.onclick = function () {
      radioButton.checked = true;
      document.querySelectorAll(".btnOption").forEach((b) => {
        b.style.backgroundColor = "";
        b.style.border = "";
      });
      btn.style.backgroundColor = "#e3f2fd";
      btn.style.border = "2px solid #007bff";
      btn.style.color = "black";
      handleInputAnswerChange();
    };

    li.appendChild(btn);
    li.appendChild(radioButton);
    optionsList.appendChild(li);
  });

  optionsElement.appendChild(optionsList);

  questionContainer.querySelectorAll(".answer-input").forEach((input) => {
    input.addEventListener("input", handleInputAnswerChange);
    input.addEventListener("keyup", (e) => {
      if (e.key === "Enter") checkAnswer();
    });
  });

  // Restore previous answers
  var prev = Ansgiven[index];
  if (prev && typeof prev === "object" && !Array.isArray(prev)) {
    if (prev.inputs && Array.isArray(prev.inputs)) {
      let inputs = questionContainer.querySelectorAll(".answer-input");
      inputs.forEach((input, idx) => {
        if (prev.inputs[idx] !== undefined) input.value = prev.inputs[idx];
        autoGrow(input);
      });
    }
    if (prev.option !== null && prev.option !== undefined) {
      var radios = optionsList.querySelectorAll("input[type=radio]");
      if (radios[prev.option]) {
        radios[prev.option].checked = true;
        var btns = optionsList.querySelectorAll(".btnOption");
        if (btns[prev.option]) {
          btns[prev.option].style.backgroundColor = "#e3f2fd";
          btns[prev.option].style.border = "2px solid #007bff";
        }
      }
    }
  }
}
function buildDiagramHTML(d) {
  const op = d.op || "×";
  const aid = d.arrowId;
  let slotIdx = 0;
  const slots = d.slots || [];

  function slot(value, id, tx, ty, anchor, fontSize, rx, ry, rw, rh, iw, ih) {
    if (value !== "") {
      return `<text x="${tx}" y="${ty}" text-anchor="${anchor}" font-size="52" font-weight="bold" fill="#111">${value}</text>`;
    } else {
      const sid = slots[slotIdx++] || id;
      return `
      <rect id="rect-${sid}" x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="8" ry="8" fill="white" stroke="#444" stroke-width="3"/>
      <foreignObject x="${rx}" y="${ry}" width="${rw}" height="${rh}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${rw}px;height:${rh}px;display:flex;align-items:center;justify-content:center;">
          <input type="text" id="${sid}" class="diagram-input answer-input" autocomplete="off"
            style="width:${iw}px;height:${ih}px;border:none;outline:none;font-size:${fontSize}px;font-weight:bold;text-align:center;background:transparent;"/>
        </div>
      </foreignObject>`;
    }
  }

  function labelSlot(value, fallbackId, tx, ty, anchor, rx, ry) {
    if (value !== "") {
      return `<text x="${tx}" y="${ty}" text-anchor="${anchor}" font-size="20" font-weight="bold" fill="#222">${op} ${value}</text>`;
    } else {
      const sid = slots[slotIdx++] || fallbackId;
      return `
      <text x="202" y="${ty}" text-anchor="end" font-size="22" font-weight="bold" fill="#222">${op}</text>
      <rect id="rect-${sid}" x="207" y="${ry}" width="65" height="42" rx="7" ry="7" fill="white" stroke="#444" stroke-width="3"/>
      <foreignObject x="207" y="${ry}" width="65" height="42">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:65px;height:42px;display:flex;align-items:center;justify-content:center;">
          <input type="text" id="${sid}" class="diagram-input answer-input" autocomplete="off"
            style="width:55px;height:34px;border:none;outline:none;font-size:22px;font-weight:bold;text-align:center;background:transparent;"/>
        </div>
      </foreignObject>`;
    }
  }

  const fracNumSVG = slot(
    d.fracNum,
    "fn",
    58,
    85,
    "middle",
    62,
    12,
    38,
    80,
    60,
    70,
    48,
  );
  const fracDenSVG = slot(
    d.fracDen,
    "fd",
    58,
    170,
    "middle",
    62,
    12,
    125,
    80,
    60,
    70,
    48,
  );
  const topSVG = labelSlot(d.topLabel, "tl", 245, 22, "middle", 180, 2);
  const botSVG = labelSlot(d.botLabel, "bl", 245, 218, "middle", 180, 198);
  const resNumSVG = slot(
    d.resNum,
    "rn",
    432,
    85,
    "middle",
    25,
    390,
    38,
    80,
    60,
    70,
    48,
  );
  const resDenSVG = slot(
    d.resDen,
    "rd",
    432,
    170,
    "middle",
    25,
    390,
    116,
    80,
    60,
    70,
    48,
  );

  return `
  <div style="display:flex;justify-content:center;align-items:center;">
    <svg width="520" height="230" viewBox="0 0 520 230" style="overflow:visible;max-width:100%;">
      <defs>
        <marker id="atop-${aid}" markerWidth="10" markerHeight="10" refX="9" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L10,3.5 z" fill="#333"/>
        </marker>
        <marker id="abot-${aid}" markerWidth="10" markerHeight="10" refX="9" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L10,3.5 z" fill="#333"/>
        </marker>
      </defs>
      ${fracNumSVG}
      <line x1="12" y1="103" x2="104" y2="103" stroke="#111" stroke-width="5"/>
      ${fracDenSVG}
      <text x="245" y="128" text-anchor="middle" font-size="52" font-weight="bold" fill="#222">=</text>
      ${topSVG}
      <path d="M 108 78 Q 255 28 388 78" stroke="#333" stroke-width="2.8" fill="none" marker-end="url(#atop-${aid})"/>
      <path d="M 108 155 Q 255 205 388 155" stroke="#333" stroke-width="2.8" fill="none" marker-end="url(#abot-${aid})"/>
      ${botSVG}
      ${resNumSVG}
      <line x1="390" y1="108" x2="475" y2="108" stroke="#444" stroke-width="4"/>
      ${resDenSVG}
    </svg>
  </div>`;
}

function styleDiagramInput(elId, isCorrect) {
  const color = isCorrect ? "#4CAF50" : "#f44336";
  const bg = isCorrect ? "#d4edda" : "#f8d7da";
  const txt = isCorrect ? "#155724" : "#721c24";
  const el = document.getElementById(elId);
  if (!el) return;
  el.style.background = bg;
  el.style.color = txt;
  const fo = el.closest("foreignObject");
  if (fo) {
    let prev = fo.previousElementSibling;
    while (prev) {
      if (prev.tagName.toLowerCase() === "rect") {
        prev.setAttribute("stroke", color);
        prev.setAttribute("fill", bg);
        break;
      }
      prev = prev.previousElementSibling;
    }
  } else {
    el.style.borderColor = color;
  }
}

function loadDiagramQuestion(randomQuestion, optionsElement, index) {
  optionsElement.style.display = "flex";
  optionsElement.style.flexDirection = "column";
  optionsElement.style.alignItems = "center";
  optionsElement.classList.add("input-question");

  const d = randomQuestion.diagram;

  const diagramWrapper = document.createElement("div");
  diagramWrapper.className = "diagram-wrapper";
  diagramWrapper.innerHTML = buildDiagramHTML(d);
  optionsElement.appendChild(diagramWrapper);

  if (randomQuestion.hcf && randomQuestion.hcfId) {
    const hcfDiv = document.createElement("div");
    hcfDiv.style.cssText =
      "display:flex;align-items:center;gap:12px;margin-top:18px;font-size:1.6em;font-weight:900;";

    if (randomQuestion.hcfFixed) {
      hcfDiv.innerHTML = `<span style="font-style:italic;font-weight:900;">HCF =</span>
        <span style="font-weight:900;">${randomQuestion.hcfFixed}</span>`;
    } else {
      hcfDiv.innerHTML = `
        <span style="font-style:italic;font-weight:900;">HCF =</span>
        <input type="text" id="${randomQuestion.hcfId}" class="answer-input"
          style="width:65px;height:55px;border:3px solid #444;border-radius:8px;font-size:1em;font-weight:bold;text-align:center;outline:none;"
          autocomplete="off"/>`;
    }
    optionsElement.appendChild(hcfDiv);
  }

  optionsElement.querySelectorAll(".answer-input").forEach((input) => {
    input.addEventListener("input", handleInputAnswerChange);
    input.addEventListener("keyup", (e) => {
      if (e.key === "Enter") checkAnswer();
    });
  });

  const prev = Ansgiven[index];
  if (prev && Array.isArray(prev)) {
    const allInputs = optionsElement.querySelectorAll(".answer-input");
    allInputs.forEach((input, idx) => {
      if (prev[idx] !== undefined) input.value = prev[idx];
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INPUT QUESTION  (existing, with root/powerFrac support added)
// ═══════════════════════════════════════════════════════════════════════════════
function loadInputQuestion(randomQuestion, optionsElement, index) {
  optionsElement.innerHTML = "";
  optionsElement.style.display = "flex";
  optionsElement.style.flexDirection = "column";
  optionsElement.style.alignItems = "center";
  optionsElement.classList.add("input-question");

  var questionContainer = document.createElement("div");
  questionContainer.className = "question-container";
  questionContainer.style.cssText =
    "display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:5px;font-size:1.5em;text-align:center;";

  let inputIndex = 0;
  let localDropdownIndex = 0;

  if (Array.isArray(randomQuestion.question)) {
    randomQuestion.question.forEach((part) => {
      if (typeof part === "string") {
        let tokens = part
          .split(
            /(______)|( ?___dropdown___ ?)|( ?___sqrt___ ?)|( ?___super___ ?)/,
          )
          .filter((t) => t !== undefined && t !== "");
        tokens.forEach((token) => {
          const t = token.trim();
          if (t === "______") {
            if (inputIndex < randomQuestion.input.length) {
              addInputField(
                questionContainer,
                randomQuestion.input[inputIndex],
              );
              inputIndex++;
            }
          } else if (t === "___dropdown___") {
            if (
              randomQuestion.dropdown &&
              localDropdownIndex < randomQuestion.dropdown.length
            ) {
              const sel = document.createElement("select");
              sel.className = "answer-input";
              sel.style.cssText =
                "height:45px;font-size:0.8em;padding:5px;border-radius:6px;border:2px solid #444;text-align:center;margin:0 4px;";
              const defaultOpt = document.createElement("option");
              defaultOpt.value = "";
              defaultOpt.textContent = "";
              sel.appendChild(defaultOpt);
              randomQuestion.dropdown[localDropdownIndex].forEach((optVal) => {
                const o = document.createElement("option");
                o.value = optVal;
                o.textContent = optVal;
                sel.appendChild(o);
              });
              sel.addEventListener("change", handleInputAnswerChange);
              questionContainer.appendChild(sel);
              localDropdownIndex++;
              inputIndex++;
            }
          } else if (t === "___super___") {
            const span = document.createElement("span");
            span.style.cssText =
              "display:inline-flex;align-items:flex-start;vertical-align:middle;";
            span.innerHTML = `<input type="text" class="answer-input" autocomplete="off"
    style="width:35px;height:25px;font-size:0.65em;border:2px solid #667eea;
    border-radius:4px;text-align:center;background:white;outline:none;padding:0;
    position:relative;top:-18px;margin-left:1px;"/>`;
            const inp = span.querySelector("input");
            inp.addEventListener("input", handleInputAnswerChange);
            inp.addEventListener("keyup", (e) => {
              if (e.key === "Enter") checkAnswer();
            });
            questionContainer.appendChild(span);
            inputIndex++;
          } else if (t === "___sqrt___") {
            const span = document.createElement("span");
            span.innerHTML = `<span style="display:inline-flex;align-items:center;vertical-align:middle;margin:0 3px;">
              <span style="font-size:1.6em;font-family:serif;line-height:1;color:#1a2a4a;margin-right:-2px;position:relative;top:4px;">√</span>
              <span style="border-top:2.5px solid #1a2a4a;display:inline-flex;align-items:center;padding:9px 6px 2px 4px;">
                <input type="text" class="answer-input" autocomplete="off"
                  style="width:60px;height:34px;border:2px solid #1a2a4a;border-radius:5px;font-size:1em;font-weight:bold;text-align:center;background:white;outline:none;padding:0;"/>
              </span>
            </span>`;
            const inp = span.querySelector("input");
            inp.addEventListener("input", handleInputAnswerChange);
            inp.addEventListener("keyup", (e) => {
              if (e.key === "Enter") checkAnswer();
            });
            questionContainer.appendChild(span);
            inputIndex++;
          } else if (token !== "") {
            if (token.includes("<br>")) {
              token.split("<br>").forEach((brPart, brIdx, arr) => {
                if (brPart.trim()) {
                  let span = document.createElement("span");
                  span.innerHTML = brPart;
                  questionContainer.appendChild(span);
                }
                if (brIdx < arr.length - 1) {
                  questionContainer.appendChild(document.createElement("br"));
                  let lb = document.createElement("div");
                  lb.style.cssText = "flex-basis:100%;height:0;";
                  questionContainer.appendChild(lb);
                }
              });
            } else {
              let span = document.createElement("span");
              span.innerHTML = token;
              questionContainer.appendChild(span);
            }
          }
        });
      } else if (part.fraction) {
        const { whole, numerator, denominator } = part.fraction;
        const span = document.createElement("span");
        span.className = "mixed-fraction";
        const wholeSpan = document.createElement("span");
        wholeSpan.className = "whole";
        const fractionSpan = document.createElement("span");
        fractionSpan.className = "fraction";
        const numeratorSpan = document.createElement("span");
        numeratorSpan.className = "numerator";
        const denominatorSpan = document.createElement("span");
        denominatorSpan.className = "denominator";

        if (whole === "______") {
          wholeSpan.innerHTML = "";
          wholeSpan.appendChild(
            createInputElement(randomQuestion.input[inputIndex]),
          );
          inputIndex++;
        } else {
          wholeSpan.innerHTML = whole ? whole : "&nbsp;";
        }
        if (numerator === "______") {
          numeratorSpan.appendChild(
            createInputElement(randomQuestion.input[inputIndex]),
          );
          inputIndex++;
        } else {
          numeratorSpan.innerHTML = renderFractionPart(numerator);
        }
        if (denominator === "______") {
          denominatorSpan.appendChild(
            createInputElement(randomQuestion.input[inputIndex]),
          );
          inputIndex++;
        } else {
          denominatorSpan.innerHTML = renderFractionPart(denominator);
        }

        fractionSpan.appendChild(numeratorSpan);
        fractionSpan.appendChild(denominatorSpan);
        span.appendChild(wholeSpan);
        span.appendChild(fractionSpan);
        questionContainer.appendChild(span);
      } else if (part.bracket) {
        const span = document.createElement("span");
        span.innerHTML = renderBracketHTML(part);
        questionContainer.appendChild(span);
      } else if (part.root) {
        const span = document.createElement("span");
        span.innerHTML = renderRoot(part.root);
        questionContainer.appendChild(span);
      } else if (part.powerFrac) {
        const span = document.createElement("span");
        span.innerHTML = renderPowerFrac(part.powerFrac);
        questionContainer.appendChild(span);
      } else if (part.fracPow) {
        const span = document.createElement("span");
        span.innerHTML = renderFracPow(part.fracPow);
        questionContainer.appendChild(span);
      } else if (part.powerStep) {
        const span = document.createElement("span");
        span.innerHTML = renderPowerStep(part.powerStep);
        questionContainer.appendChild(span);
        inputIndex += 2;
      } else if (part.power) {
        const { baseInputId, exponentInputId } = part.power;
        const span = document.createElement("span");
        span.style.cssText =
          "position:relative;display:inline-flex;vertical-align:middle;margin:0 4px;";
        span.innerHTML = `
    <input type="text" id="${baseInputId}" class="answer-input"
      style="width:55px;height:45px;font-size:1.1em;border:2px solid rgb(204, 204, 204);;border-radius:6px;text-align:center;background:white;outline:none;padding:0;"/>
    <input type="text" id="${exponentInputId}" class="answer-input"
      style="width:30px;height:25px;font-size:0.75em;border:2px solid rgb(204, 204, 204);;border-radius:4px;
      position:absolute;top:-18px;right:-29px;padding:0;text-align:center;background:white;outline:none;"/>`;
        span.querySelectorAll(".answer-input").forEach((inp) => {
          inp.addEventListener("input", handleInputAnswerChange);
          inp.addEventListener("keyup", (e) => {
            if (e.key === "Enter") checkAnswer();
          });
        });
        questionContainer.appendChild(span);
        inputIndex += 2;
      } else if (part.fractionPower) {
        const span = document.createElement("span");
        const { numerator, denominator, power } = part.fractionPower;
        span.innerHTML = `<span style="display:inline-flex;align-items:flex-start;vertical-align:middle;margin:0 6px;">
    <span style="font-size:2em;font-weight:100;line-height:1;align-self:center;">(</span>
    <span style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;margin:0 2px;">
      <span style="font-size:1em;line-height:1.2;">${numerator}</span>
      <span style="width:100%;height:2.5px;background:#222;margin:2px 0;display:block;"></span>
      <span style="font-size:1em;line-height:1.2;">${denominator}</span>
    </span>
    <span style="font-size:2em;font-weight:300;line-height:1;align-self:center;">)</span>
    <span style="font-size:0.7em;font-weight:bold;align-self:flex-start;margin-top:2px;margin-left:1px;">${power}</span>
  </span>`;
        questionContainer.appendChild(span);
      }
    });
  } else {
    let brParts = randomQuestion.question.split("<br>");
    brParts.forEach((brPart, brIdx) => {
      if (brPart.trim()) {
        let stringParts = brPart.split("______");
        stringParts.forEach((part, idx) => {
          if (part) {
            let span = document.createElement("span");
            span.innerHTML = part;
            questionContainer.appendChild(span);
          }
          if (
            idx < stringParts.length - 1 &&
            inputIndex < randomQuestion.input.length
          ) {
            addInputField(questionContainer, randomQuestion.input[inputIndex]);
            inputIndex++;
          }
        });
      }
      if (brIdx < brParts.length - 1) {
        questionContainer.appendChild(document.createElement("br"));
        let lb = document.createElement("div");
        lb.style.cssText = "flex-basis:100%;height:0;";
        questionContainer.appendChild(lb);
      }
    });
  }

  optionsElement.appendChild(questionContainer);

  questionContainer
    .querySelectorAll(".answer-input, .super-input")
    .forEach((input) => {
      input.addEventListener("input", handleInputAnswerChange);
      input.addEventListener("change", handleInputAnswerChange);
      input.addEventListener("keyup", (e) => {
        if (e.key === "Enter") checkAnswer();
      });
    });

  var prev = Ansgiven[index];
  if (prev && Array.isArray(prev)) {
    let inputs = questionContainer.querySelectorAll(".answer-input");
    inputs.forEach((input, idx) => {
      if (prev[idx] !== undefined) input.value = prev[idx];
      const pos = window.getComputedStyle(input).position;
      if (pos !== "absolute") {
        autoGrow(input);
      }
    });
  }
}
// ═══════════════════════════════════════════════════════════════════════════════
//  DROPDOWN QUESTION (NEW)
// ═══════════════════════════════════════════════════════════════════════════════
function loadDropdownQuestion(randomQuestion, optionsElement, index) {
  optionsElement.innerHTML = "";
  optionsElement.style.display = "flex";
  optionsElement.style.flexDirection = "column";
  optionsElement.style.alignItems = "center";
  optionsElement.classList.add("input-question");

  var questionContainer = document.createElement("div");
  questionContainer.className = "question-container";
  questionContainer.style.cssText =
    "display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:5px;font-size:1.5em;text-align:center;";

  let dropdownIndex = 0;

  if (Array.isArray(randomQuestion.question)) {
    randomQuestion.question.forEach((part) => {
      if (typeof part === "string") {
        let ddParts = part.split("___dropdown___");
        ddParts.forEach((ddPart, idx) => {
          if (ddPart) {
            if (ddPart.includes("<br>")) {
              ddPart.split("<br>").forEach((brPart, brIdx, arr) => {
                if (brPart.trim()) {
                  let span = document.createElement("span");
                  span.innerHTML = brPart;
                  questionContainer.appendChild(span);
                }
                if (brIdx < arr.length - 1) {
                  // force line break in flexbox
                  let lb = document.createElement("div");
                  lb.style.cssText = "flex-basis:100%;height:0;";
                  questionContainer.appendChild(lb);
                }
              });
            } else {
              let span = document.createElement("span");
              span.innerHTML = ddPart;
              questionContainer.appendChild(span);
            }
          }
          if (
            idx < ddParts.length - 1 &&
            dropdownIndex < randomQuestion.dropdown.length
          ) {
            const sel = document.createElement("select");
            sel.className = "answer-input";
            sel.style.cssText =
              "height:45px;font-size:0.8em;padding:5px;border-radius:6px;border:2px solid #444;text-align:center;margin:0 4px;";
            const defaultOpt = document.createElement("option");
            defaultOpt.value = "";
            defaultOpt.textContent = "Select";
            sel.appendChild(defaultOpt);
            randomQuestion.dropdown[dropdownIndex].forEach((optVal) => {
              const o = document.createElement("option");
              o.value = optVal;
              o.textContent = optVal;
              sel.appendChild(o);
            });
            sel.addEventListener("change", handleInputAnswerChange);
            questionContainer.appendChild(sel);
            dropdownIndex++;
          }
        });
      } else if (part.fraction) {
        const { whole, numerator, denominator } = part.fraction;
        const span = document.createElement("span");
        span.className = "mixed-fraction";
        span.innerHTML = `<span class="whole">${whole || "&nbsp;"}</span>
          <span class="fraction">
            <span class="numerator">${numerator}</span>
            <span class="denominator">${denominator}</span>
          </span>`;
        questionContainer.appendChild(span);
      } else if (part.root) {
        const span = document.createElement("span");
        span.innerHTML = renderRoot(part.root);
        questionContainer.appendChild(span);
      } else if (part.powerFrac) {
        const span = document.createElement("span");
        span.innerHTML = renderPowerFrac(part.powerFrac);
        questionContainer.appendChild(span);
      }
    });
  }

  optionsElement.appendChild(questionContainer);

  // Restore previous answers
  var prev = Ansgiven[index];
  if (prev && Array.isArray(prev)) {
    let inputs = questionContainer.querySelectorAll(".answer-input");
    inputs.forEach((input, idx) => {
      if (prev[idx] !== undefined) input.value = prev[idx];
      autoGrow(input);
    });
  }
}

function addInputField(container, inputField) {
  container.appendChild(createInputElement(inputField));
}

function createInputElement(inputField) {
  let el = document.createElement("input");
  el.type = "text";
  el.className = "answer-input";
  el.style.cssText =
    "padding:8px;font-size:1em;border:2px solid #ccc;border-radius:6px;text-align:center;width:80px;max-width:none;"; // ← fix here
  el.addEventListener("input", handleInputAnswerChange);
  el.addEventListener("input", function () {
    autoGrow(this);
  });
  return el;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MCQ QUESTION  (existing, with root/array option support added)
// ═══════════════════════════════════════════════════════════════════════════════
function loadOptionQuestion(randomQuestion, optionsElement, index) {
  var hasImageOptions = randomQuestion.options.some((o) => o.image);
  var hasTextOnlyOptions = randomQuestion.options.every((o) => !o.image);

  if (hasImageOptions) {
    optionsElement.style.display = "grid";
    optionsElement.style.gridTemplateColumns = "repeat(2, 1fr)";
    optionsElement.style.gap = "1rem";
    optionsElement.style.justifyContent = "center";
    optionsElement.classList.remove("text-only");
  } else if (hasTextOnlyOptions) {
    optionsElement.classList.add("text-only");
    optionsElement.classList.remove("input-question");
  }

  var selectedLi = null;

  randomQuestion.options.forEach(function (option, idx) {
    var li = document.createElement("li");
    li.classList.add("option-container");
    li.setAttribute("onclick", "optionContainer()");
    li.onclick = function () {
      if (selectedLi) selectedLi.style.border = "";
      selectedLi = li;
    };

    var radioButton = document.createElement("input");
    radioButton.type = "radio";
    radioButton.name = "answer";
    radioButton.value = idx;
    radioButton.style.display = "none";

    if (option.image) {
      var optionImage = document.createElement("img");
      optionImage.src = option.image;
      optionImage.alt = "Option Image";
      optionImage.style.cssText =
        "width:100%;max-width:400px;cursor:pointer;border:3px solid black;";
      optionImage.onclick = function () {
        radioButton.checked = true;
        optionsElement
          .querySelectorAll("img")
          .forEach((img) => (img.style.border = "3px solid black"));
        optionImage.style.border = "3px solid #007bff";
        handleAnswerChange();
      };
      li.appendChild(optionImage);
    } else {
      optionsElement.style.display = "grid";
      var optionTextButton = document.createElement("button");
      optionTextButton.className = "btnOption";
      optionTextButton.style.fontSize = "1.4em";

      if (option.textParts) {
        option.textParts.forEach((part) => {
          if (typeof part === "string") {
            optionTextButton.innerHTML += part;
          } else if (part.fraction) {
            const { whole, numerator, denominator } = part.fraction;
            optionTextButton.innerHTML += `
              <span class="mixed-fraction">
                <span class="whole">${whole || ""}</span>
                <span class="fraction">
                  <span class="numerator">${numerator}</span>
                  <span class="denominator">${denominator}</span>
                </span>
              </span>`;
          }
        });
      } else if (option.fraction) {
        const { whole, numerator, denominator } = option.fraction;
        optionTextButton.innerHTML = `
          <span class="mixed-fraction">
            <span class="whole">${whole || ""}</span>
            <span class="fraction">
              <span class="numerator">${renderFractionPart(numerator)}</span>
              <span class="denominator">${renderFractionPart(denominator)}</span>
            </span>
          </span>`;
        // NEW: root object option
      } else if (option.root) {
        optionTextButton.innerHTML = renderRoot(option.root);
      } else if (option.powerFrac) {
        optionTextButton.innerHTML = renderPowerFrac(option.powerFrac);
      } else if (option.fracPow) {
        optionTextButton.innerHTML = renderFracPow(option.fracPow);
      } else if (Array.isArray(option)) {
        optionTextButton.innerHTML = option
          .map((item) => {
            if (typeof item === "string") return item;
            if (item.fraction) return renderFractionPartHTML(item.fraction);
            if (item.root) return renderRoot(item.root);
            if (item.powerFrac) return renderPowerFrac(item.powerFrac);
            if (item.fracPow) return renderFracPow(item.fracPow);
            return "";
          })
          .join("");
      } else {
        optionTextButton.innerHTML = option.text || option;
      }

      optionTextButton.onclick = function () {
        radioButton.checked = true;
        document.querySelectorAll(".btnOption").forEach((btn) => {
          btn.style.backgroundColor = "";
          btn.style.border = "";
        });
        optionTextButton.style.backgroundColor = "#e3f2fd";
        optionTextButton.style.border = "2px solid #007bff";
        optionTextButton.style.color = "black";
        handleAnswerChange();
      };
      li.appendChild(optionTextButton);
    }

    li.appendChild(radioButton);
    optionsElement.appendChild(li);
  });

  // Restore previously selected answer
  var prev = Ansgiven[index];
  if (prev !== null && prev !== undefined) {
    var prevEl = optionsElement.querySelector(
      'input[name="answer"][value="' + prev + '"]',
    );
    if (prevEl) {
      prevEl.checked = true;
      var prevLi = prevEl.closest("li");
      if (prevLi) {
        var textBtn = prevLi.querySelector(".btnOption");
        if (textBtn) {
          textBtn.style.backgroundColor = "#e3f2fd";
          textBtn.style.border = "2px solid #007bff";
          textBtn.style.color = "black";
        }
        var img = prevLi.querySelector("img");
        if (img) {
          optionsElement
            .querySelectorAll("img")
            .forEach((im) => (im.style.border = "3px solid black"));
          img.style.border = "3px solid #007bff";
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ANSWER HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

function handleInputAnswerChange() {
  saveCurrentAnswer();
  document.getElementById("subbtn").style.display = "inline-block";
  document.getElementById("nextbtn").style.display = "none";
}

function handleAnswerChange() {
  saveCurrentAnswer();
  document.getElementById("subbtn").style.display = "inline-block";
  document.getElementById("nextbtn").style.display = "none";
}

function saveCurrentAnswer() {
  var currentQuestion = questions[i];

  if (currentQuestion.type === "hybrid") {
    var inputs = document.querySelectorAll(
      ".answer-input, select.answer-input",
    );
    var inputAnswers = [];
    var hasAnswer = false;
    inputs.forEach(function (input) {
      var value = input.value.trim();
      inputAnswers.push(value);
      if (value !== "") hasAnswer = true;
    });
    var selectedOption = document.querySelector(
      'input[name="hybrid-answer"]:checked',
    );
    if (selectedOption) hasAnswer = true;
    Ansgiven[i] = hasAnswer
      ? {
          inputs: inputAnswers,
          option: selectedOption ? parseInt(selectedOption.value) : null,
        }
      : null;
  } else if (
    currentQuestion.diagram ||
    (currentQuestion.input && Array.isArray(currentQuestion.input)) ||
    (currentQuestion.dropdown && Array.isArray(currentQuestion.dropdown))
  ) {
    var inputs = document.querySelectorAll(".answer-input, .super-input");
    var inputAnswers = [];
    var hasAnswer = false;
    inputs.forEach(function (input) {
      var value = input.value.trim();
      inputAnswers.push(value);
      if (value !== "") hasAnswer = true;
    });
    Ansgiven[i] = hasAnswer ? inputAnswers : null;
  } else {
    var selectedAnswer = document.querySelector('input[name="answer"]:checked');
    Ansgiven[i] = selectedAnswer ? parseInt(selectedAnswer.value) : null;
  }

  saveToLocalStorage("Ansgiven", Ansgiven);
}

function checkAnswer() {
  submitSound.play();
  saveCurrentAnswer();
  saveToLocalStorage("currentQuestionIndex", i);
  document.getElementById("subbtn").style.display = "none";
  document.getElementById("nextbtn").style.display = "inline-block";
  updateButtonStyles();
}

function newques() {
  saveCurrentAnswer();
  saveToLocalStorage("currentQuestionIndex", i + 1);

  if (i === count - 1) {
    document.getElementById("questiondiv").style.textAlign = "center";
    displayResults();
    document.getElementById("buttonContainer").style.display = "none";
    saveToLocalStorage("currentQuestionIndex", null);
  } else {
    i++;
    loadQuestion(i);
    var r = document.getElementById("result");
    if (r) r.innerHTML = "";
    document.getElementById("subbtn").style.display = "inline-block";
    document.getElementById("nextbtn").style.display = "none";
    updateButtonVisibility();
    updateButtonStyles();
  }
}

function abc(x) {
  saveCurrentAnswer();
  i = x - 1;
  saveToLocalStorage("currentQuestionIndex", i);
  loadQuestion(i);
  var r = document.getElementById("result");
  if (r) r.innerHTML = "";
  document.getElementById("subbtn").style.display = "inline-block";
  document.getElementById("nextbtn").style.display = "none";
  updateButtonStyles();
}

function updateButtonVisibility() {
  var currentQuestion = questions[i];
  var hasAnswer = false;

  if (currentQuestion.type === "hybrid") {
    document.querySelectorAll(".answer-input").forEach(function (input) {
      if (input.value.trim() !== "") hasAnswer = true;
    });
    if (document.querySelector('input[name="hybrid-answer"]:checked'))
      hasAnswer = true;
  } else if (
    currentQuestion.diagram ||
    (currentQuestion.input && Array.isArray(currentQuestion.input)) ||
    (currentQuestion.dropdown && Array.isArray(currentQuestion.dropdown))
  ) {
    document.querySelectorAll(".answer-input").forEach(function (input) {
      if (input.value.trim() !== "") hasAnswer = true;
    });
  } else {
    hasAnswer = document.querySelector('input[name="answer"]:checked') !== null;
  }

  document.getElementById("subbtn").style.display = hasAnswer
    ? "inline-block"
    : "none";
  document.getElementById("nextbtn").style.display = "none";
}

function updateButtonStyles() {
  var buttonContainer = document.getElementById("buttonContainer");
  if (!buttonContainer) return;
  var buttons = buttonContainer.getElementsByTagName("button");

  for (var j = 0; j < buttons.length; j++) {
    buttons[j].classList.remove(
      "answered-btn",
      "current-btn",
      "unanswered-btn",
    );
  }

  for (var j = 0; j < buttons.length; j++) {
    var answer = Ansgiven[j];
    var hasValidAnswer = Array.isArray(answer)
      ? answer.some((val) => val && val.trim() !== "")
      : answer !== null &&
        answer !== undefined &&
        (typeof answer === "object"
          ? (answer.inputs &&
              answer.inputs.some((v) => v && v.trim() !== "")) ||
            answer.option !== null
          : true);

    if (j !== i) {
      buttons[j].classList.add(
        hasValidAnswer ? "answered-btn" : "unanswered-btn",
      );
    }
  }
}

function updateButtonText() {
  var nextButton = document.getElementById("nextbtn");
  if (i === count - 1) {
    nextButton.innerHTML = "FINISH TEST";
    nextButton.onclick = function () {
      newques();
    };
  } else {
    nextButton.innerHTML = "Next";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function buildRationalSet(answers, question) {
  var rationals = [];
  var index = 0;
  question.question.forEach(function (part) {
    if (part.fraction) {
      var whole =
        part.fraction.whole === "______"
          ? parseInt(answers[index++])
          : parseInt(part.fraction.whole || 0);
      var num =
        part.fraction.numerator === "______"
          ? parseInt(answers[index++])
          : parseInt(part.fraction.numerator);
      var den =
        part.fraction.denominator === "______"
          ? parseInt(answers[index++])
          : parseInt(part.fraction.denominator);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        var improper = whole * den + num;
        var g = gcd(improper, den);
        rationals.push(improper / g + "/" + den / g);
      }
    }
  });
  return rationals.sort();
}

function buildDisplayString(answers, question) {
  var slots = [];
  if (Array.isArray(question.question)) {
    question.question.forEach(function (part) {
      if (typeof part === "string") {
        var matches = part.match(/______/g);
        if (matches) matches.forEach(() => slots.push({ type: "whole" }));
      } else if (part.fraction) {
        slots.push({
          type: "mixedFraction",
          wholeBlank: part.fraction.whole === "______",
          numBlank: part.fraction.numerator === "______",
          denBlank: part.fraction.denominator === "______",
          whole: part.fraction.whole,
          num: part.fraction.numerator,
          den: part.fraction.denominator,
        });
      }
    });
  }

  var parts = [];
  var answerIndex = 0;
  slots.forEach(function (slot) {
    if (slot.type === "mixedFraction") {
      var whole = slot.wholeBlank ? answers[answerIndex++] : slot.whole;
      var num = slot.numBlank ? answers[answerIndex++] : slot.num;
      var den = slot.denBlank ? answers[answerIndex++] : slot.den;
      parts.push(`
        <span class="display-fraction">
          ${whole ? `<span class="whole-part">${whole}</span>` : ""}
          <span class="fraction-part">
            <span class="numerator">${num}</span>
            <span class="denominator">${den}</span>
          </span>
        </span>`);
    } else {
      parts.push(`<span>${answers[answerIndex]}</span>`);
      answerIndex++;
    }
  });
  return parts.join(" , ");
}

function formatTextPartsForDisplay(textParts) {
  return textParts
    .map(function (part) {
      if (typeof part === "string") return part;
      if (part.fraction) {
        const { whole, numerator, denominator } = part.fraction;
        return `<span class="display-fraction"><span class="fraction-part"><span class="numerator">${numerator}</span><span class="denominator">${denominator}</span></span></span>`;
      }
      return "";
    })
    .join("");
}

function formatFractionForDisplay(option) {
  if (option && option.fraction) {
    return renderFractionPartHTML(option.fraction);
  }
  return option.text || option;
}

function normalizeAnswer(answer) {
  const value = (answer || "").trim();
  const numberPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (numberPattern.test(value)) {
    return Number(value).toString();
  }
  return value.toLowerCase();
}

function compareAnswers(userAnswer, correctAnswer) {
  return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
}

function validatePairs(values, allowed) {
  const counts = {};

  values.forEach((v) => {
    const key = Number(v);
    counts[key] = (counts[key] || 0) + 1;
  });

  return (
    Object.keys(allowed).every((key) => counts[Number(key)] === allowed[key]) &&
    Object.keys(counts).every((key) => allowed[Number(key)] !== undefined)
  );
}

function checkDiagramAnswer(givenAnswers, question) {
  const d = question.diagram;
  const slots = d.slots || [];
  const correct = question.answer || [];

  var allCorrect = slots.every((id, idx) => {
    return givenAnswers[idx] && compareAnswers(givenAnswers[idx], correct[idx]);
  });

  if (
    question.hcf &&
    question.hcfId &&
    !question.hcfFixed &&
    correct[slots.length] !== undefined
  ) {
    var hcfIdx = slots.length;
    allCorrect =
      allCorrect &&
      givenAnswers[hcfIdx] &&
      compareAnswers(givenAnswers[hcfIdx], correct[hcfIdx]);
  }

  return allCorrect;
}

function buildDiagramDisplayString(answers, question) {
  const d = question.diagram;
  const slots = d.slots || [];
  var parts = slots.map((id, idx) => {
    var val = answers[idx] || "?";
    return `<span>${val}</span>`;
  });
  if (question.hcf && question.hcfId && answers[slots.length] !== undefined) {
    parts.push(`<span>HCF: ${answers[slots.length]}</span>`);
  }
  return parts.join(" , ");
}

function buildDiagramSVGForResult(
  question,
  answers,
  correctAnswers,
  showColors,
) {
  const d = question.diagram;
  const op = d.op || "×";
  const aid = d.arrowId + "_result_" + Math.random().toString(36).slice(2, 7);
  const slots = d.slots || [];
  let slotIdx = 0;

  function resolveSlot(diagramValue) {
    if (diagramValue !== "") return { val: diagramValue, fixed: true };
    const idx = slotIdx++;
    const val = answers && answers[idx] !== undefined ? answers[idx] : "?";
    const correct =
      correctAnswers && correctAnswers[idx] !== undefined
        ? correctAnswers[idx]
        : val;
    const isRight = compareAnswers(val, correct);
    return {
      val,
      fixed: false,
      color: showColors ? (isRight ? "#4CAF50" : "#f44336") : "#111",
      bg: showColors ? (isRight ? "#d4edda" : "#f8d7da") : "white",
    };
  }

  function textSlot(diagramValue, tx, ty, anchor, fontSize) {
    const r = resolveSlot(diagramValue);
    const col = r.fixed ? "#111" : r.color;
    return `<text x="${tx}" y="${ty}" text-anchor="${anchor}" font-size="${fontSize}" font-weight="bold" fill="${col}">${r.val}</text>`;
  }

  function labelSlotStatic(diagramValue, ty) {
    if (diagramValue !== "") {
      return `<text x="245" y="${ty}" text-anchor="middle" font-size="20" font-weight="bold" fill="#222">${op} ${diagramValue}</text>`;
    } else {
      const idx = slotIdx++;
      const val = answers && answers[idx] !== undefined ? answers[idx] : "?";
      const correct =
        correctAnswers && correctAnswers[idx] !== undefined
          ? correctAnswers[idx]
          : val;
      const isRight = compareAnswers(val, correct);
      const col = showColors ? (isRight ? "#4CAF50" : "#f44336") : "#111";
      return `<text x="202" y="${ty}" text-anchor="end" font-size="22" font-weight="bold" fill="#222">${op}</text>
              <text x="275" y="${ty}" text-anchor="middle" font-size="22" font-weight="bold" fill="${col}">${val}</text>`;
    }
  }

  const fracNumSVG = textSlot(d.fracNum, 58, 85, "middle", 62);
  const fracDenSVG = textSlot(d.fracDen, 58, 170, "middle", 62);
  const topSVG = labelSlotStatic(d.topLabel, 22);
  const botSVG = labelSlotStatic(d.botLabel, 218);
  const resNumSVG = textSlot(d.resNum, 432, 85, "middle", 62);
  const resDenSVG = textSlot(d.resDen, 432, 170, "middle", 62);

  let hcfHTML = "";
  if (question.hcf && question.hcfId) {
    const hcfIdx = slots.length;
    const hcfVal =
      answers && answers[hcfIdx] !== undefined ? answers[hcfIdx] : "?";
    const hcfCorrect =
      correctAnswers && correctAnswers[hcfIdx] !== undefined
        ? correctAnswers[hcfIdx]
        : hcfVal;
    const hcfRight = compareAnswers(hcfVal, hcfCorrect);
    const hcfCol = showColors ? (hcfRight ? "#4CAF50" : "#f44336") : "#111";
    hcfHTML = `<div style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:1.1em;font-weight:bold;">
      <span style="font-style:italic;">HCF =</span>
      <span style="color:${hcfCol};font-weight:bold;">${hcfVal}</span>
    </div>`;
  }

  return `
  <div style="display:flex;flex-direction:column;align-items:center;">
    <svg width="520" height="230" viewBox="0 0 520 230" style="overflow:visible;max-width:100%;">
      <defs>
        <marker id="atop-${aid}" markerWidth="10" markerHeight="10" refX="9" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L10,3.5 z" fill="#333"/>
        </marker>
        <marker id="abot-${aid}" markerWidth="10" markerHeight="10" refX="9" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L10,3.5 z" fill="#333"/>
        </marker>
      </defs>
      ${fracNumSVG}
      <line x1="12" y1="103" x2="104" y2="103" stroke="#111" stroke-width="5"/>
      ${fracDenSVG}
      <text x="245" y="128" text-anchor="middle" font-size="52" font-weight="bold" fill="#222">=</text>
      ${topSVG}
      <path d="M 108 78 Q 255 28 388 78" stroke="#333" stroke-width="2.8" fill="none" marker-end="url(#atop-${aid})"/>
      <path d="M 108 155 Q 255 205 388 155" stroke="#333" stroke-width="2.8" fill="none" marker-end="url(#abot-${aid})"/>
      ${botSVG}
      ${resNumSVG}
      <line x1="390" y1="108" x2="475" y2="108" stroke="#444" stroke-width="4"/>
      ${resDenSVG}
    </svg>
    ${hcfHTML}
  </div>`;
}

function renderInlineHTMLPart(html, answers, correctAnswers, idxRef) {
  // Remove <br> sequences (they cause the floating = problem)
  html = html.replace(/<br\s*\/?>\s*(<br\s*\/?>)*/gi, "");

  // Replace every <input> with a styled answer span
  html = html.replace(/<input[^>]*\/?>/gi, function () {
    var idx = idxRef.i;
    var correct = null;
    if (correctAnswers !== null && correctAnswers !== undefined) {
      correct = compareAnswers(answers[idx], correctAnswers[idx]);
    }
    var span = renderAnswerSpan(answers[idx], correct);
    idxRef.i++;
    return span;
  });

  return html;
}

function domToInlineHTML(node, answers, slotCorrectFn, idxRef) {
  if (node.nodeType === 3) {
    var text = node.textContent;
    if (text.indexOf("______") !== -1) {
      return text.replace(/______/g, function () {
        var idx = idxRef.i;
        idxRef.i++;
        return renderAnswerSpan(answers[idx], slotCorrectFn(idx));
      });
    }
    return text;
  }
  if (node.nodeType !== 1) return "";

  var tag = node.tagName.toLowerCase();

  if (tag === "input") {
    var idx = idxRef.i;
    idxRef.i++;
    return renderAnswerSpan(answers[idx], slotCorrectFn(idx));
  }

  if (tag === "br") return "";

  if (node.classList && node.classList.contains("power-input-wrapper")) {
    var powerInner = "";
    node.childNodes.forEach(function (child) {
      if (child.nodeType === 1 && child.tagName.toLowerCase() === "span") {
        var childStyle = child.getAttribute("style") || "";
        if (childStyle.indexOf("flex-direction") !== -1) {
          powerInner += child.outerHTML;
        } else {
          powerInner += domToInlineHTML(child, answers, slotCorrectFn, idxRef);
        }
      } else {
        powerInner += domToInlineHTML(child, answers, slotCorrectFn, idxRef);
      }
    });
    return (
      "<sup style='display:inline-flex;align-items:center;flex-direction:row;" +
      "font-size:0.62em;gap:1px;line-height:1;'>" +
      powerInner +
      "</sup>"
    );
  }

  var inner = "";
  node.childNodes.forEach(function (child) {
    inner += domToInlineHTML(child, answers, slotCorrectFn, idxRef);
  });

  if (node.classList && node.classList.contains("base-with-power")) {
    return (
      "<span style='display:inline-flex;align-items:baseline;vertical-align: super;margin:0 2px;'>" +
      inner +
      "</span>"
    );
  }
  if (node.classList && node.classList.contains("base-number")) {
    return (
      "<span style='font-size:1em;font-weight:bold;line-height:1;'>" +
      inner +
      "</span>"
    );
  }
  if (node.classList && node.classList.contains("super-input")) {
    var idx = idxRef.i;
    idxRef.i++;
    return renderAnswerSpan(answers[idx], slotCorrectFn(idx));
  }

  if (tag === "div" || tag === "p") return inner;
  return inner;
}
function buildPerSlotCorrect(answers, correctAnswers, question) {
  // Returns an array: true/false/null per slot index.
  // null = no correctAnswers provided (showing "correct answer" column itself)
  if (!correctAnswers) return answers.map(() => null);

  // Alternate accepted answer sets (e.g. -9/6 or -3/2). If what the student
  // wrote matches one of them in full, mark against that set instead. The
  // whole set has to match, so a mix of the two (-9/2) is still wrong.
  if (question.altAnswer && answers && Array.isArray(correctAnswers)) {
    var alt = question.altAnswer.find(function (set) {
      return (
        set.length === correctAnswers.length &&
        set.every(function (ca, idx) {
          return compareAnswers(answers[idx], ca);
        })
      );
    });
    if (alt) correctAnswers = alt;
  }

  var result = new Array(answers.length).fill(false);
  var unordered =
    question.unorderedIndices && question.unorderedIndices.length
      ? question.unorderedIndices
      : [];

  var checked = new Set();

  if (question.stepValidation) {
    question.stepValidation.forEach(function (step) {
      if (!answers) return;
      var vals = answers.slice(step.start, step.end).map(Number);
      var isValid = false;

      if (step.type === "count") {
        isValid = validatePairs(vals, step.rule);
      } else if (step.type === "pairs") {
        var groupSize = step.rule[0].length;
        var numGroups = step.rule.length;
        var groups = [];
        for (var g = 0; g < numGroups; g++) {
          groups.push(
            vals.slice(g * groupSize, (g + 1) * groupSize).map(Number),
          );
        }
        isValid = groups.every(function (group) {
          return step.rule.some(function (r) {
            var sortedGroup = [...group].sort((a, b) => a - b);
            var sortedRule = [...r].map(Number).sort((a, b) => a - b);
            return JSON.stringify(sortedGroup) === JSON.stringify(sortedRule);
          });
        });
      } else if (step.type === "anyOrder") {
        var sortedVals = [...vals].map(Number).sort((a, b) => a - b);
        var sortedRule = [...step.rule].map(Number).sort((a, b) => a - b);
        isValid = JSON.stringify(sortedVals) === JSON.stringify(sortedRule);
      }

      for (var j = step.start; j < step.end; j++) {
        result[j] = isValid;
        checked.add(j);
      }
    });
  }

  // Ordered slots: direct comparison
  answers.forEach(function (val, idx) {
    if (unordered.indexOf(idx) === -1 && !checked.has(idx)) {
      result[idx] = compareAnswers(val, correctAnswers[idx]);
    }
  });

  // Unordered slots: check as a set (sort both and compare)
  if (unordered.length) {
    var givenVals = unordered
      .map(function (idx) {
        return normalizeAnswer(answers[idx]);
      })
      .sort();
    var correctVals = unordered
      .map(function (idx) {
        return normalizeAnswer(correctAnswers[idx]);
      })
      .sort();
    var setMatch = JSON.stringify(givenVals) === JSON.stringify(correctVals);
    unordered.forEach(function (idx) {
      if (!checked.has(idx)) {
        result[idx] = setMatch;
      }
    });
  }

  return result;
}

// slotsOnly: drop the wording and the picture and show just the filled-in
// answer, so an alternate answer can sit under the main one without repeating
// the whole question.
function formatInputAnswersDisplay(
  answers,
  question,
  correctAnswers,
  slotsOnly,
) {
  if (!answers || !Array.isArray(answers)) {
    return "<span style='color:red'>Not Answered</span>";
  }

  // Pre-compute per-slot correctness (handles unorderedIndices properly)
  var perSlotCorrect = buildPerSlotCorrect(answers, correctAnswers, question);

  var idxRef = { i: 0 };

  // Helper: correctness for current slot
  function slotCorrect(idx) {
    if (correctAnswers === null || correctAnswers === undefined) return null;
    if (correctAnswers === false) return false; // wrong → all boxes red
    if (correctAnswers === true) return null; // correct → no coloring at all
    return perSlotCorrect[idx];
  }

  function renderFractionWithAnswers(fraction, answers, slotCorrectFn) {
    const { whole, numerator, denominator } = fraction;

    function renderPart(value) {
      if (typeof value === "string") {
        if (value.trim() === "______" || /^_+$/.test(value.trim())) {
          const slotIdx = idxRef.i++;
          return renderAnswerSpan(answers[slotIdx], slotCorrectFn(slotIdx));
        }
        // NEW: handle "______ + ______" style strings inside fraction numerator
        // ___dropdown___ is a slot too — it must consume an answer like ______
        // does, otherwise every answer after it shifts by one.
        if (
          value.indexOf("______") !== -1 ||
          value.indexOf("___dropdown___") !== -1
        ) {
          const tokens = value.split(/(______)|( ?___dropdown___ ?)/);
          let html = "";
          tokens.forEach((token) => {
            if (token === undefined || token === "") return;
            const t = token.trim();
            if (t === "______" || t === "___dropdown___") {
              const slotIdx = idxRef.i++;
              html += renderAnswerSpan(
                answers[slotIdx],
                slotCorrectFn(slotIdx),
              );
            } else {
              html += `<span>${token}</span>`;
            }
          });
          return html;
        }
        return renderFractionPart(value);
      }
      if (Array.isArray(value)) {
        return value
          .map((item) => {
            if (typeof item === "string") {
              if (item.trim() === "______" || /^_+$/.test(item.trim())) {
                const slotIdx = idxRef.i++;
                return renderAnswerSpan(
                  answers[slotIdx],
                  slotCorrectFn(slotIdx),
                );
              }
              if (item.indexOf("___dropdown___") !== -1) {
                const slotIdx = idxRef.i++;
                return renderAnswerSpan(
                  answers[slotIdx],
                  slotCorrectFn(slotIdx),
                );
              }
              return item;
            }
            if (item.fraction)
              return renderFractionWithAnswers(
                item.fraction,
                answers,
                slotCorrectFn,
              );
            if (item.root) return renderRoot(item.root);
            if (item.powerFrac) return renderPowerFrac(item.powerFrac);
            if (item.fracPow) return renderFracPow(item.fracPow);
            return "";
          })
          .join("");
      }
      // ── FIXED: object cases handle karo ──────────────────────────
      if (value && typeof value === "object") {
        if (value.power) {
          // Power input ka answer display karo (slot se)
          const slotIdx = idxRef.i++;
          const slotIdx2 = idxRef.i++;
          const base = renderAnswerSpan(
            answers[slotIdx],
            slotCorrectFn(slotIdx),
          );
          const exp = renderAnswerSpan(
            answers[slotIdx2],
            slotCorrectFn(slotIdx2),
          );
          return `<span style="display:inline-flex;align-items:baseline;vertical-align:middle;">
        ${base}<span style="font-size:0.6em;position:relative;top:-10px;">${exp}</span>
      </span>`;
        }
        if (value.fraction)
          return renderFractionWithAnswers(
            value.fraction,
            answers,
            slotCorrectFn,
          );
        if (value.root) return renderRoot(value.root);
        if (value.powerFrac) return renderPowerFrac(value.powerFrac);
        if (value.fracPow) return renderFracPow(value.fracPow);
        return "";
      }
      return String(value);
    }

    const wholeHTML =
      whole !== undefined && whole !== ""
        ? `<span style="margin-right:4px;">${renderPart(whole)}</span>`
        : "";

    const numHTML = renderPart(numerator);
    const denHTML = renderPart(denominator);

    return `
      <span class="display-fraction" style="display:inline-flex;align-items:center;vertical-align:middle;margin:0 3px;font-size:0.95em;">
        ${wholeHTML}
        <span class="fraction-part" style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;">
          <span class="numerator">${numHTML}</span>

          <span class="denominator">${denHTML}</span>
        </span>
      </span>`;
  }

  var stepStartIndex = -1;
  if (Array.isArray(question.question)) {
    question.question.some(function (part, index) {
      if (typeof part === "string" && /Step\s*\d+:/i.test(part)) {
        stepStartIndex = index;
        return true;
      }
      return false;
    });
  }

  var renderParts =
    stepStartIndex >= 0
      ? question.question.slice(stepStartIndex)
      : question.question;

  var hasInlineInputs =
    Array.isArray(question.question) &&
    question.question.some(function (p) {
      return typeof p === "string" && /<input/i.test(p);
    });

  if (hasInlineInputs) {
    var outHTML = "";
    renderParts.forEach(function (part) {
      if (typeof part !== "string") {
        if (part.fraction) outHTML += renderFractionPartHTML(part.fraction);
        if (part.root) outHTML += renderRoot(part.root);
        if (part.powerFrac) outHTML += renderPowerFrac(part.powerFrac);
        if (part.fracPow) outHTML += renderFracPow(part.fracPow);
        return;
      }
      if (!/<input/i.test(part)) return;
      var processed = part.replace(/<br\s*\/?>/gi, "");
      processed = processed.replace(/<input[^>]*\/?>/gi, function () {
        var slotIdx = idxRef.i;
        idxRef.i++;
        return renderAnswerSpan(answers[slotIdx], slotCorrect(slotIdx));
      });
      outHTML += processed;
    });
    return (
      "<span style='display:flex;justify-content:center;align-items:center;flex-wrap:wrap;width:100%;gap:4px;font-size:1.05em;font-weight:bold;'>" +
      outHTML +
      "</span>"
    );
  }

  // ── Short Question Override: Show only answers if inputs are 1 or 2 ────────
  // if (
  //   question.input &&
  //   question.input.length > 0 &&
  //   question.input.length <= 2
  // ) {
  //   var shortHTML = "";
  //   for (var i = 0; i < answers.length; i++) {
  //     shortHTML += renderAnswerSpan(answers[i], slotCorrect(i)) + " ";
  //   }
  //   return (
  //     "<span style='display:flex;justify-content:center;align-items:center;flex-wrap:wrap;width:100%;gap:10px;font-size:1.1em;'>" +
  //     shortHTML +
  //     "</span>"
  //   );
  // }

  // ── Placeholder-style (______, ___sqrt___, ___dropdown___) ───────────────
  var outHTML = "";

  if (Array.isArray(question.question)) {
    renderParts.forEach(function (part) {
      if (typeof part === "string") {
        var text = part;
        if (slotsOnly) {
          // wording and pictures belong to the main answer above, not here
          if (!/______|___dropdown___|___sqrt___|___super___/.test(text)) return;
          text = text.replace(/<img[^>]*>/gi, "");
        }
        var tokens = text.split(
          /(______)|( ?___dropdown___ ?)|( ?___sqrt___ ?)|( ?___super___ ?)/,
        );
        tokens.forEach(function (token) {
          if (token === undefined) return;
          var t = token.trim();
          if (t === "______" || t === "___dropdown___") {
            outHTML += renderAnswerSpan(
              answers[idxRef.i],
              slotCorrect(idxRef.i),
            );
            idxRef.i++;
          } else if (t === "___super___") {
            outHTML +=
              `<span style="display:inline-flex;align-items:flex-start;vertical-align:middle;">` +
              `<span style="font-size:0.7em;position:relative;top:-15px;">` +
              renderAnswerSpan(answers[idxRef.i], slotCorrect(idxRef.i)) +
              `</span></span>`;
            idxRef.i++;
          } else if (t === "___sqrt___") {
            outHTML +=
              "<span style='display:inline-flex;align-items:center;vertical-align:middle;margin:0 3px;'>" +
              "<span style='font-size:1.4em;font-family:serif;line-height:1;margin-right:-2px;position:relative;top:3px;'>√</span>" +
              "<span style='border-top:2px solid currentColor;display:inline-flex;align-items:center;padding:5px 4px 2px 3px;'>" +
              renderAnswerSpan(answers[idxRef.i], slotCorrect(idxRef.i)) +
              "</span></span>";
            idxRef.i++;
          } else if (token !== "" && token.trim() !== "") {
            outHTML +=
              "<span style='white-space:pre-wrap;'>" +
              token.replace(/<br\s*\/?>/gi, " ") +
              "</span>";
          }
        });
      } else if (part.fraction) {
        outHTML += renderFractionWithAnswers(
          part.fraction,
          answers,
          slotCorrect,
        );
      } else if (part.bracket) {
        outHTML += renderBracketHTML(part);
      } else if (part.root) {
        outHTML += renderRoot(part.root);
      } else if (part.powerFrac) {
        outHTML += renderPowerFrac(part.powerFrac);
      } else if (part.fracPow) {
        outHTML += renderFracPow(part.fracPow);
      } else if (part.powerStep) {
        const { base, fracNum, fracDen } = part.powerStep;

        const fracHTML = `<span style="display:inline-flex;flex-direction:column;align-items:center;font-size:0.75em;vertical-align:middle;margin:0 2px;">
    <span style="padding:0 3px;">${fracNum}</span>
    <span style="border-top:1.5px solid currentColor;padding:0 3px;">${fracDen}</span>
  </span>`;

        // small answer box — power context
        function miniAnswerSpan(val, correct) {
          var border =
            correct === null ? "#444" : correct ? "#4CAF50" : "#f44336";
          var color =
            correct === null ? "#111" : correct ? "#155724" : "#721c24";
          var bg =
            correct === null ? "#f5f5f5" : correct ? "#d4edda" : "#f8d7da";
          return `<span style="display:inline-flex;align-items:center;justify-content:center;
      min-width:12px;padding:0 3px;height:14px;
      border:1.5px solid ${border};border-radius:2px;
      background:${bg};color:${color};
      font-weight:bold;font-size:0.85em;vertical-align:middle;margin:0 1px;">
      ${val !== undefined && val !== "" ? val : "?"}
    </span>`;
        }

        outHTML +=
          `<span style="display:inline-flex;align-items:baseline;gap:4px;flex-wrap:wrap;">` +
          // Left: base^(frac × input)
          `<span style="display:inline-flex;align-items:baseline;vertical-align:middle;">` +
          `<span style="font-size:1.4em;font-weight:bold;">${base}</span>` +
          `<span style="font-size:0.55em;position:relative;top:-20px;">` +
          `(${fracHTML} × ${miniAnswerSpan(answers[idxRef.i], slotCorrect(idxRef.i))})` +
          `</span>` +
          `</span>` +
          // =
          `<span style="font-size:1.4em;font-weight:bold;margin:0 4px;vertical-align:middle;">=</span>` +
          // Right: base^(input)
          `<span style="display:inline-flex;align-items:baseline;vertical-align:middle;">` +
          `<span style="font-size:1.4em;font-weight:bold;">${base}</span>` +
          `<span style="font-size:0.55em;position:relative;top:-20px;">` +
          `${miniAnswerSpan(answers[idxRef.i + 1], slotCorrect(idxRef.i + 1))}` +
          `</span>` +
          `</span>` +
          `</span> `;

        idxRef.i += 2;
      } else if (part.power) {
        outHTML +=
          `<span style="display:inline-flex;align-items:baseline;vertical-align:middle;margin:0 4px;">` +
          renderAnswerSpan(answers[idxRef.i], slotCorrect(idxRef.i)) +
          `<span style="font-size:0.6em;position:relative;top:-12px;">` +
          renderAnswerSpan(answers[idxRef.i + 1], slotCorrect(idxRef.i + 1)) +
          `</span></span>`;
        idxRef.i += 2;
      } else if (part.fractionPower) {
        // ← YAHAN ADD KARO
        const { numerator, denominator, power } = part.fractionPower;
        outHTML += `<span style="display:inline-flex;align-items:flex-start;vertical-align:middle;margin:0 6px;">
    <span style="font-size:1.6em;font-weight:100;line-height:1;align-self:center;">(</span>
    <span style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;margin:0 2px;font-size:0.85em;">
      <span>${numerator}</span>
      <span style="width:100%;height:2px;background:#222;margin:1px 0;display:block;"></span>
      <span>${denominator}</span>
    </span>
    <span style="font-size:1.6em;font-weight:300;line-height:1;align-self:center;">)</span>
    <span style="font-size:0.55em;font-weight:bold;align-self:flex-start;margin-top:1px;margin-left:1px;">${power}</span>
  </span>`;
      }
    });
  } else {
    question.question.split("<br>").forEach(function (brPart) {
      brPart.split("______").forEach(function (p, idx, arr) {
        if (p) outHTML += "<span>" + p + "</span>";
        if (idx < arr.length - 1) {
          outHTML += renderAnswerSpan(answers[idxRef.i], slotCorrect(idxRef.i));
          idxRef.i++;
        }
      });
      outHTML += " ";
    });
  }

  return (
    "<span style='display:flex;justify-content:center;align-items:center;flex-wrap:wrap;width:100%;" +
    "gap:2px;font-size:0.95em;line-height:1.8;'>" +
    outHTML +
    "</span>"
  );
}

function displayResults() {
  score = Ansgiven.reduce((total, answer, index) => {
    var q = questions[index];
    var isCorrect = false;

    if (q.diagram) {
      if (answer && Array.isArray(answer)) {
        isCorrect = checkDiagramAnswer(answer, q);
      }
    } else if (q.type === "hybrid") {
      if (answer && typeof answer === "object" && !Array.isArray(answer)) {
        var inputsCorrect =
          Array.isArray(q.answer) &&
          answer.inputs &&
          q.answer.every((ca, idx) => compareAnswers(answer.inputs[idx], ca));
        var optionCorrect = answer.option === q.optionAnswer;
        isCorrect = inputsCorrect && optionCorrect;
      }
    } else if (q.input && Array.isArray(q.input)) {
      if (answer && Array.isArray(answer) && Array.isArray(q.answer)) {
        if (q.unorderedFractions) {
          var studentSet = buildRationalSet(answer, q);
          var correctSet = buildRationalSet(q.answer, q);
          isCorrect = JSON.stringify(studentSet) === JSON.stringify(correctSet);
        } else if (q.unorderedIndices && q.unorderedIndices.length) {
          // NEW: unorderedIndices
          const unordered = q.unorderedIndices;
          let orderedOK = q.answer.every((ca, idx) => {
            if (unordered.includes(idx)) return true;
            return compareAnswers(answer[idx], ca);
          });
          const userVals = unordered
            .map((idx) => normalizeAnswer(answer[idx]))
            .sort();
          const correctVals = unordered
            .map((idx) => normalizeAnswer(q.answer[idx]))
            .sort();
          isCorrect =
            orderedOK &&
            JSON.stringify(userVals) === JSON.stringify(correctVals);
        } else {
          var perSlot = buildPerSlotCorrect(answer, q.answer, q);
          isCorrect = perSlot.every((v, idx) => {
            const skipIndices = q.skipIndices || [];
            if (skipIndices.includes(idx)) {
              return !answer[idx] || answer[idx] === "" ? true : v === true;
            }
            return v === true;
          });
        }
      }
    } else if (q.dropdown && Array.isArray(q.dropdown)) {
      // NEW: dropdown scoring
      if (answer && Array.isArray(answer) && Array.isArray(q.correct)) {
        const unordered = q.unorderedIndices || [];
        let orderedOK = q.correct.every((ca, idx) => {
          if (unordered.includes(idx)) return true;
          return compareAnswers(answer[idx], ca);
        });
        let unorderedOK = true;
        if (unordered.length) {
          const userVals = unordered
            .map((idx) => normalizeAnswer(answer[idx]))
            .sort();
          const correctVals = unordered
            .map((idx) => normalizeAnswer(q.correct[idx]))
            .sort();
          unorderedOK =
            JSON.stringify(userVals) === JSON.stringify(correctVals);
        }
        isCorrect = orderedOK && unorderedOK;
      }
    } else {
      isCorrect = answer === q.answer;
    }
    return isCorrect ? total + 1 : total;
  }, 0);

  saveToLocalStorage(topicName + "_score", score);
  saveToLocalStorage(topicName + "_completed", "true");

  var home =
    "<a href='./graph.html'><b class='btn btn-success next-btn-progress'>Click here to View Report</b></a><br>";
  saveToLocalStorage(topicName + "_results_content", home);

  var questionsPerPage = 3;
  var numberOfPages = Math.ceil(questions.length / questionsPerPage);
  var questionContent = "";

  for (var page = 0; page < numberOfPages; page++) {
    var start = page * questionsPerPage;
    var end = Math.min(start + questionsPerPage, questions.length);
    var pageDiv =
      "<div class='question-page' style='display:" +
      (page === 0 ? "block" : "none") +
      ";'><h2>Page " +
      (page + 1) +
      "</h2>";

    for (var j = start; j < end; j++) {
      var quesgroup = questions[j];

      var questionDisplay = "";
      if (Array.isArray(quesgroup.question)) {
        var displayParts = [];
        for (var qPart of quesgroup.question) {
          if (typeof qPart === "string") {
            var cleaned = qPart
              .replace(/<br\s*\/?>/gi, " ")
              .replace(/______/g, "")
              .replace(/___dropdown___/g, "")
              .trim();
            var firstLine = cleaned.split(".")[0] + ".";
            if (cleaned) displayParts.push(firstLine);
            break;
          } else if (qPart.root) {
            displayParts.push(renderRoot(qPart.root));
          } else if (qPart.fraction) {
            displayParts.push(renderFractionPartHTML(qPart.fraction));
          } else if (qPart.powerFrac) {
            displayParts.push(renderPowerFrac(qPart.powerFrac));
          } else if (qPart.fracPow) {
            displayParts.push(renderFracPow(qPart.fracPow));
          }
        }
        questionDisplay = displayParts.join(" ");
      } else {
        questionDisplay = quesgroup.question.split(/<br\s*\/?/i)[0].trim();
      }
      var questionImageContent = "";
      if (quesgroup.image) {
        questionImageContent =
          "<br><img src='" +
          quesgroup.image +
          "' alt='Question Image' style='max-width:300px;max-height:200px;object-fit:contain;border-radius:8px;margin:10px 0;'><br>";
      }

      var ansContent = "";
      var givenContent = "";

      if (quesgroup.diagram) {
        var correctAnswers = quesgroup.answer || [];
        ansContent = buildDiagramSVGForResult(
          quesgroup,
          correctAnswers,
          correctAnswers,
          false,
        );
        var givenAnswers = Ansgiven[j];
        if (givenAnswers && Array.isArray(givenAnswers)) {
          givenContent = buildDiagramSVGForResult(
            quesgroup,
            givenAnswers,
            correctAnswers,
            true,
          );
        } else {
          givenContent = "<span style='color:red'>Not Answered</span>";
        }
      } else if (
        quesgroup.input &&
        Array.isArray(quesgroup.input) &&
        quesgroup.type !== "hybrid"
      ) {
        var correctAnswers = quesgroup.answer || [];
        ansContent = formatInputAnswersDisplay(correctAnswers, quesgroup, null);
        // any equally acceptable answer shown under the main one, as "or ..."
        if (Array.isArray(quesgroup.altAnswer)) {
          quesgroup.altAnswer.forEach(function (alt) {
            ansContent +=
              "<span style='display:flex;justify-content:center;align-items:center;" +
              "flex-wrap:wrap;width:100%;gap:6px;margin-top:6px;'>" +
              "<span style='font-style:italic;'>or</span>" +
              formatInputAnswersDisplay(alt, quesgroup, null, true) +
              "</span>";
          });
        }
        var givenAnswers = Ansgiven[j];
        if (givenAnswers && Array.isArray(givenAnswers)) {
          var isCorrect;
          if (quesgroup.unorderedFractions) {
            var studentSet = buildRationalSet(givenAnswers, quesgroup);
            var correctSet = buildRationalSet(correctAnswers, quesgroup);
            isCorrect =
              JSON.stringify(studentSet) === JSON.stringify(correctSet);
          } else if (
            quesgroup.unorderedIndices &&
            quesgroup.unorderedIndices.length
          ) {
            const unordered = quesgroup.unorderedIndices;
            let orderedOK = correctAnswers.every((ca, idx) => {
              if (unordered.includes(idx)) return true;
              return compareAnswers(givenAnswers[idx], ca);
            });
            const userVals = unordered
              .map((idx) => normalizeAnswer(givenAnswers[idx]))
              .sort();
            const correctVals = unordered
              .map((idx) => normalizeAnswer(correctAnswers[idx]))
              .sort();
            isCorrect =
              orderedOK &&
              JSON.stringify(userVals) === JSON.stringify(correctVals);
          } else {
            isCorrect = correctAnswers.every((ca, idx) => {
              const skipIndices = quesgroup.skipIndices || [];
              if (skipIndices.includes(idx)) {
                return !givenAnswers[idx] || givenAnswers[idx] === ""
                  ? true
                  : givenAnswers[idx].toLowerCase().trim() ===
                      ca.toLowerCase().trim();
              }
              return (
                givenAnswers[idx] &&
                givenAnswers[idx].toLowerCase().trim() ===
                  ca.toLowerCase().trim()
              );
            });
          }
          givenContent = formatInputAnswersDisplay(
            givenAnswers,
            quesgroup,
            correctAnswers,
          );
        } else {
          givenContent = "<span style='color:red'>Not Answered</span>";
        }
      } else if (
        quesgroup.dropdown &&
        Array.isArray(quesgroup.dropdown) &&
        quesgroup.type !== "hybrid"
      ) {
        // NEW: dropdown results display
        var correctAnswers = quesgroup.correct || [];
        ansContent = correctAnswers.join(" , ");
        var givenAnswers = Ansgiven[j];
        if (givenAnswers && Array.isArray(givenAnswers)) {
          const unordered = quesgroup.unorderedIndices || [];
          let orderedOK = correctAnswers.every((ca, idx) => {
            if (unordered.includes(idx)) return true;
            return compareAnswers(givenAnswers[idx], ca);
          });
          let unorderedOK = true;
          if (unordered.length) {
            const userVals = unordered
              .map((idx) => normalizeAnswer(givenAnswers[idx]))
              .sort();
            const correctVals = unordered
              .map((idx) => normalizeAnswer(correctAnswers[idx]))
              .sort();
            unorderedOK =
              JSON.stringify(userVals) === JSON.stringify(correctVals);
          }
          const isCorrect = orderedOK && unorderedOK;
          givenContent =
            "<span style='color:" +
            (isCorrect ? "inherit" : "red") +
            ";'>" +
            givenAnswers.join(" , ") +
            "</span>";
        } else {
          givenContent = "<span style='color:red'>Not Answered</span>";
        }
      } else if (quesgroup.type === "hybrid") {
        var correctInputs = quesgroup.answer || [];
        var correctOption = quesgroup.options[quesgroup.optionAnswer];
        // Show question context with correct answers filled in
        ansContent =
          formatInputAnswersDisplay(correctInputs, quesgroup, null) +
          "<br>Option: " +
          (correctOption ? correctOption.text || correctOption : "");
        givenContent = "<span style='color:red'>Not Answered</span>";
        var givenAnswers = Ansgiven[j];
        if (
          givenAnswers &&
          typeof givenAnswers === "object" &&
          !Array.isArray(givenAnswers) &&
          givenAnswers.inputs
        ) {
          var optionCorrect = givenAnswers.option === quesgroup.optionAnswer;
          var optionColor = optionCorrect ? "inherit" : "red";
          // Show question context with given answers filled in (colored correct/incorrect)
          givenContent =
            formatInputAnswersDisplay(
              givenAnswers.inputs,
              quesgroup,
              correctInputs,
            ) +
            "<br>Option: <span style='color:" +
            optionColor +
            ";'>" +
            (givenAnswers.option !== null &&
            givenAnswers.option !== undefined &&
            quesgroup.options[givenAnswers.option]
              ? quesgroup.options[givenAnswers.option].text ||
                quesgroup.options[givenAnswers.option]
              : "Not Answered") +
            "</span>";
        }
      } else {
        // MCQ — original logic
        var ans = quesgroup.options[quesgroup.answer];
        var givenAnswer =
          Ansgiven[j] !== undefined ? quesgroup.options[Ansgiven[j]] : null;

        if (!ans) {
          ansContent = "<span style='color:red'>N/A</span>";
        } else if (ans.image) {
          ansContent =
            "<img src='" +
            ans.image +
            "' alt='Answer Image' style='width:400px;height:100px;'>";
        } else if (ans.root) {
          ansContent = renderRoot(ans.root);
        } else if (ans.powerFrac) {
          ansContent = renderPowerFrac(ans.powerFrac);
        } else if (ans.fracPow) {
          ansContent = renderFracPow(ans.fracPow);
        } else if (Array.isArray(ans)) {
          ansContent = ans
            .map((item) => {
              if (typeof item === "string") return item;
              if (item.root) return renderRoot(item.root);
              if (item.fraction) return renderFractionPartHTML(item.fraction);
              if (item.powerFrac) return renderPowerFrac(item.powerFrac);
              if (item.fracPow) return renderFracPow(item.fracPow);
              return "";
            })
            .join("");
        } else if (ans.fraction) {
          ansContent = renderFractionPartHTML(ans.fraction);
        } else if (ans.textParts) {
          ansContent = formatTextPartsForDisplay(ans.textParts);
        } else {
          ansContent = getOptionLabel(ans);
        }

        if (givenAnswer) {
          var isCorrect = Ansgiven[j] === quesgroup.answer;
          var color = isCorrect ? "inherit" : "red";
          var givenHTML = "";
          if (givenAnswer && givenAnswer.image) {
            givenContent =
              "<img src='" +
              givenAnswer.image +
              "' alt='Given Answer Image' style='width:400px;height:100px;" +
              (isCorrect ? "" : "border:2px solid red;") +
              "'>";
          } else {
            if (givenAnswer.root) {
              givenHTML = renderRoot(givenAnswer.root, color);
            } else if (givenAnswer.powerFrac) {
              givenHTML = renderPowerFrac(givenAnswer.powerFrac);
            } else if (givenAnswer.fracPow) {
              givenHTML = `<span style="color:${color}">${renderFracPow(givenAnswer.fracPow)}</span>`;
            } else if (Array.isArray(givenAnswer)) {
              givenHTML = givenAnswer
                .map((item) => {
                  if (typeof item === "string")
                    return `<span style="color:${color}">${item}</span>`;
                  if (item.fraction)
                    return `<span style="color:${color}">${renderFractionPartHTML(item.fraction)}</span>`;
                  if (item.root) return renderRoot(item.root, color);
                  if (item.powerFrac)
                    return `<span style="color:${color}">${renderPowerFrac(item.powerFrac)}</span>`;
                  if (item.fracPow)
                    return `<span style="color:${color}">${renderFracPow(item.fracPow)}</span>`;
                  return "";
                })
                .join("");
              // wrap entire array answer in color span directly
              givenContent =
                "<span style='color:" +
                color +
                ";display:inline-flex;align-items:center;flex-wrap:wrap;gap:2px;'>" +
                givenHTML +
                "</span>";
              givenHTML = null;
            } else if (givenAnswer.fraction) {
              givenHTML = renderFractionPartHTML(givenAnswer.fraction);
            } else if (givenAnswer.textParts) {
              givenHTML = formatTextPartsForDisplay(givenAnswer.textParts);
            } else {
              givenHTML = getOptionLabel(givenAnswer);
            }
            if (givenHTML !== null) {
              givenContent =
                "<span style='color:" +
                color +
                ";display:inline-flex;align-items:center;flex-wrap:wrap;gap:2px;'>" +
                givenHTML +
                "</span>";
            }
          }
        } else {
          givenContent = "<span style='color:red'>Not Answered</span>";
        }
      }

      var num = j + 1;
      pageDiv +=
        "Q." +
        num +
        " " +
        questionDisplay +
        questionImageContent +
        "<br><br>Correct Answer: " +
        ansContent +
        "<br><br>Answer Given: " +
        givenContent +
        "<br><br>";
    }

    pageDiv += "</div>";
    questionContent += pageDiv;
  }

  saveToLocalStorage(topicName + "_question_content", questionContent);

  document.getElementById("picdiv").innerHTML = "";
  document.getElementById("picdiv").style.display = "none";
  document.getElementById("questiondiv").style.display = "none";
  document.getElementById("nextbtn").style.textAlign = "center";

  confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
  var sound = new Audio("./assests/sounds/well-done.mp3");
  sound.play();

  setTimeout(() => {
    window.location.href = "./graph.html";
  }, 1500);
}
function renderAnswerSpan(val, correct) {
  var border, color, bg;
  if (correct === null || correct === undefined) {
    border = "#444";
    color = "#111";
    bg = "#f5f5f5";
  } else if (correct) {
    border = "#4CAF50";
    color = "#155724";
    bg = "#d4edda";
  } else {
    border = "#f44336";
    color = "#721c24";
    bg = "#f8d7da";
  }
  return (
    "<span style='display:inline-flex;align-items:center;justify-content:center;" +
    "min-width:18px;padding:0 4px;height:20px;" +
    "border:2px solid " +
    border +
    ";border-radius:3px;" +
    "background:" +
    bg +
    ";color:" +
    color +
    ";" +
    "font-weight:bold;font-size:1em;vertical-align:middle;margin:0 1px;'>" +
    (val !== undefined && val !== "" ? val : "?") +
    "</span>"
  );
}
function answersAreCorrect(given, correct, question) {
  if (!given || !correct) return false;
  if (question.unorderedIndices && question.unorderedIndices.length) {
    var unordered = question.unorderedIndices;
    var orderedOK = correct.every(function (ca, idx) {
      if (unordered.indexOf(idx) !== -1) return true;
      return (
        given[idx] &&
        given[idx].toLowerCase().trim() === ca.toLowerCase().trim()
      );
    });
    var userVals = unordered
      .map(function (idx) {
        return (given[idx] || "").toLowerCase().trim();
      })
      .sort();
    var correctVals = unordered
      .map(function (idx) {
        return (correct[idx] || "").toLowerCase().trim();
      })
      .sort();
    return (
      orderedOK && JSON.stringify(userVals) === JSON.stringify(correctVals)
    );
  }
  return correct.every(function (ca, idx) {
    return (
      given[idx] && given[idx].toLowerCase().trim() === ca.toLowerCase().trim()
    );
  });
}
function substituteInputs(
  htmlStr,
  answers,
  correctAnswers,
  idxRef,
  superScript,
) {
  return htmlStr.replace(/<input[^>]*\/?>/gi, function () {
    var idx = idxRef.i;
    var correct = null;
    if (correctAnswers !== null && correctAnswers !== undefined) {
      correct =
        (answers[idx] || "").toLowerCase().trim() ===
        (correctAnswers[idx] || "").toLowerCase().trim();
    }
    var span = renderAnswerSpan(answers[idx], correct);
    idxRef.i++;
    return span;
  });
}
function autoGrow(input) {
  // Absolute positioned inputs (exponents) ko skip karo
  if (window.getComputedStyle(input).position === "absolute") return;

  const minWidth = 80;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const style = window.getComputedStyle(input);
  ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const textWidth = ctx.measureText(
    input.value || input.placeholder || "",
  ).width;
  input.style.width = Math.max(minWidth, textWidth + 24) + "px";
}

function showPage(page) {
  document.querySelectorAll(".question-page").forEach((p, index) => {
    p.style.display = index === page ? "block" : "none";
  });
}

function getOptionLabel(option) {
  if (option.endsWith && option.endsWith(".mp3")) {
    var label = option.split("/").pop().replace(".mp3", "");
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return option.text || option;
}

function playOptionSound(option) {
  new Audio(option).play();
}
