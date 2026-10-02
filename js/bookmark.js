// 자주 가는 사이트. 8×4 파비콘 보드. 편집을 끝내면 localStorage 에 저장한다.
const bookmark = document.getElementById("bookmark");
const bookmarkboard = document.getElementById("bookmark-board");
const bookmarkdialog = document.getElementById("bookmark-dialog");
const bookmarkurl = document.getElementById("bookmark-url");
const bookmarkpreviewicon = document.getElementById("bookmark-preview-icon");
const bookmarkpreviewtitle = document.getElementById("bookmark-preview-title");
const bookmarksave = document.getElementById("bookmark-save");
const bookmarksaveicon = document.querySelector("#bookmark-save > ion-icon");
const bookmarkedit = document.getElementById("bookmark-edit");
const bookmarkediticon = document.querySelector("#bookmark-edit > ion-icon");
const bookmarkright = document.getElementById("right");
const bookmarkgreeting = document.getElementById("greeting");

const KEY_BOOKMARKS = "bookmarks";
const BOOKMARK_COLS = 8;
const BOOKMARK_ROWS = 4;
const BOOKMARK_SLOTS = BOOKMARK_COLS * BOOKMARK_ROWS;
const BOOKMARK_TITLE_MAX = 80;
const BOOKMARK_URL_PLACEHOLDER = "Enter the URL here... https://...";
const BOOKMARK_DRAG_SLOP = 8;

let bookmarks = getSavedBookmarks();
let bookmarkeditflag = true; // true 보기, false 편집
let bookmarkslot = -1;
let bookmarkmeta = { title: "", icon: "" };
let bookmarkfetchid = 0;
let bookmarktimer = 0;
let bookmarkdrag = null;
let bookmarksuppress = false;

document.getElementById("bookmark-open").addEventListener("click", onClickBookmarkOpen);
document.getElementById("bookmark-close").addEventListener("click", onClickBookmarkClose);
bookmarkedit.addEventListener("click", onClickBookmarkEdit);
bookmarksave.addEventListener("click", onClickBookmarkSave);
bookmarkurl.addEventListener("input", onInputBookmarkUrl);
bookmarkurl.addEventListener("focus", onFocusBookmarkUrl);
bookmarkurl.addEventListener("blur", onBlurBookmarkUrl);
bookmark.addEventListener("click", onClickBookmarkBackdrop);
bookmarkdialog.addEventListener("click", onClickBookmarkDialog);

printBookmark();

function onClickBookmarkOpen() {
    bookmark.style.display = "block";
    bookmarkright.style.visibility = "hidden";
    bookmarkgreeting.style.visibility = "hidden";
    printBookmark();
}

function onClickBookmarkClose() {
    if (bookmarkeditflag == false) {
        bookmarkedit.click();
    }
    closeBookmarkDialog();
    bookmarkright.style.visibility = "visible";
    bookmarkgreeting.style.visibility = "visible";
    bookmark.style.display = "none";
}

function onClickBookmarkEdit() {
    if (bookmarkeditflag == true) {
        bookmarkediticon.setAttribute("name", "checkmark-circle-outline");
        bookmarkedit.style.opacity = "100%";
        bookmarkedit.style.color = "Lime";
        bookmarkedit.title = "DONE";
        bookmarkeditflag = false;
    } else {
        setLocalBookmarks();
        bookmarkediticon.setAttribute("name", "add-circle-outline");
        bookmarkedit.style.opacity = "30%";
        bookmarkedit.style.color = "white";
        bookmarkedit.title = "EDIT";
        bookmarkeditflag = true;
        closeBookmarkDialog();
    }
    printBookmark();
}

function onClickBookmarkSave() {
    const url = normalizeBookmarkUrl(bookmarkurl.value);
    if (!url || bookmarkslot < 0) {
        return;
    }
    if (!bookmarkmeta.title) {
        bookmarkmeta.title = bookmarkHostname(url);
    }
    bookmarks[bookmarkslot] = {
        url: url,
        title: clipBookmarkTitle(bookmarkmeta.title),
        icon: bookmarkmeta.icon || "",
    };
    closeBookmarkDialog();
    printBookmark();
}

