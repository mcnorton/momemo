// 카드덱 추첨. 덱 10칸, 카드 55칸. 닫아도 덱마다 목록/추첨과 뽑힌 기록을 유지한다.
const card = document.getElementById("card");
const carddecksbox = document.getElementById("card-decks");
const cardmanage = document.getElementById("card-manage");
const cardmanageicon = document.querySelector("#card-manage > ion-icon");
const cardmain = document.getElementById("card-main");
const cardhead = document.getElementById("card-head");
const cardgrid = document.getElementById("card-grid");
const cardready = document.getElementById("card-ready");
const cardrepeatable = document.getElementById("card-repeatable");
const cardreel = document.getElementById("card-reel");
const cardplay = document.getElementById("card-play");
const carddrawn = document.getElementById("card-drawn");
const cardconfirm = document.getElementById("card-confirm");
const cardright = document.getElementById("right");
const cardgreeting = document.getElementById("greeting");

const KEY_CARDDECKS = "carddecks";
const KEY_CARD_SLOT = "carddeckSlot";
const CARD_DECK_SLOTS = 10;
const CARD_COLS = 5;
const CARD_ROWS = 11;
const CARD_SLOTS = CARD_COLS * CARD_ROWS;
const CARD_NAME_MAX = 40;
const CARD_ICON_MAX = 8;
const CARD_LABEL_MAX = 40;
const CARD_TEXT_MAX = 80;
const CARD_DEFAULT_NAME = "새 카드덱";
const CARD_DEFAULT_ICON = "";
const CARD_RANKS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const CARD_RANK_NAMES = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King"];
// 검정 문양 이모지가 어두운 카드에서 사라지지 않게 글자 모양으로 고정한다. 하트는 🤍.
const CARD_SUITS = ["\u2660\uFE0E", "\u{1F90D}", "\u2666\uFE0E", "\u2663\uFE0E"];
const CARD_DRAG_SLOP = 8;
const CARD_SPIN_MS = 3000;
const CARD_REEL_COUNT = 7;
const CARD_PLACE_LABEL = "Name";
const CARD_PLACE_ICON = "+";
const CARD_PLACE_TEXT = "Description";

let carddecks = getSavedCardDecks();
let cardslot = getSavedCardSlot();
let cardeditflag = true; // true 보기, false 관리
let carddrag = null;
let cardsuppress = false;
let cardspin = 0;
let cardspinning = false;
let cardflipping = false;
let cardspinStart = 0;
let cardspinSteps = 0;
let cardspinPool = [];

document.getElementById("card-open").addEventListener("click", onClickCardOpen);
document.getElementById("card-close").addEventListener("click", onClickCardClose);
cardmanage.addEventListener("click", onClickCardManage);
cardready.addEventListener("click", onClickCardReady);
cardrepeatable.addEventListener("change", onChangeCardRepeatable);
document.getElementById("card-reset").addEventListener("click", onClickCardReset);
cardplay.addEventListener("click", onClickCardPlay);
cardconfirm.addEventListener("click", onClickCardConfirm);
document.getElementById("card-confirm-no").addEventListener("click", onClickCardConfirmNo);
document.getElementById("card-confirm-ok").addEventListener("click", onClickCardConfirmOk);
document.addEventListener("pointerdown", onPointerDownCardEdit, true);
window.addEventListener("resize", onResizeCard);

if (firstCardDeck() < 0) {
    carddecks[0] = makeCardDeck(trumpCardSlots());
    cardslot = 0;
    setLocalCardDecks();
    setLocalCardSlot();
} else if (cardslot < 0 || !carddecks[cardslot]) {
    cardslot = firstCardDeck();
}

function onClickCardOpen() {
    card.style.display = "block";
    cardright.style.visibility = "hidden";
    cardgreeting.style.visibility = "hidden";
    printCardBar();
    printCardMain();
}

function onClickCardClose() {
    cancelCardSpin();
    closeCardConfirm();
    if (cardeditflag == false) {
        cardmanage.click();
    }
    cardright.style.visibility = "visible";
    cardgreeting.style.visibility = "visible";
    card.style.display = "none";
}

function onClickCardManage() {
    if (cardeditflag == true) {
        cardmanageicon.setAttribute("name", "checkmark-circle-outline");
        cardmanage.style.opacity = "100%";
        cardmanage.style.color = "Lime";
        cardmanage.title = "DONE";
        cardeditflag = false;
    } else {
        setLocalCardDecks();
        cardmanageicon.setAttribute("name", "add-circle-outline");
        cardmanage.style.opacity = "30%";
        cardmanage.style.color = "white";
        cardmanage.title = "EDIT";
        cardeditflag = true;
    }
    printCardBar();
}

