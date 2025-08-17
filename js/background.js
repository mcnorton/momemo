// 배경화면 목록입니다.
// 배경화면은 img 폴더에 저장되어 있습니다.
const images = [
    "",
    "grapefruit.jpg",
    "summer.png",
    "bloom.jpg",
    "spring.jpg",
    "aibook.jpg",
    "rain.jpg",
    "tulips_y.jpg",
    "tulips_w.jpg",
    "leaves.jpg",
    "art.jpg",
    "geo.png",
    "gwanghwa.jpg",
    "dokdo.jpg"
]

const bglist = document.getElementById("bglist"); //
const background = document.body; // 배경화면을 보여줄 HTML요소입니다.
const KEY_BGNAME = "background"; // 배경화면을 저장할 키값입니다.
const bgDir = "img/"; // 배경화면이 저장된 폴더입니다.

let savedBGname = localStorage.getItem(KEY_BGNAME);
let bgImage;

// 배경 목록을 불러옵니다.
// 오프라인일 때, 보케 이미지를 기본값으로 보여줍니다.
// 온라인일 때, 저장된 배경화면이 있으면 보여줍니다.
if (navigator.onLine) {

    // 배경 목록이 변경되어, 저장된 값보다 줄어들면 초기화합니다.
    // 배경수가 늘어났다면 변동이 있더라도 그냥 둡니다. 
    // 원치 않는 배경이미지가 보여게 되며, 무작위로 새로운 배경이미지를 소개할 수 있습니다.
    if (Math.floor(savedBGname) > images.length-1) {
        savedBGname = "";
        removeBG();
    }

    // 이미 저장된 배경화면이 있으면, 우선 보여줍니다.
    if (savedBGname === null || savedBGname == "") {
        bgImage = images[Math.floor(Math.random()*(images.length-1)+1)];
    } else {
        bgImage = images[Math.floor(savedBGname)];
    }

} else {
    // 오프라인 상태에서 캐시된 배경화면을 보여줍니다.
    bgImage = "bokeh.jpg";
}

// 배경화면을 보여줍니다.
loadBG();



// images[] 갯수만큼 * 표시 버튼을 생성합니다
images.forEach(printBGbutton);

function printBGbutton(imgList) {
    const button = document.createElement("button");
    const span = document.createElement("span");
    const ionicon = document.createElement("ion-icon");

    if (imgList == "") {
        ionicon.setAttribute("name", "shuffle-outline");
        button.classList.add("bgShuffle");
        button.value = "";
    } else {
        ionicon.setAttribute("name", "ellipse");
        button.classList.add("bgButton");
        button.value = images.indexOf(imgList);
    }

    button.addEventListener("click", changeBG);
    span.appendChild(ionicon);
    button.appendChild(span);
    bglist.appendChild(button);
}

// 배경화면을 불러옵니다.
// 배경화면의 밝기를 어둡게 하여 글씨가 잘 보이도록 합니다.
// 배경화면은 img 폴더에 저장되어 있습니다.
function loadBG() {
    background.style.backgroundImage = `linear-gradient( rgba(0,0,0, 0.5), rgba(0,0,0, 0.5) ), url('${bgDir}${bgImage}')`;
}

// 배경화면을 변경합니다.
// 버튼을 클릭하면, 해당 배경화면을 보여줍니다.
function changeBG(event) {
    const clickButton = event.target;

    if (clickButton.value == "") {
        bgImage = images[Math.floor(Math.random()*(images.length-1)+1)];
        removeBG();
    } else {
        bgImage = images[Math.floor(clickButton.value)];
        savedBGname = clickButton.value;
        saveBG();
    }

    loadBG();
}

// 배경화면을 저장합니다.
// 배경화면을 저장하면, 다음에 페이지를 열 때, 저장된 배경화면을 보여줍니다.
function saveBG() {
    localStorage.setItem(KEY_BGNAME, savedBGname);
}

// 배경화면을 삭제합니다.
// 배경화면을 삭제하면, 다음에 페이지를 열 때, 기본 배경화면을 무작위로 보여줍니다.
function removeBG() {
    localStorage.removeItem(KEY_BGNAME);
}