function onInputBookmarkUrl() {
    const url = normalizeBookmarkUrl(bookmarkurl.value);
    paintBookmarkUrlState(url);
    bookmarkmeta = { title: "", icon: "" };
    paintBookmarkPreview();
    window.clearTimeout(bookmarktimer);
    bookmarkfetchid = bookmarkfetchid + 1;
    if (!url) {
        return;
    }
    const fetchid = bookmarkfetchid;
    bookmarktimer = window.setTimeout(function() {
        loadBookmarkMeta(url, fetchid);
    }, 400);
}

function onFocusBookmarkUrl() {
    bookmarkurl.placeholder = "";
}

function onBlurBookmarkUrl() {
    bookmarkurl.placeholder = BOOKMARK_URL_PLACEHOLDER;
}

function onClickBookmarkBackdrop(event) {
    if (bookmarkslot < 0) {
        return;
    }
    if (bookmarkdialog.contains(event.target)) {
        return;
    }
    if (event.target.closest(".bookmark-cell")) {
        return;
    }
    if (event.target.closest("#bookmark-edit") || event.target.closest("#bookmark-close")) {
        return;
    }
    closeBookmarkDialog();
}

function onClickBookmarkDialog(event) {
    event.stopPropagation();
}

function onClickBookmarkLaunch(event) {
    if (bookmarksuppress) {
        bookmarksuppress = false;
        return;
    }
    // 편집 중 클릭은 pointerup 에서 대화창으로 연다.
    if (bookmarkeditflag == false) {
        return;
    }
    const index = Math.floor(event.currentTarget.closest(".bookmark-cell").dataset.index);
    const item = bookmarks[index];
    if (!item) {
        return;
    }
    window.open(item.url, "_blank", "noopener,noreferrer");
}

function onClickBookmarkAdd(event) {
    const index = Math.floor(event.currentTarget.closest(".bookmark-cell").dataset.index);
    openBookmarkDialog(index);
}

function onClickBookmarkRemove(event) {
    event.stopPropagation();
    const index = Math.floor(event.currentTarget.closest(".bookmark-cell").dataset.index);
    bookmarks[index] = null;
    if (bookmarkslot == index) {
        closeBookmarkDialog();
    }
    printBookmark();
}

function onErrorBookmarkIcon(event) {
    const wrap = event.currentTarget.parentElement;
    if (!wrap) {
        return;
    }
    const ion = document.createElement("ion-icon");
    ion.setAttribute("name", "link-outline");
    wrap.replaceChildren(ion);
}