function finishCardManage() {
    if (cardeditflag == false) {
        onClickCardManage();
    }
}

function onClickCardReady() {
    const deck = currentCardDeck();
    if (!deck || !deckHasCard(deck)) {
        return;
    }
    finishCardManage();
    deck.mode = "draw";
    setLocalCardDecks();
    printCardMain();
}

function onChangeCardRepeatable() {
    const deck = currentCardDeck();
    if (!deck) {
        return;
    }
    deck.repeatable = cardrepeatable.checked;
    setLocalCardDecks();
}

function onClickCardReset() {
    if (!currentCardDeck()) {
        return;
    }
    const spinning = cardspinning || cardflipping;
    cancelCardSpin();
    if (spinning) {
        printCardDraw();
    }
    cardconfirm.style.display = "flex";
}

function onClickCardPlay() {
    const deck = currentCardDeck();
    if (!deck || cardspinning || cardflipping) {
        return;
    }
    const pool = cardPool(deck);
    if (!pool.length) {
        return;
    }
    cardspinPool = pool;
    cardspinSteps = 12 + Math.floor(Math.random() * 5);
    cardspinStart = performance.now();
    cardspinning = true;
    buildCardReel();
    paintCardReel(0);
    paintCardPlay();
    cardspin = window.requestAnimationFrame(onFrameCardSpin);
}

function onClickCardConfirm(event) {
    if (event.target.closest(".card-confirm-box")) {
        return;
    }
    closeCardConfirm();
}

function onClickCardConfirmNo(event) {
    event.stopPropagation();
    closeCardConfirm();
}

function onClickCardConfirmOk(event) {
    event.stopPropagation();
    const deck = currentCardDeck();
    closeCardConfirm();
    if (!deck) {
        return;
    }
    deck.drawn = [];
    deck.mode = "list";
    setLocalCardDecks();
    printCardMain();
}

function onResizeCard() {
    if (card.style.display === "none" || cardspinning) {
        return;
    }
    const deck = currentCardDeck();
    if (!deck || deck.mode !== "draw") {
        return;
    }
    paintCardReel(0);
}

function onClickCardDeck(event) {
    if (cardsuppress) {
        cardsuppress = false;
        return;
    }
    const index = Math.floor(event.currentTarget.closest(".card-slot").dataset.index);
    selectCardDeck(index);
}

function onClickCardAdd(event) {
    const index = Math.floor(event.currentTarget.closest(".card-slot").dataset.index);
    addCardDeck(index);
}

function onClickCardRemove(event) {
    event.stopPropagation();
    cancelCardSpin();
    closeCardConfirm();
    const index = Math.floor(event.currentTarget.closest(".card-slot").dataset.index);
    carddecks[index] = null;
    if (firstCardDeck() < 0) {
        carddecks[index] = makeCardDeck(trumpCardSlots());
        cardslot = index;
    } else if (cardslot == index) {
        cardslot = firstCardDeck();
    }
    setLocalCardSlot();
    setLocalCardDecks();
    printCardBar();
    printCardMain();
}

function onPointerDownCard(event) {
    if (cardeditflag == true || event.button !== 0 || carddrag) {
        return;
    }
    const launch = event.currentTarget;
    const slot = launch.closest(".card-slot");
    const index = Math.floor(slot.dataset.index);
    if (!carddecks[index]) {
        return;
    }
    const rect = launch.getBoundingClientRect();
    carddrag = {
        index: index,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        width: rect.width,
        height: rect.height,
        lifted: false,
        ghost: null,
        over: -1,
    };
    document.addEventListener("pointermove", onPointerMoveCard, true);
    document.addEventListener("pointerup", onPointerUpCard, true);
    document.addEventListener("pointercancel", onPointerCancelCard, true);
    document.addEventListener("keydown", onKeyDownCardDrag, true);
    try {
        launch.setPointerCapture(event.pointerId);
    } catch (error) {
        // 캡처가 거절되어도 문서 리스너로 드래그는 이어 간다.
    }
}

function onPointerMoveCard(event) {
    if (!carddrag || event.pointerId !== carddrag.pointerId) {
        return;
    }
    const movedX = Math.abs(event.clientX - carddrag.startX);
    const movedY = Math.abs(event.clientY - carddrag.startY);
    if (!carddrag.lifted) {
        if (movedX < CARD_DRAG_SLOP && movedY < CARD_DRAG_SLOP) {
            return;
        }
        liftCardGhost();
    }
    event.preventDefault();
    carddrag.ghost.style.left = (event.clientX - carddrag.offsetX) + "px";
    carddrag.ghost.style.top = (event.clientY - carddrag.offsetY) + "px";
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const slot = hit ? hit.closest(".card-slot") : null;
    const over = slot ? Math.floor(slot.dataset.index) : -1;
    paintCardDrop(over);
}

