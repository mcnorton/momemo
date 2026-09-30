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
    sayname.readOnly = false;
    sayname.focus();
    placeNameCaret();
    setTimeout(function() {
        if (document.activeElement === sayname) {
            placeNameCaret();
        }
    }, 0);
}

function placeNameCaret() {
    const end = sayname.value.length;
    sayname.setSelectionRange(end, end);
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