function onPointerDownBookmark(event) {
    if (bookmarkeditflag == true || event.button !== 0 || bookmarkdrag) {
        return;
    }
    const launch = event.currentTarget;
    const cell = launch.closest(".bookmark-cell");
    const index = Math.floor(cell.dataset.index);
    if (!bookmarks[index]) {
        return;
    }
    const rect = launch.getBoundingClientRect();
    bookmarkdrag = {
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
    document.addEventListener("pointermove", onPointerMoveBookmark, true);
    document.addEventListener("pointerup", onPointerUpBookmark, true);
    document.addEventListener("pointercancel", onPointerCancelBookmark, true);
    document.addEventListener("keydown", onKeyDownBookmarkDrag, true);
    try {
        launch.setPointerCapture(event.pointerId);
    } catch (error) {
        // 캡처가 거절되어도 문서 리스너로 드래그는 이어 간다.
    }
}

function onPointerMoveBookmark(event) {
    if (!bookmarkdrag || event.pointerId !== bookmarkdrag.pointerId) {
        return;
    }
    const movedX = Math.abs(event.clientX - bookmarkdrag.startX);
    const movedY = Math.abs(event.clientY - bookmarkdrag.startY);
    if (!bookmarkdrag.lifted) {
        if (movedX < BOOKMARK_DRAG_SLOP && movedY < BOOKMARK_DRAG_SLOP) {
            return;
        }
        liftBookmarkGhost();
    }
    event.preventDefault();
    bookmarkdrag.ghost.style.left = (event.clientX - bookmarkdrag.offsetX) + "px";
    bookmarkdrag.ghost.style.top = (event.clientY - bookmarkdrag.offsetY) + "px";
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const cell = hit ? hit.closest(".bookmark-cell") : null;
    const over = cell ? Math.floor(cell.dataset.index) : -1;
    paintBookmarkDrop(over);
}

function onPointerUpBookmark(event) {
    if (!bookmarkdrag || event.pointerId !== bookmarkdrag.pointerId) {
        return;
    }
    const state = bookmarkdrag;
    endBookmarkDrag();
    if (!state.lifted) {
        openBookmarkDialog(state.index);
        bookmarksuppress = true;
        window.setTimeout(function() {
            bookmarksuppress = false;
            if (bookmarkslot >= 0) {
                bookmarkurl.focus();
            }
        }, 0);
        return;
    }
    bookmarksuppress = true;
    window.setTimeout(function() {
        bookmarksuppress = false;
    }, 0);
    const from = state.index;
    const to = state.over;
    if (to < 0 || to == from || !bookmarks[from]) {
        printBookmark();
        return;
    }
    const moving = bookmarks[from];
    bookmarks[from] = bookmarks[to];
    bookmarks[to] = moving;
    printBookmark();
}

function onPointerCancelBookmark(event) {
    if (!bookmarkdrag || event.pointerId !== bookmarkdrag.pointerId) {
        return;
    }
    const lifted = bookmarkdrag.lifted;
    endBookmarkDrag();
    if (lifted) {
        bookmarksuppress = true;
        window.setTimeout(function() {
            bookmarksuppress = false;
        }, 0);
        printBookmark();
    }
}

function onKeyDownBookmarkDrag(event) {
    if (!bookmarkdrag || event.key !== "Escape") {
        return;
    }
    const lifted = bookmarkdrag.lifted;
    endBookmarkDrag();
    if (lifted) {
        printBookmark();
    }
}

function printBookmark() {
    bookmarkboard.replaceChildren();
    for (let i = 0; i < BOOKMARK_SLOTS; i++) {
        const cell = document.createElement("div");
        cell.className = "bookmark-cell";
        cell.dataset.index = String(i);
        const item = bookmarks[i];
        if (item) {
            const slot = document.createElement("div");
            slot.className = "bookmark-slot";
            const launch = document.createElement("button");
            launch.type = "button";
            launch.className = "bookmark-launch";
            launch.title = item.title || item.url;
            const iconWrap = document.createElement("span");
            iconWrap.className = "bookmark-icon";
            if (item.icon) {
                const img = document.createElement("img");
                img.alt = "";
                img.draggable = false;
                img.referrerPolicy = "no-referrer";
                img.src = item.icon;
                img.addEventListener("error", onErrorBookmarkIcon);
                iconWrap.appendChild(img);
            } else {
                const ion = document.createElement("ion-icon");
                ion.setAttribute("name", "link-outline");
                iconWrap.appendChild(ion);
            }
            const label = document.createElement("span");
            label.className = "bookmark-label";
            label.textContent = item.title;
            launch.appendChild(iconWrap);
            launch.appendChild(label);
            launch.addEventListener("click", onClickBookmarkLaunch);
            slot.appendChild(launch);
            if (bookmarkeditflag == false) {
                launch.addEventListener("pointerdown", onPointerDownBookmark);
                const remove = document.createElement("button");
                remove.type = "button";
                remove.className = "bookmark-remove";
                remove.title = "REMOVE";
                const removeIcon = document.createElement("ion-icon");
                removeIcon.setAttribute("name", "remove-circle");
                remove.appendChild(removeIcon);
                remove.addEventListener("click", onClickBookmarkRemove);
                slot.appendChild(remove);
            }
            cell.appendChild(slot);
        } else if (bookmarkeditflag == false) {
            const add = document.createElement("button");
            add.type = "button";
            add.className = "bookmark-add";
            add.title = "ADD";
            const addIcon = document.createElement("ion-icon");
            addIcon.setAttribute("name", "add");
            add.appendChild(addIcon);
            add.addEventListener("click", onClickBookmarkAdd);
            cell.appendChild(add);
        }
        bookmarkboard.appendChild(cell);
    }
}

function getSavedBookmarks() {
    const empty = [];
    for (let i = 0; i < BOOKMARK_SLOTS; i++) {
        empty.push(null);
    }
    let saved = null;
    try {
        saved = JSON.parse(localStorage.getItem(KEY_BOOKMARKS));
    } catch (error) {
        return empty;
    }
    if (!Array.isArray(saved) || saved.length !== BOOKMARK_SLOTS) {
        return empty;
    }
    const list = [];
    for (let i = 0; i < BOOKMARK_SLOTS; i++) {
        list.push(sanitizeBookmark(saved[i]));
    }
    return list;
}

function setLocalBookmarks() {
    localStorage.setItem(KEY_BOOKMARKS, JSON.stringify(bookmarks));
}

function sanitizeBookmark(item) {
    if (!item || typeof item.url !== "string") {
        return null;
    }
    const url = normalizeBookmarkUrl(item.url);
    if (!url) {
        return null;
    }
    const title = clipBookmarkTitle(typeof item.title === "string" ? item.title : bookmarkHostname(url));
    let icon = "";
    if (typeof item.icon === "string" && item.icon) {
        icon = resolveBookmarkUrl(item.icon, url);
    }
    return { url: url, title: title || bookmarkHostname(url), icon: icon };
}

function normalizeBookmarkUrl(raw) {
    let text = (raw || "").trim();
    if (!text) {
        return "";
    }
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(text)) {
        text = "https://" + text;
    }
    try {
        const parsed = new URL(text);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return "";
        }
        if (!parsed.hostname) {
            return "";
        }
        if (parsed.hostname.indexOf(".") < 0 && parsed.hostname !== "localhost") {
            return "";
        }
        return parsed.href;
    } catch (error) {
        return "";
    }
}