function onPointerUpCard(event) {
    if (!carddrag || event.pointerId !== carddrag.pointerId) {
        return;
    }
    const state = carddrag;
    endCardDrag();
    if (!state.lifted) {
        selectCardDeck(state.index);
        cardsuppress = true;
        window.setTimeout(function() {
            cardsuppress = false;
        }, 0);
        return;
    }
    cardsuppress = true;
    window.setTimeout(function() {
        cardsuppress = false;
    }, 0);
    cancelCardSpin();
    const from = state.index;
    const to = state.over;
    if (to < 0 || to == from || !carddecks[from]) {
        printCardBar();
        printCardMain();
        return;
    }
    const moving = carddecks[from];
    carddecks[from] = carddecks[to];
    carddecks[to] = moving;
    if (cardslot == from) {
        cardslot = to;
    } else if (cardslot == to) {
        cardslot = from;
    }
    setLocalCardSlot();
    setLocalCardDecks();
    printCardBar();
    printCardMain();
}

function onPointerCancelCard(event) {
    if (!carddrag || event.pointerId !== carddrag.pointerId) {
        return;
    }
    const lifted = carddrag.lifted;
    endCardDrag();
    if (lifted) {
        cardsuppress = true;
        window.setTimeout(function() {
            cardsuppress = false;
        }, 0);
        printCardBar();
    }
}

function onKeyDownCardDrag(event) {
    if (!carddrag || event.key !== "Escape") {
        return;
    }
    const lifted = carddrag.lifted;
    endCardDrag();
    if (lifted) {
        printCardBar();
    }
}

function onDblClickCardName(event) {
    const input = event.currentTarget;
    if (!input.readOnly) {
        return;
    }
    event.preventDefault();
    const index = indexAtClientX(input, event.clientX);
    input.readOnly = false;
    input.focus();
    input.setSelectionRange(index, index);
}

function onDblClickCardIcon() {
    const deck = currentCardDeck();
    if (!deck) {
        return;
    }
    const input = document.createElement("input");
    input.className = "card-icon-input";
    input.maxLength = CARD_ICON_MAX;
    input.value = deck.icon;
    input.autocomplete = "off";
    input.spellcheck = false;
    const button = cardhead.querySelector(".card-head-icon");
    if (!button) {
        return;
    }
    button.replaceWith(input);
    input.addEventListener("blur", onBlurCardIcon);
    input.addEventListener("keydown", onKeyDownCardRename);
    input.focus();
    input.select();
}

function onBlurCardName(event) {
    const deck = currentCardDeck();
    if (!deck) {
        return;
    }
    let name = clipCardText(event.currentTarget.value, CARD_NAME_MAX);
    if (!name) {
        name = CARD_DEFAULT_NAME;
    }
    deck.name = name;
    setLocalCardDecks();
    const selected = carddecksbox.querySelector(".card-slot.is-selected");
    if (selected) {
        const label = selected.querySelector(".card-slot-label");
        const button = selected.querySelector(".card-slot-btn");
        if (label) {
            label.textContent = name;
        }
        if (button) {
            button.title = name;
        }
    }
    printCardHead();
}

function onBlurCardIcon(event) {
    const deck = currentCardDeck();
    if (!deck) {
        return;
    }
    deck.icon = clipCardText(event.currentTarget.value, CARD_ICON_MAX);
    setLocalCardDecks();
    const selected = carddecksbox.querySelector(".card-slot.is-selected .card-slot-btn");
    if (selected) {
        paintDeckIcon(selected, deck.icon);
    }
    printCardHead();
}

function onKeyDownCardRename(event) {
    if (event.isComposing || event.keyCode === 229) {
        return;
    }
    if (event.key === "Enter") {
        event.currentTarget.blur();
    }
}

function onDblClickCardCell(event) {
    if (event.currentTarget.classList.contains("is-editing")) {
        return;
    }
    event.preventDefault();
    finishCardManage();
    openCardEditor(Math.floor(event.currentTarget.dataset.index));
}

function onFocusCardField(event) {
    event.currentTarget.placeholder = "";
}

function onBlurCardField(event) {
    const input = event.currentTarget;
    if (input.classList.contains("card-edit-label")) {
        input.placeholder = CARD_PLACE_LABEL;
    } else if (input.classList.contains("card-edit-icon")) {
        input.placeholder = CARD_PLACE_ICON;
    } else {
        input.placeholder = CARD_PLACE_TEXT;
    }
}

function onPointerDownCardEdit(event) {
    const cell = cardgrid.querySelector(".is-editing");
    if (!cell || cell.contains(event.target)) {
        return;
    }
    saveCardEditor(cell);
}

