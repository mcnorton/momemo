const infobelt = document.getElementById("info");
let savedPrompt = null;

window.addEventListener("beforeinstallprompt", beforeInstall);
window.addEventListener("appinstalled", onAppInstalled);

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(function(registration) {
            console.log('Service Worker Registered with scope:', registration.scope);
        }
        ).catch(function(error) {
            console.log('Service Worker Registration Failed:', error);
        });
}

function beforeInstall(event) {
    event.preventDefault();
    savedPrompt = event;
    createInstallButton();
}


function onAppInstalled() {
    console.log("Already Installed");
    savedPrompt = null;
    removeInstallButton();
}


async function onClickInstall() {
    if (savedPrompt === null) {
        return;
    }

    savedPrompt.prompt();

    const {outcome} = await savedPrompt.userChoice;

    if (outcome === 'accepted') {
        // 설치를 수락하면 버튼을 제거합니다.
        console.log('PWA Install Accepted');
        removeInstallButton();
        savedPrompt = null;
    } else if (outcome === 'dismissed') {
        // 설치를 취소하면 버튼을 남겨 다시 시도할 수 있게 합니다.
        console.log('PWA Install Dismissed');
    }
}

function createInstallButton() {
    // 이미 버튼이 있으면 중복 생성하지 않습니다.
    if (document.getElementById("install") !== null) {
        return;
    }

    const button = document.createElement("button");
    const ionicon = document.createElement("ion-icon");

    button.innerHTML = "INSTALL";
    button.className = "install";
    button.id = "install";

    ionicon.setAttribute("name", "download");

    button.addEventListener('click', onClickInstall);
    infobelt.appendChild(button);
    button.appendChild(ionicon);
}

function removeInstallButton() {
    const button = document.getElementById("install");
    if (button !== null) {
        button.remove();
    }
}