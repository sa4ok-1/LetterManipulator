document.addEventListener("DOMContentLoaded", function () {
  const textInput = document.getElementById("text-input");
  const submitBtn = document.getElementById("submit-btn");
  const undoBtn = document.getElementById("undo-btn");
  const resizeBtn = document.getElementById("resize-btn");
  const textDisplay = document.getElementById("text-display");

  let letters = [];
  let selectedLetters = new Set();
  let dragStartX = 0;
  let dragStartY = 0;
  let selectionBox = null;
  let draggedLetters = [];
  let initialPositions = [];
  let history = [];

  submitBtn.addEventListener("click", function () {
    const text = textInput.value;
    displayText(text);
    saveState();
  });

  undoBtn.addEventListener("click", undoLastAction);

  resizeBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleResize();
  });

  function displayText(text) {
    textDisplay.innerHTML = "";
    letters = [];
    selectedLetters.clear();

    const startX = 20;
    let currentX = startX;
    const startY = 20;

    for (let i = 0; i < text.length; i++) {
      const letter = document.createElement("span");
      letter.className = "letter";
      letter.textContent = text[i];
      letter.dataset.index = i;
      letter.style.left = currentX + "px";
      letter.style.top = startY + "px";

      letter.addEventListener("mousedown", startDrag);
      letter.addEventListener("click", toggleSelection);

      textDisplay.appendChild(letter);
      letters.push(letter);

      currentX += letter.offsetWidth;
    }
  }

  function toggleSelection(e) {
    e.preventDefault();
    const letter = e.target;
    const index = letter.dataset.index;

    if (e.ctrlKey || e.metaKey) {
      if (selectedLetters.has(index)) {
        selectedLetters.delete(index);
        letter.classList.remove("selected");
      } else {
        selectedLetters.add(index);
        letter.classList.add("selected");
      }
    } else {
      clearSelection();
      selectedLetters.add(index);
      letter.classList.add("selected");
    }
  }

  function startDrag(e) {
    e.preventDefault();

    const letter = e.target;
    const index = letter.dataset.index;

    if (!selectedLetters.has(index) && !(e.ctrlKey || e.metaKey)) {
      clearSelection();
      selectedLetters.add(index);
      letter.classList.add("selected");
    }

    draggedLetters = [];
    initialPositions = [];

    selectedLetters.forEach((idx) => {
      const l = letters[idx];
      draggedLetters.push(l);
      initialPositions.push({
        element: l,
        left: parseFloat(l.style.left),
        top: parseFloat(l.style.top),
      });
      l.classList.add("dragging");
    });

    dragStartX = e.clientX;
    dragStartY = e.clientY;

    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", endDrag);
  }

  function drag(e) {
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;

    const displayRect = textDisplay.getBoundingClientRect();

    draggedLetters.forEach((letter, index) => {
      const initial = initialPositions[index];
      let newLeft = initial.left + deltaX;
      let newTop = initial.top + deltaY;

      const letterRect = letter.getBoundingClientRect();
      newLeft = Math.max(
        0,
        Math.min(newLeft, displayRect.width - letterRect.width)
      );
      newTop = Math.max(
        0,
        Math.min(newTop, displayRect.height - letterRect.height)
      );

      letter.style.left = newLeft + "px";
      letter.style.top = newTop + "px";
    });
  }

  function endDrag(e) {
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", endDrag);

    draggedLetters.forEach((letter) => {
      letter.classList.remove("dragging");

      const target = findLetterAtPosition(e.clientX, e.clientY, letter);
      if (target && draggedLetters.length === 1) {
        const tempLeft = target.style.left;
        const tempTop = target.style.top;
        target.style.left = initialPositions[0].left + "px";
        target.style.top = initialPositions[0].top + "px";
        letter.style.left = tempLeft;
        letter.style.top = tempTop;
      }
    });

    saveState();
    draggedLetters = [];
    initialPositions = [];
  }

  function findLetterAtPosition(x, y, excludeLetter) {
    for (let letter of letters) {
      if (letter === excludeLetter) continue;

      const rect = letter.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        return letter;
      }
    }
    return null;
  }

  function clearSelection() {
    selectedLetters.forEach((idx) => {
      letters[idx].classList.remove("selected");
    });
    selectedLetters.clear();
  }

  textDisplay.addEventListener("mousedown", function (e) {
    if (e.target.classList.contains("letter") || e.target.tagName === "BUTTON")
      return;

    dragStartX = e.clientX;
    dragStartY = e.clientY;

    selectionBox = document.createElement("div");
    selectionBox.className = "selection-box";
    textDisplay.appendChild(selectionBox);

    document.addEventListener("mousemove", drawSelectionBox);
    document.addEventListener("mouseup", endSelectionBox);
  });

  function drawSelectionBox(e) {
    const currentX = e.clientX;
    const currentY = e.clientY;

    const displayRect = textDisplay.getBoundingClientRect();
    const left = Math.min(dragStartX, currentX) - displayRect.left;
    const top = Math.min(dragStartY, currentY) - displayRect.top;
    const width = Math.abs(currentX - dragStartX);
    const height = Math.abs(currentY - dragStartY);

    selectionBox.style.left = left + "px";
    selectionBox.style.top = top + "px";
    selectionBox.style.width = width + "px";
    selectionBox.style.height = height + "px";
  }

  function endSelectionBox(e) {
    document.removeEventListener("mousemove", drawSelectionBox);
    document.removeEventListener("mouseup", endSelectionBox);

    const boxRect = selectionBox.getBoundingClientRect();
    clearSelection();

    letters.forEach((letter) => {
      const letterRect = letter.getBoundingClientRect();
      if (
        letterRect.right > boxRect.left &&
        letterRect.left < boxRect.right &&
        letterRect.bottom > boxRect.top &&
        letterRect.top < boxRect.bottom
      ) {
        const index = letter.dataset.index;
        selectedLetters.add(index);
        letter.classList.add("selected");
      }
    });

    selectionBox.remove();
    selectionBox = null;
  }

  function saveState() {
    const state = letters.map((letter) => ({
      text: letter.textContent,
      left: letter.style.left,
      top: letter.style.top,
    }));
    history.push(state);
    if (history.length > 10) history.shift();
  }

  function undoLastAction() {
    if (history.length < 2) return;

    history.pop();
    const previousState = history[history.length - 1];

    textDisplay.innerHTML = "";
    letters = [];
    selectedLetters.clear();

    previousState.forEach((state, i) => {
      const letter = document.createElement("span");
      letter.className = "letter";
      letter.textContent = state.text;
      letter.dataset.index = i;
      letter.style.left = state.left;
      letter.style.top = state.top;

      letter.addEventListener("mousedown", startDrag);
      letter.addEventListener("click", toggleSelection);

      textDisplay.appendChild(letter);
      letters.push(letter);
    });
  }

  function toggleResize() {
    const currentWidth = textDisplay.offsetWidth;
    const currentHeight = textDisplay.offsetHeight;
    textDisplay.style.width = currentWidth === 760 ? "500px" : "760px";
    textDisplay.style.minHeight = currentHeight === 240 ? "150px" : "200px";

    const displayRect = textDisplay.getBoundingClientRect();
    letters.forEach((letter) => {
      const letterRect = letter.getBoundingClientRect();
      let newLeft = parseFloat(letter.style.left);
      let newTop = parseFloat(letter.style.top);

      newLeft = Math.max(
        0,
        Math.min(newLeft, displayRect.width - letterRect.width)
      );
      newTop = Math.max(
        0,
        Math.min(newTop, displayRect.height - letterRect.height)
      );

      letter.style.left = newLeft + "px";
      letter.style.top = newTop + "px";
    });
  }
});