function onFocusOutCardEdit(event) {
    const cell = event.currentTarget;
    if (cell.contains(event.relatedTarget)) {
        return;
    }
    saveCardEditor(cell);
}

function saveCardEditor(cell) {
    const deck = currentCardDeck();
    if (!deck || !cell.isConnected) {
        return;
    }
    const index = Math.floor(cell.dataset.index);
    const inputs = cell.querySelectorAll("input");
    if (inputs.length < 3) {
        return;
    }
    deck.cards[index] = sanitizeCard({
        label: inputs[0].value,
        icon: inputs[1].value,
        text: inputs[2].value,
    });
    setLocalCardDecks();
    printCardGrid();
    cardready.disabled = !deckHasCard(deck);
}

function onKeyDownCardEdit(event) {
    // 한글 조합 중 Enter는 다음 칸으로 넘기지 않는다
    if (event.isComposing || event.keyCode === 229) {
        return;
    }
    if (event.key !== "Enter") {
        return;
    }
    const inputs = event.currentTarget.querySelectorAll("input");
    if (event.target === inputs[0]) {
        inputs[1].focus();
    } else if (event.target === inputs[1]) {
        inputs[2].focus();
    } else if (event.target === inputs[2]) {
        event.target.blur();
    }
}

function onFrameCardSpin(now) {
    if (!cardspinning) {
        return;
    }
    let t = (now - cardspinStart) / CARD_SPIN_MS;
    if (t > 1) {
        t = 1;
    }
    const eased = 1 - Math.pow(1 - t, 3);
    paintCardReel(eased * cardspinSteps);
    if (t < 1) {
        cardspin = window.requestAnimationFrame(onFrameCardSpin);
        return;
    }
    finishCardSpin();
}

function onTransitionEndCardFlip(event) {
    if (event.propertyName !== "transform") {
        return;
    }
    const item = event.currentTarget.closest(".card-reel-item");
    if (item) {
        item.classList.add("is-instant");
        item.classList.remove("is-reveal");
    }
    cardflipping = false;
    paintCardReel(0);
    paintCardPlay();
}

function printCardBar() {
    carddecksbox.replaceChildren();
    for (let i = 0; i < CARD_DECK_SLOTS; i++) {
        const deck = carddecks[i];
        const slot = document.createElement("div");
        slot.className = "card-slot";
        slot.dataset.index = String(i);
        if (i == cardslot) {
            slot.classList.add("is-selected");
        }
        if (deck) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "card-slot-btn";
            paintDeckIcon(button, deck.icon);
            button.title = deck.name;
            if (cardeditflag == true) {
                button.addEventListener("click", onClickCardDeck);
            } else {
                button.addEventListener("pointerdown", onPointerDownCard);
            }
            const label = document.createElement("span");
            label.className = "card-slot-label";
            label.textContent = deck.name;
            slot.appendChild(button);
            slot.appendChild(label);
            if (cardeditflag == false) {
                const remove = document.createElement("button");
                remove.type = "button";
                remove.className = "card-slot-remove";
                remove.title = "REMOVE";
                const removeIcon = document.createElement("ion-icon");
                removeIcon.setAttribute("name", "remove-circle");
                remove.appendChild(removeIcon);
                remove.addEventListener("click", onClickCardRemove);
                slot.appendChild(remove);
            }
        } else if (cardeditflag == false) {
            const add = document.createElement("button");
            add.type = "button";
            add.className = "card-slot-add";
            add.title = "ADD";
            const addIcon = document.createElement("ion-icon");
            addIcon.setAttribute("name", "add");
            add.appendChild(addIcon);
            add.addEventListener("click", onClickCardAdd);
            slot.appendChild(add);
        }
        carddecksbox.appendChild(slot);
    }
}

function printCardMain() {
    cardmain.classList.remove("is-list", "is-draw");
    const deck = currentCardDeck();
    if (!deck) {
        return;
    }
    if (deck.mode === "draw") {
        cardmain.classList.add("is-draw");
        printCardDraw();
        return;
    }
    cardmain.classList.add("is-list");
    printCardHead();
    printCardGrid();
    cardrepeatable.checked = deck.repeatable;
    cardready.disabled = !deckHasCard(deck);
}

function printCardHead() {
    const deck = currentCardDeck();
    cardhead.replaceChildren();
    if (!deck) {
        return;
    }
    const icon = document.createElement("button");
    icon.type = "button";
    icon.className = "card-head-icon";
    paintDeckIcon(icon, deck.icon);
    icon.title = "ICON";
    icon.addEventListener("dblclick", onDblClickCardIcon);
    const name = document.createElement("input");
    name.type = "text";
    name.className = "card-head-name";
    name.maxLength = CARD_NAME_MAX;
    name.value = deck.name;
    name.readOnly = true;
    name.autocomplete = "off";
    name.spellcheck = false;
    name.title = "NAME";
    name.addEventListener("dblclick", onDblClickCardName);
    name.addEventListener("keydown", onKeyDownCardRename);
    name.addEventListener("blur", onBlurCardName);
    cardhead.appendChild(icon);
    cardhead.appendChild(name);
}