function clipBookmarkTitle(title) {
    const text = (title || "").replace(/\s+/g, " ").trim();
    if (text.length <= BOOKMARK_TITLE_MAX) {
        return text;
    }
    return text.slice(0, BOOKMARK_TITLE_MAX);
}

function bookmarkHostname(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch (error) {
        return "";
    }
}

/* 루트 /favicon.ico 하나만 쓰던 주소. 이제 commonBookmarkIconUrls 목록에 포함된다.
function bookmarkFaviconUrl(url) {
    return new URL(url).origin + "/favicon.ico";
}
*/

function resolveBookmarkUrl(href, base) {
    try {
        const resolved = new URL(href, base);
        if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
            return "";
        }
        return resolved.href;
    } catch (error) {
        return "";
    }
}

function openBookmarkDialog(index) {
    bookmarkslot = index;
    const item = bookmarks[index];
    bookmarkfetchid = bookmarkfetchid + 1;
    window.clearTimeout(bookmarktimer);
    if (item) {
        bookmarkmeta = { title: item.title, icon: item.icon };
        bookmarkurl.value = item.url;
        bookmarksaveicon.setAttribute("name", "checkmark");
        bookmarksave.title = "SAVE";
    } else {
        bookmarkmeta = { title: "", icon: "" };
        bookmarkurl.value = "";
        bookmarksaveicon.setAttribute("name", "add");
        bookmarksave.title = "ADD";
    }
    paintBookmarkUrlState(normalizeBookmarkUrl(bookmarkurl.value));
    paintBookmarkPreview();
    if (item && item.icon) {
        probeBookmarkIcon(bookmarkfetchid);
    }
    bookmarkdialog.style.display = "flex";
    if (item) {
        bookmarkurl.focus();
    }
}

function closeBookmarkDialog() {
    bookmarkslot = -1;
    bookmarkfetchid = bookmarkfetchid + 1;
    window.clearTimeout(bookmarktimer);
    bookmarkmeta = { title: "", icon: "" };
    bookmarkurl.value = "";
    bookmarkurl.placeholder = BOOKMARK_URL_PLACEHOLDER;
    paintBookmarkUrlState("");
    paintBookmarkPreview();
    bookmarkdialog.style.display = "none";
}

function loadBookmarkMeta(url, fetchid) {
    fetch(url, {
        method: "GET",
        credentials: "omit",
        redirect: "follow",
        referrerPolicy: "no-referrer",
    })
        .then(function(response) {
            if (!response.ok) {
                throw new Error("status");
            }
            return response.text().then(function(html) {
                return { html: html, finalUrl: response.url || url };
            });
        })
        .then(function(pack) {
            if (!pack || fetchid !== bookmarkfetchid) {
                return;
            }
            const parsed = parseBookmarkHtml(pack.html, pack.finalUrl);
            bookmarkmeta = { title: parsed.title, icon: "" };
            paintBookmarkPreview();
            probeBookmarkIcons(fetchid, parsed.icons, 0);
        })
        .catch(function() {
            if (fetchid !== bookmarkfetchid) {
                return;
            }
            applyBookmarkFallback(url, fetchid);
        });
}

function applyBookmarkFallback(url, fetchid) {
    bookmarkmeta = {
        title: bookmarkHostname(url),
        icon: "",
    };
    paintBookmarkPreview();
    probeBookmarkIcons(fetchid, commonBookmarkIconUrls(url), 0);
}

