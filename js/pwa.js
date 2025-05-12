const infobelt = document.getElementById("info");
let savedPrompt = null;

window.addEventListener("beforeinstallprompt", beforeInstall);

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
    createInstallButton();
    event.preventDefault();
    savedPrompt = event;
}


function alreadyInstalled() {
    savedPrompt = null;
    console.log("Already Installed");
    install.hidden = true;
}


async function onClickInstall() {
    removeInstallButton();
    savedPrompt.prompt();

    const {outcome} = await savedPrompt.userChoice;

    if (outcome === 'accepted') {
        console.log('PWA Install Accepted');
    } else if (outcome === 'dismissed') {
        console.log('PWA Install Dismissed');
    }

    savedPrompt = null;

    /* Promise
    savedPrompt.userChoice.then(
    function(choiceAB){
        if (choiceAB.outcome === 'accepted') {
            install.hidden = true;
        } else {
            install.hidden = false;
        }
        savedPrompt = null;
    });
    */
}

function createInstallButton() {
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
    document.getElementById("install").remove();
}