function printCardGrid() {
    const deck = currentCardDeck();
    cardgrid.replaceChildren();
    if (!deck) {
        return;
    }
    for (let i = 0; i < CARD_SLOTS; i++) {
        const cell = document.createElement("div");
        cell.className = "card-cell";
        cell.dataset.index = String(i);
        const item = deck.cards[i];
        if (item) {
            cell.classList.add("is-filled");
        } else {
            cell.classList.add("is-empty");
        }
        appendCardFace(cell, item, !item);
        cell.addEventListener("dblclick", onDblClickCardCell);
        cardgrid.appendChild(cell);
    }
}

function printCardDraw() {
    const deck = currentCardDeck();
    if (!deck) {
        return;
    }
    const last = deck.drawn.length ? deck.drawn[deck.drawn.length - 1] : -1;
    const shown = last >= 0 ? deck.cards[last] : null;
    buildCardReel();
    if (shown) {
        revealCardReel(shown, false);
    } else {
        paintCardReel(0);
    }
    printCardDrawn(deck);
    paintCardPlay();
}

function printCardDrawn(deck) {
    carddrawn.replaceChildren();
    for (let i = 0; i < deck.drawn.length; i++) {
        const item = deck.cards[deck.drawn[i]];
        if (!item) {
            continue;
        }
        const mini = document.createElement("div");
        mini.className = "card-mini";
        appendCardFace(mini, item, false);
        carddrawn.appendChild(mini);
    }
    carddrawn.scrollLeft = carddrawn.scrollWidth;
}

function getSavedCardDecks() {
    const empty = emptyCardDecks();
    let saved = null;
    try {
        saved = JSON.parse(localStorage.getItem(KEY_CARDDECKS));
    } catch (error) {
        return empty;
    }
    if (!Array.isArray(saved)) {
        return empty;
    }
    const list = [];
    for (let i = 0; i < CARD_DECK_SLOTS; i++) {
        list.push(sanitizeDeck(saved[i]));
    }
    return list;
}

function getSavedCardSlot() {
    const raw = localStorage.getItem(KEY_CARD_SLOT);
    if (raw === null) {
        return -1;
    }
    const index = Math.floor(raw);
    if (index !== Math.floor(index) || index < 0 || index >= CARD_DECK_SLOTS) {
        return -1;
    }
    return index;
}

function setLocalCardDecks() {
    localStorage.setItem(KEY_CARDDECKS, JSON.stringify(carddecks));
}

function setLocalCardSlot() {
    localStorage.setItem(KEY_CARD_SLOT, String(cardslot));
}

function emptyCardDecks() {
    const list = [];
    for (let i = 0; i < CARD_DECK_SLOTS; i++) {
        list.push(null);
    }
    return list;
}

function emptyCardSlots() {
    const list = [];
    for (let i = 0; i < CARD_SLOTS; i++) {
        list.push(null);
    }
    return list;
}

function trumpCardSlots() {
    const list = emptyCardSlots();
    let index = 0;
    for (let suit = 0; suit < CARD_SUITS.length; suit++) {
        for (let rank = 0; rank < CARD_RANKS.length; rank++) {
            list[index] = {
                label: CARD_RANKS[rank],
                icon: CARD_SUITS[suit],
                text: CARD_RANK_NAMES[rank],
            };
            index = index + 1;
        }
    }
    list[index] = { label: "Joker", icon: "\u{1F0CF}", text: "Joker" };
    list[index + 1] = { label: "Joker", icon: "\u{1F0CF}", text: "Joker" };
    return list;
}

function paintDeckIcon(parent, icon) {
    parent.replaceChildren();
    if (icon) {
        parent.textContent = icon;
        return;
    }
    const mark = document.createElement("ion-icon");
    mark.setAttribute("name", "apps-outline");
    parent.appendChild(mark);
}

function firstCardDeck() {
    for (let i = 0; i < CARD_DECK_SLOTS; i++) {
        if (carddecks[i]) {
            return i;
        }
    }
    return -1;
}

function currentCardDeck() {
    if (cardslot < 0) {
        return null;
    }
    return carddecks[cardslot] || null;
}

function makeCardDeck(cards) {
    return {
        name: CARD_DEFAULT_NAME,
        icon: CARD_DEFAULT_ICON,
        cards: cards,
        repeatable: false,
        mode: "list",
        drawn: [],
    };
}