function parseBookmarkHtml(html, finalUrl) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const ogTitle = bookmarkMetaContent(doc, "og:title");
    const docTitle = doc.querySelector("title");
    let title = ogTitle;
    if (!title && docTitle) {
        title = docTitle.textContent || "";
    }
    if (!title) {
        title = bookmarkHostname(finalUrl);
    }
    return {
        title: clipBookmarkTitle(title),
        icons: collectBookmarkIcons(doc, finalUrl),
    };
}

function bookmarkMetaContent(doc, property) {
    const node = doc.querySelector('meta[property="' + property + '"], meta[name="' + property + '"]');
    if (!node) {
        return "";
    }
    return (node.getAttribute("content") || "").trim();
}

function collectBookmarkIcons(doc, finalUrl) {
    const apple = [];
    const icons = [];
    const links = doc.querySelectorAll("link[rel]");
    for (let i = 0; i < links.length; i++) {
        const rel = (links[i].getAttribute("rel") || "").toLowerCase();
        if (rel.indexOf("icon") < 0 || rel.indexOf("mask-icon") >= 0) {
            continue;
        }
        const href = links[i].getAttribute("href");
        if (!href) {
            continue;
        }
        const resolved = resolveBookmarkUrl(href, finalUrl);
        if (!resolved) {
            continue;
        }
        const sizes = links[i].getAttribute("sizes") || "";
        const matched = sizes.match(/(\d+)/);
        let size = 0;
        if (matched) {
            size = Math.floor(matched[1]);
        }
        const item = {
            url: resolved,
            size: size,
            ico: bookmarkIconIsIco(resolved),
        };
        if (rel.indexOf("apple-touch-icon") >= 0) {
            apple.push(item);
        } else {
            icons.push(item);
        }
    }
    apple.sort(function(a, b) {
        return b.size - a.size;
    });
    icons.sort(function(a, b) {
        if (a.ico !== b.ico) {
            return a.ico ? 1 : -1;
        }
        return b.size - a.size;
    });
    const urls = [];
    for (let i = 0; i < apple.length; i++) {
        urls.push(apple[i].url);
    }
    for (let i = 0; i < icons.length; i++) {
        urls.push(icons[i].url);
    }
    const tileNames = [
        "msapplication-TileImage",
        "msapplication-square310x310logo",
        "msapplication-square150x150logo",
        "msapplication-wide310x150logo",
    ];
    for (let i = 0; i < tileNames.length; i++) {
        const tile = bookmarkMetaContent(doc, tileNames[i]);
        if (tile) {
            urls.push(resolveBookmarkUrl(tile, finalUrl));
        }
    }
    const commons = commonBookmarkIconUrls(finalUrl);
    for (let i = 0; i < commons.length; i++) {
        urls.push(commons[i]);
    }
    const ogImage = bookmarkMetaContent(doc, "og:image");
    if (ogImage) {
        urls.push(resolveBookmarkUrl(ogImage, finalUrl));
    }
    return uniqueBookmarkIcons(urls);
}

function bookmarkIconIsIco(url) {
    const path = url.split("?")[0].toLowerCase();
    return path.lastIndexOf(".ico") === path.length - 4;
}

function commonBookmarkIconUrls(pageUrl) {
    let origin = "";
    try {
        origin = new URL(pageUrl).origin;
    } catch (error) {
        return [];
    }
    // HTML을 못 읽으면 link 태그를 모르므로, 표준 경로와 라이믹스(XE) 아이콘 경로를 순서대로 시도한다.
    const names = [
        "/apple-touch-icon.png",
        "/apple-touch-icon-precomposed.png",
        "/files/attach/xeicon/mobicon.png",
        "/files/attach/xeicon/favicon.ico",
        "/apple-touch-icon-180x180.png",
        "/apple-touch-icon-152x152.png",
        "/android-chrome-192x192.png",
        "/favicon-32x32.png",
        "/favicon.png",
        "/favicon.ico",
    ];
    const urls = [];
    for (let i = 0; i < names.length; i++) {
        urls.push(origin + names[i]);
    }
    return urls;
}

function uniqueBookmarkIcons(urls) {
    const seen = {};
    const list = [];
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        if (!url || seen[url]) {
            continue;
        }
        seen[url] = true;
        list.push(url);
    }
    return list;
}

