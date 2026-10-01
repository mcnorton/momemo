const sayhello = document.querySelector("#greeting h4");
const sayname = document.querySelector("#greeting-name");

const KEY_USERNAME = "username";
const MAX_NAME = 80;
const question = [
    "What is your name?",
    "What is your goal for today?",
    "How is the weather?"
];

let todayquestion = question[Math.floor(Math.random() * question.length)];

sayname.addEventListener("dblclick", onDblClickName);
sayname.addEventListener("keydown", onKeyDownName);
sayname.addEventListener("focus", onFocusName);
sayname.addEventListener("blur", onBlurName);
document.addEventListener("pointerdown", onPointerDownName);

loadSavedName();
printSayhello();
setInterval(printSayhello, 1000 * 60 * 30);

function onDblClickName(event) {
    if (sayname.value.trim() === "") {
        return;
    }
    event.preventDefault();
    const index = indexAtClientX(sayname, event.clientX);
    sayname.readOnly = false;
    sayname.focus();
    sayname.setSelectionRange(index, index);
}

function indexAtClientX(input, clientX) {
    const text = input.value;
    if (text.length === 0) {
        return 0;
    }

    const style = getComputedStyle(input);
    const probe = document.createElement("span");
    probe.style.position = "absolute";
    probe.style.left = "-9999px";
    probe.style.visibility = "hidden";
    probe.style.whiteSpace = "pre";
    probe.style.font = style.font;
    probe.style.letterSpacing = style.letterSpacing;
    probe.style.wordSpacing = style.wordSpacing;
    document.body.appendChild(probe);

    try {
        const rect = input.getBoundingClientRect();
        const padLeft = parseFloat(style.paddingLeft);
        const padRight = parseFloat(style.paddingRight);
        const innerWidth = rect.width - padLeft - padRight;
        probe.textContent = text;
        const textWidth = probe.getBoundingClientRect().width;
        let textLeft = rect.left + padLeft - input.scrollLeft;
        if (style.textAlign === "center") {
            textLeft += (innerWidth - textWidth) / 2;
        } else if (style.textAlign === "right" || style.textAlign === "end") {
            textLeft += innerWidth - textWidth;
        }

        const x = clientX - textLeft;
        if (x <= 0) {
            return 0;
        }
        if (x >= textWidth) {
            return text.length;
        }

        // 클릭보다 너비가 커지는 첫 글자 경계
        let low = 0;
        let high = text.length;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            probe.textContent = text.slice(0, mid);
            if (probe.getBoundingClientRect().width < x) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        probe.textContent = text.slice(0, low);
        const at = probe.getBoundingClientRect().width;
        probe.textContent = text.slice(0, low - 1);
        const prev = probe.getBoundingClientRect().width;
        if (x - prev < at - x) {
            return low - 1;
        }
        return low;
    } finally {
        probe.remove();
    }
}

function onKeyDownName(event) {
    // 한글 조합 중 Enter는 입력 완료가 아니다
    if (event.isComposing || event.keyCode === 229) {
        return;
    }
    if (event.key !== "Enter") {
        return;
    }
    event.preventDefault();
    finishNameEdit();
    sayname.blur();
}

function onFocusName() {
    if (!sayname.readOnly) {
        sayname.placeholder = "";
    }
}

function onBlurName() {
    finishNameEdit();
}

function onPointerDownName(event) {
    if (event.target === sayname || sayname.readOnly) {
        return;
    }
    finishNameEdit();
}

function finishNameEdit() {
    if (sayname.readOnly) {
        return;
    }

    const name = clipName(sayname.value.trim());
    sayname.value = name;

    if (name === "") {
        localStorage.removeItem(KEY_USERNAME);
        sayname.readOnly = false;
        sayname.placeholder = todayquestion;
        return;
    }

    localStorage.setItem(KEY_USERNAME, name);
    sayname.readOnly = true;
}

function loadSavedName() {
    const savedUsername = localStorage.getItem(KEY_USERNAME);

    if (savedUsername === null || savedUsername.trim() === "") {
        sayname.value = "";
        sayname.readOnly = false;
        sayname.placeholder = todayquestion;
        return;
    }

    sayname.value = clipName(savedUsername.trim());
    sayname.readOnly = true;
}

function clipName(name) {
    if (name.length <= MAX_NAME) {
        return name;
    }
    return name.slice(0, MAX_NAME);
}

function printSayhello() {
    const date = new Date();
    const hour = Math.floor(date.getHours());
    let say = "Good Afternoon";

    if (hour < 12) {
        say = "Good Morning";
    } else if (hour >= 18) {
        say = "Good Evening";
    }

    sayhello.innerText = say;
}