function addCardDeck(index) {
    cancelCardSpin();
    closeCardConfirm();
    carddecks[index] = makeCardDeck(emptyCardSlots());
    cardslot = index;
    setLocalCardSlot();
    setLocalCardDecks();
    printCardBar();
    printCardMain();
}

function selectCardDeck(index) {
    if (!carddecks[index]) {
        return;
    }
    closeCardConfirm();
    // 같은 덱을 다시 눌러도 추첨 화면과 진행 중인 릴은 유지한다.
    if (index == cardslot) {
        if (cardspinning || cardflipping) {
            return;
        }
        printCardBar();
        printCardMain();
        return;
    }
    if (cardspinning || cardflipping) {
        cancelCardSpin();
    }
    cardslot = index;
    setLocalCardSlot();
    printCardBar();
    printCardMain();
}

function sanitizeDeck(item) {
    if (!item || typeof item !== "object") {
        return null;
    }
    const cards = emptyCardSlots();
    if (Array.isArray(item.cards)) {
        for (let i = 0; i < CARD_SLOTS; i++) {
            cards[i] = sanitizeCard(item.cards[i]);
        }
    }
    const repeatable = item.repeatable === true;
    let mode = "list";
    if (item.mode === "draw") {
        mode = "draw";
    }
    let name = clipCardText(item.name, CARD_NAME_MAX);
    if (!name) {
        name = CARD_DEFAULT_NAME;
    }
    const icon = clipCardText(item.icon, CARD_ICON_MAX);
    let drawn = [];
    if (mode === "draw") {
        drawn = sanitizeDrawn(item.drawn, cards, repeatable);
    }
    return {
        name: name,
        icon: icon,
        cards: cards,
        repeatable: repeatable,
        mode: mode,
        drawn: drawn,
    };
}

function sanitizeCard(item) {
    if (!item || typeof item !== "object") {
        return null;
    }
    const label = clipCardText(item.label, CARD_LABEL_MAX);
    const icon = clipCardText(item.icon, CARD_ICON_MAX);
    const text = clipCardText(item.text, CARD_TEXT_MAX);
    if (!label && !icon && !text) {
        return null;
    }
    return { label: label, icon: icon, text: text };
}

function sanitizeDrawn(raw, cards, repeatable) {
    const list = [];
    const seen = {};
    if (!Array.isArray(raw)) {
        return list;
    }
    for (let i = 0; i < raw.length; i++) {
        const index = Math.floor(raw[i]);
        if (index < 0 || index >= CARD_SLOTS) {
            continue;
        }
        if (!cards[index]) {
            continue;
        }
        if (!repeatable && seen[index]) {
            continue;
        }
        seen[index] = true;
        list.push(index);
    }
    return list;
}

function clipCardText(value, max) {
    if (typeof value !== "string") {
        return "";
    }
    const text = value.replace(/\s+/g, " ").trim();
    if (text.length <= max) {
        return text;
    }
    return text.slice(0, max);
}

function deckHasCard(deck) {
    for (let i = 0; i < CARD_SLOTS; i++) {
        if (deck.cards[i]) {
            return true;
        }
    }
    return false;
}

function cardPool(deck) {
    const used = {};
    if (!deck.repeatable) {
        for (let i = 0; i < deck.drawn.length; i++) {
            used[deck.drawn[i]] = true;
        }
    }
    const pool = [];
    for (let i = 0; i < CARD_SLOTS; i++) {
        if (!deck.cards[i]) {
            continue;
        }
        if (used[i]) {
            continue;
        }
        pool.push(i);
    }
    return pool;
}

function cardClip(text) {
    const span = document.createElement("span");
    span.className = "card-clip";
    span.textContent = text;
    return span;
}

function appendCardFace(parent, item, empty) {
    const label = document.createElement("button");
    label.type = "button";
    label.className = "card-face-label";
    const icon = document.createElement("div");
    icon.className = "card-face-icon";
    const text = document.createElement("div");
    text.className = "card-face-text";
    const labelText = empty ? CARD_PLACE_LABEL : (item.label || "");
    const iconText = empty ? CARD_PLACE_ICON : (item.icon || "");
    const descText = empty ? CARD_PLACE_TEXT : (item.text || "");
    label.appendChild(cardClip(labelText));
    icon.appendChild(cardClip(iconText));
    text.appendChild(cardClip(descText));
    parent.appendChild(label);
    parent.appendChild(icon);
    parent.appendChild(text);
}