function probeBookmarkIcons(fetchid, urls, index) {
    if (fetchid !== bookmarkfetchid) {
        return;
    }
    const at = Math.floor(index);
    if (!urls || at >= urls.length) {
        bookmarkmeta.icon = "";
        paintBookmarkPreview();
        return;
    }
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.onload = function() {
        if (fetchid !== bookmarkfetchid) {
            return;
        }
        bookmarkmeta.icon = urls[at];
        paintBookmarkPreview();
    };
    img.onerror = function() {
        if (fetchid !== bookmarkfetchid) {
            return;
        }
        probeBookmarkIcons(fetchid, urls, at + 1);
    };
    img.src = urls[at];
}

function probeBookmarkIcon(fetchid) {
    if (!bookmarkmeta.icon) {
        paintBookmarkPreview();
        return;
    }
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.onload = function() {
        if (fetchid !== bookmarkfetchid) {
            return;
        }
        paintBookmarkPreview();
    };
    img.onerror = function() {
        if (fetchid !== bookmarkfetchid) {
            return;
        }
        bookmarkmeta.icon = "";
        paintBookmarkPreview();
    };
    img.src = bookmarkmeta.icon;
}

function paintBookmarkPreview() {
    bookmarkpreviewicon.replaceChildren();
    bookmarkpreviewtitle.textContent = bookmarkmeta.title || "";
    if (!bookmarkmeta.icon) {
        bookmarkpreviewicon.classList.add("is-empty");
        const ion = document.createElement("ion-icon");
        ion.setAttribute("name", "link-outline");
        bookmarkpreviewicon.appendChild(ion);
        return;
    }
    bookmarkpreviewicon.classList.remove("is-empty");
    const img = document.createElement("img");
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.src = bookmarkmeta.icon;
    img.addEventListener("error", function() {
        if (!img.isConnected || bookmarkmeta.icon !== img.src) {
            return;
        }
        bookmarkmeta.icon = "";
        paintBookmarkPreview();
    });
    bookmarkpreviewicon.appendChild(img);
}

function paintBookmarkUrlState(url) {
    bookmarkurl.classList.remove("is-valid", "is-invalid");
    const typed = bookmarkurl.value.trim();
    if (!typed) {
        bookmarksave.disabled = true;
        return;
    }
    if (url) {
        bookmarkurl.classList.add("is-valid");
        bookmarksave.disabled = false;
    } else {
        bookmarkurl.classList.add("is-invalid");
        bookmarksave.disabled = true;
    }
}

function liftBookmarkGhost() {
    const cell = bookmarkboard.children[bookmarkdrag.index];
    const launch = cell.querySelector(".bookmark-launch");
    const ghost = launch.cloneNode(true);
    ghost.classList.add("bookmark-ghost");
    ghost.style.width = bookmarkdrag.width + "px";
    ghost.style.height = bookmarkdrag.height + "px";
    ghost.style.left = (bookmarkdrag.startX - bookmarkdrag.offsetX) + "px";
    ghost.style.top = (bookmarkdrag.startY - bookmarkdrag.offsetY) + "px";
    document.body.appendChild(ghost);
    bookmarkdrag.ghost = ghost;
    bookmarkdrag.lifted = true;
    cell.classList.add("is-dragging");
}

function paintBookmarkDrop(over) {
    if (bookmarkdrag.over == over) {
        return;
    }
    const prev = bookmarkboard.querySelector(".is-drop");
    if (prev) {
        prev.classList.remove("is-drop");
    }
    bookmarkdrag.over = over;
    if (over < 0 || over == bookmarkdrag.index) {
        return;
    }
    bookmarkboard.children[over].classList.add("is-drop");
}

function endBookmarkDrag() {
    if (bookmarkdrag && bookmarkdrag.ghost) {
        bookmarkdrag.ghost.remove();
    }
    const prev = bookmarkboard.querySelector(".is-drop");
    if (prev) {
        prev.classList.remove("is-drop");
    }
    const dragging = bookmarkboard.querySelector(".is-dragging");
    if (dragging) {
        dragging.classList.remove("is-dragging");
    }
    bookmarkdrag = null;
    document.removeEventListener("pointermove", onPointerMoveBookmark, true);
    document.removeEventListener("pointerup", onPointerUpBookmark, true);
    document.removeEventListener("pointercancel", onPointerCancelBookmark, true);
    document.removeEventListener("keydown", onKeyDownBookmarkDrag, true);
}
