const readme = document.getElementById("readme");
const lovely = document.getElementById("lovely");
const lovelysong = new Audio("snd/macgyver1985.mp3");

lovelysong.loop = false;

readme.addEventListener("click", function() {
    window.open("https://github.com/mcnorton/mome/blob/master/README.md", "momemo_readme");
});

lovely.addEventListener("click", function() {
    window.open("https://ctee.kr/place/mcnorton", "momemo_ctee");
});

lovely.addEventListener("blur", function() {
    lovelysong.pause();
});

lovely.addEventListener("dblclick", function() {
    lovelysong.currentTime = 0;
    lovelysong.play();
});