function openCardEditor(index) {
    const deck = currentCardDeck();
    if (!deck || index < 0 || index >= CARD_SLOTS) {
        return;
    }
    const cell = cardgrid.children[index];
    if (!cell || cell.classList.contains("is-editing")) {
        return;
    }
    const item = deck.cards[index] || { label: "", icon: "", text: "" };
    cell.classList.remove("is-empty", "is-filled");
    cell.classList.add("is-editing");
    const label = cardField("card-edit-label", CARD_LABEL_MAX, CARD_PLACE_LABEL, item.label);
    const icon = cardField("card-edit-icon", CARD_ICON_MAX, CARD_PLACE_ICON, item.icon);
    const text = cardField("card-edit-text", CARD_TEXT_MAX, CARD_PLACE_TEXT, item.text);
    cell.replaceChildren(label, icon, text, cardClearButton());
    cell.addEventListener("focusout", onFocusOutCardEdit);
    cell.addEventListener("keydown", onKeyDownCardEdit);
    label.focus();
}

function cardClearButton() {
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "card-cell-clear";
    clear.title = "REMOVE";
    const mark = document.createElement("ion-icon");
    mark.setAttribute("name", "remove-circle");
    clear.appendChild(mark);
    clear.addEventListener("click", onClickCardClear);
    return clear;
}

function onClickCardClear(event) {
    event.preventDefault();
    event.stopPropagation();
    const cell = event.currentTarget.closest(".card-cell");
    const deck = currentCardDeck();
    if (!deck || !cell) {
        return;
    }
    cell.removeEventListener("focusout", onFocusOutCardEdit);
    cell.removeEventListener("keydown", onKeyDownCardEdit);
    const index = Math.floor(cell.dataset.index);
    deck.cards[index] = null;
    const drawn = [];
    for (let i = 0; i < deck.drawn.length; i++) {
        if (deck.drawn[i] !== index) {
            drawn.push(deck.drawn[i]);
        }
    }
    deck.drawn = drawn;
    setLocalCardDecks();
    printCardGrid();
    cardready.disabled = !deckHasCard(deck);
}

function cardField(className, max, placeholder, value) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = className;
    input.maxLength = max;
    input.placeholder = placeholder;
    input.value = value || "";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.addEventListener("focus", onFocusCardField);
    input.addEventListener("blur", onBlurCardField);
    return input;
}

function buildCardReel() {
    cardreel.replaceChildren();
    for (let i = 0; i < CARD_REEL_COUNT; i++) {
        const lane = i - 3;
        const item = document.createElement("div");
        item.className = "card-reel-item";
        item.dataset.lane = String(lane);
        const inner = document.createElement("div");
        inner.className = "card-reel-inner";
        const back = document.createElement("div");
        back.className = "card-reel-back";
        const mark = document.createElement("span");
        mark.className = "card-reel-mark";
        mark.textContent = "?";
        back.appendChild(mark);
        const front = document.createElement("div");
        front.className = "card-reel-front";
        inner.appendChild(back);
        inner.appendChild(front);
        item.appendChild(inner);
        if (lane === 0) {
            inner.addEventListener("transitionend", onTransitionEndCardFlip);
        }
        cardreel.appendChild(item);
    }
}

function cardReelCenter() {
    return cardreel.querySelector('[data-lane="0"]');
}

function cardBaseSize() {
    const width = cardreel.clientWidth;
    const height = cardreel.clientHeight;
    // 양끝 배율 1, 간격 1.22. 다섯 장이 릴 가로를 채운다.
    let w = (width * 0.96) / (4 * 1.22 + 1);
    const maxW = height / (1.45 * 1.5);
    if (maxW > 0 && w > maxW * 0.96) {
        w = maxW * 0.96;
    }
    if (w < 1) {
        w = 1;
    }
    return { w: w, h: w * 1.45 };
}

// 가운데에 가까울수록 1.5, 한 칸 옆 1.2, 두 칸 밖 1.0. 볼록렌즈처럼 지나가며 커진다.
function cardLensScale(dist) {
    const away = Math.abs(dist);
    if (away >= 2) {
        return 1;
    }
    if (away >= 1) {
        return 1.2 - (away - 1) * 0.2;
    }
    return 1.5 - away * 0.3;
}

function paintCardReel(offset) {
    if (!cardreel.clientWidth || !cardreel.clientHeight) {
        return;
    }
    const size = cardBaseSize();
    const gap = size.w * 1.22;
    const cx = cardreel.clientWidth / 2;
    const cy = cardreel.clientHeight / 2;
    const whole = Math.floor(offset);
    const frac = offset - whole;
    const items = cardreel.children;
    for (let i = 0; i < items.length; i++) {
        const lane = i - 3;
        const dist = lane - frac;
        const away = Math.abs(dist);
        const scale = cardLensScale(dist);
        const item = items[i];
        let fade = 1;
        if (away > 2) {
            fade = 1 - (away - 2) * 2;
            if (fade < 0) {
                fade = 0;
            }
        }
        // 앞면이면 정사각형, 뒷면이면 길쭉한 카드. 이전 덱의 크기를 남기지 않는다.
        const faced = item.classList.contains("is-flipped");
        const boxW = faced ? size.h : size.w;
        const boxH = size.h;
        item.style.width = boxW + "px";
        item.style.height = boxH + "px";
        item.style.left = (cx + dist * gap - boxW / 2) + "px";
        item.style.top = (cy - boxH / 2) + "px";
        item.style.fontSize = ((faced ? size.h : size.w) * 0.34) + "px";
        item.style.transform = "scale(" + scale + ")";
        item.style.opacity = String(fade);
        item.style.zIndex = String(Math.floor(100 - away * 20));
    }
}

function revealCardReel(item, animate) {
    const center = cardReelCenter();
    if (!center || !item) {
        return;
    }
    const front = center.querySelector(".card-reel-front");
    front.replaceChildren();
    const label = document.createElement("div");
    label.className = "card-reel-label";
    label.appendChild(cardClip(item.label || ""));
    const icon = document.createElement("div");
    icon.className = "card-reel-icon";
    icon.appendChild(cardClip(item.icon || ""));
    const text = document.createElement("div");
    text.className = "card-reel-text";
    text.appendChild(cardClip(item.text || ""));
    front.appendChild(label);
    front.appendChild(icon);
    front.appendChild(text);
    if (!animate) {
        center.classList.add("is-instant");
        center.classList.add("is-flipped");
        paintCardReel(0);
        cardflipping = false;
        return;
    }
    center.classList.remove("is-instant");
    center.classList.add("is-reveal");
    cardflipping = true;
    window.requestAnimationFrame(function() {
        center.classList.add("is-flipped");
        paintCardReel(0);
    });
}

function finishCardSpin() {
    cardspinning = false;
    cardspin = 0;
    const deck = currentCardDeck();
    const pool = cardspinPool;
    if (!deck || !pool.length) {
        paintCardPlay();
        return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    deck.drawn.push(pick);
    setLocalCardDecks();
    paintCardReel(0);
    revealCardReel(deck.cards[pick], true);
    printCardDrawn(deck);
    paintCardPlay();
}

function paintCardPlay() {
    const deck = currentCardDeck();
    const blocked = !deck || cardspinning || cardflipping || cardPool(deck).length === 0;
    cardplay.disabled = blocked;
}

function cancelCardSpin() {
    cardspinning = false;
    cardflipping = false;
    if (cardspin) {
        window.cancelAnimationFrame(cardspin);
        cardspin = 0;
    }
}

function closeCardConfirm() {
    cardconfirm.style.display = "none";
}

function liftCardGhost() {
    const slot = carddecksbox.children[cardDragVisualIndex(carddrag.index)];
    const button = slot.querySelector(".card-slot-btn");
    const ghost = button.cloneNode(true);
    ghost.classList.add("card-slot-ghost");
    ghost.style.width = carddrag.width + "px";
    ghost.style.height = carddrag.height + "px";
    ghost.style.left = (carddrag.startX - carddrag.offsetX) + "px";
    ghost.style.top = (carddrag.startY - carddrag.offsetY) + "px";
    document.body.appendChild(ghost);
    carddrag.ghost = ghost;
    carddrag.lifted = true;
    slot.classList.add("is-dragging");
}

function cardDragVisualIndex(index) {
    let visual = 0;
    for (let i = 0; i < carddecksbox.children.length; i++) {
        if (Math.floor(carddecksbox.children[i].dataset.index) == index) {
            return i;
        }
        visual = visual + 1;
    }
    return visual;
}

function paintCardDrop(over) {
    if (carddrag.over == over) {
        return;
    }
    const prev = carddecksbox.querySelector(".is-drop");
    if (prev) {
        prev.classList.remove("is-drop");
    }
    carddrag.over = over;
    if (over < 0 || over == carddrag.index) {
        return;
    }
    const slot = carddecksbox.children[cardDragVisualIndex(over)];
    if (slot) {
        slot.classList.add("is-drop");
    }
}

function endCardDrag() {
    if (carddrag && carddrag.ghost) {
        carddrag.ghost.remove();
    }
    const prev = carddecksbox.querySelector(".is-drop");
    if (prev) {
        prev.classList.remove("is-drop");
    }
    const dragging = carddecksbox.querySelector(".is-dragging");
    if (dragging) {
        dragging.classList.remove("is-dragging");
    }
    carddrag = null;
    document.removeEventListener("pointermove", onPointerMoveCard, true);
    document.removeEventListener("pointerup", onPointerUpCard, true);
    document.removeEventListener("pointercancel", onPointerCancelCard, true);
    document.removeEventListener("keydown", onKeyDownCardDrag, true);
}
