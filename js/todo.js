const toDoForm = document.getElementById("todo-form");
const toDoInput = document.querySelector("#todo-form input");
const toDoList = document.getElementById("todo-list");
const KEY_TODOS = "todos";
const SLOWHIDE_CLASSNAME = "slowhide";
const FADE_MS = 40000;
const DRAG_START_PX = 4;
const PLACEHOLDER_LATER = "MoMemo...";
const PLACEHOLDER_MS = 30000;
let toDos = [];
let fadeTimers = {};
let dragState = null;
let toDoSeq = 0;

const savedToDos = localStorage.getItem(KEY_TODOS);

if (savedToDos !== null) {
    const parsedToDos = JSON.parse(savedToDos);
    toDos = parsedToDos;
    parsedToDos.forEach(printToDo);
}

toDoForm.addEventListener("submit", handleToDoSubmit);
document.addEventListener("keydown", onKeyDownToDoDrag);
setTimeout(showMemoPlaceholder, PLACEHOLDER_MS);



function showMemoPlaceholder() {
    toDoInput.placeholder = PLACEHOLDER_LATER;
}



function handleToDoSubmit(event) {
    event.preventDefault();

    const newTodo = toDoInput.value;
    toDoInput.value = "";

    const newTodoObj = {
        text: newTodo,
        id: nextToDoId(),
    };
    toDos.push(newTodoObj);
    printToDo(newTodoObj);
    saveToDos();
}



function nextToDoId() {
    const now = Date.now();
    if (now <= toDoSeq) {
        toDoSeq = toDoSeq + 1;
    } else {
        toDoSeq = now;
    }
    return toDoSeq;
}



function printToDo(newTodo) {
    const li = document.createElement("li");
    li.id = newTodo.id;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "todo-check";
    button.innerText = " ";
    button.addEventListener("click", onClickToDoCheck);

    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "todo-handle";
    handle.title = "DRAG TO REORDER";
    const handleIcon = document.createElement("ion-icon");
    handleIcon.setAttribute("name", "reorder-three-outline");
    handle.appendChild(handleIcon);
    handle.addEventListener("pointerdown", onPointerDownHandle);

    li.appendChild(button);
    li.appendChild(createToDoText(newTodo.text));
    li.appendChild(handle);
    li.addEventListener("dblclick", onDblClickToDo);
    toDoList.appendChild(li);
}



function createToDoText(text) {
    const span = document.createElement("span");
    span.className = "todo-text";
    span.innerText = text;
    return span;
}



function onClickToDoCheck(event) {
    const li = event.currentTarget.parentElement;
    if (li.classList.contains(SLOWHIDE_CLASSNAME)) {
        cancelFade(li);
    } else {
        beginFade(li);
    }
}



function beginFade(li) {
    const button = li.querySelector(".todo-check");
    if (!button.querySelector("ion-icon")) {
        const span = document.createElement("span");
        const ionicon = document.createElement("ion-icon");
        // 텍스트 체크마크 button.innerText = "✓";
        ionicon.setAttribute("name", "checkmark-sharp");
        span.appendChild(ionicon);
        button.appendChild(span);
    }
    li.classList.add(SLOWHIDE_CLASSNAME);

    const id = Math.floor(li.id);
    clearTimeout(fadeTimers[id]);
    fadeTimers[id] = setTimeout(function() {
        finishFade(li);
    }, FADE_MS);
}



function cancelFade(li) {
    const id = Math.floor(li.id);
    clearTimeout(fadeTimers[id]);
    delete fadeTimers[id];
    li.classList.remove(SLOWHIDE_CLASSNAME);
    const mark = li.querySelector(".todo-check span");
    if (mark) {
        mark.remove();
    }
}



function finishFade(li) {
    const id = Math.floor(li.id);
    clearTimeout(fadeTimers[id]);
    delete fadeTimers[id];
    if (dragState && dragState.li === li) {
        abortDrag();
    }
    li.remove();
    // 이전에는 체크 즉시 목록에서 빼고 30초 뒤에 화면에서 지웠다.
    // setTimeout(function() { li.remove(); }, 30000);
    // toDos = toDos.filter((toDo) => toDo.id !== parseInt(li.id));
    toDos = toDos.filter(function(toDo) {
        return toDo.id !== id;
    });
    saveToDos();
}



function onDblClickToDo(event) {
    if (event.target.closest("button")) {
        return;
    }
    const li = event.currentTarget;
    const span = li.querySelector(".todo-text");
    if (!span || li.classList.contains(SLOWHIDE_CLASSNAME)) {
        return;
    }
    if (li.querySelector(".todo-edit")) {
        return;
    }
    event.preventDefault();

    const field = document.createElement("textarea");
    field.className = "todo-edit";
    field.rows = 1;
    field.value = span.innerText;
    field.dataset.original = span.innerText;
    field.dataset.closed = "";
    field.style.height = span.offsetHeight + "px";
    span.replaceWith(field);
    field.focus();
    placeMemoCaret(field);
    setTimeout(function() {
        if (field.isConnected && document.activeElement === field) {
            placeMemoCaret(field);
        }
    }, 0);
    field.addEventListener("keydown", onKeyDownToDoEdit);
    field.addEventListener("blur", onBlurToDoEdit);
}



function placeMemoCaret(field) {
    const end = field.value.length;
    field.setSelectionRange(end, end);
}



function onKeyDownToDoEdit(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        commitEdit(event.currentTarget);
    } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancelEdit(event.currentTarget);
    }
}



function onBlurToDoEdit(event) {
    commitEdit(event.currentTarget);
}



function commitEdit(field) {
    if (!field.isConnected || field.dataset.closed === "1") {
        return;
    }
    field.dataset.closed = "1";
    const text = field.value.trim();
    if (text === "") {
        replaceWithText(field, field.dataset.original);
        return;
    }
    const id = Math.floor(field.parentElement.id);
    toDos.forEach(function(toDo) {
        if (toDo.id === id) {
            toDo.text = text;
        }
    });
    replaceWithText(field, text);
    saveToDos();
}



function cancelEdit(field) {
    if (!field.isConnected || field.dataset.closed === "1") {
        return;
    }
    field.dataset.closed = "1";
    replaceWithText(field, field.dataset.original);
}



function replaceWithText(field, text) {
    const span = createToDoText(text);
    field.replaceWith(span);
}



function onPointerDownHandle(event) {
    if (event.button !== 0 || dragState) {
        return;
    }
    const li = event.currentTarget.parentElement;
    if (li.querySelector(".todo-edit")) {
        return;
    }
    const rect = li.getBoundingClientRect();
    event.preventDefault();
    dragState = {
        li: li,
        handle: event.currentTarget,
        lifted: false,
        pointerId: event.pointerId,
        startY: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        width: rect.width,
        originNext: li.nextElementSibling,
        dropBefore: li.nextElementSibling,
    };
    // 핸들 밖으로 포인터가 나가도 카드가 따라가도록 문서에서 이어서 받는다.
    document.addEventListener("pointermove", onPointerMoveHandle, true);
    document.addEventListener("pointerup", onPointerUpHandle, true);
    document.addEventListener("pointercancel", onPointerCancelHandle, true);
    try {
        event.currentTarget.setPointerCapture(event.pointerId);
    } catch (error) {
        // 포인터 캡처가 거절되어도 문서 리스너로 이동은 이어 간다.
    }
}



function onPointerMoveHandle(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
    }
    event.preventDefault();
    if (!dragState.lifted) {
        const moved = Math.abs(event.clientY - dragState.startY);
        if (moved < DRAG_START_PX) {
            return;
        }
        beginDrag(event);
    }
    placeHeldItem(event);
}



function beginDrag(event) {
    const li = dragState.li;
    const rect = li.getBoundingClientRect();
    dragState.lifted = true;
    li.classList.add("dragging");
    li.style.position = "fixed";
    li.style.left = rect.left + "px";
    li.style.top = rect.top + "px";
    li.style.width = dragState.width + "px";
    li.style.zIndex = "3";
    li.style.margin = "0";
    placeHeldItem(event);
}



function placeHeldItem(event) {
    const listBox = toDoList.getBoundingClientRect();
    let left = event.clientX - dragState.offsetX;
    const maxLeft = listBox.right - dragState.width;
    if (left < listBox.left) {
        left = listBox.left;
    }
    if (left > maxLeft) {
        left = maxLeft;
    }
    dragState.li.style.left = left + "px";
    dragState.li.style.top = (event.clientY - dragState.offsetY) + "px";
    rememberDropSlot(event.clientY);
}



function rememberDropSlot(y) {
    let beforeEl = null;
    toDoList.querySelectorAll("li").forEach(function(item) {
        if (beforeEl || item === dragState.li) {
            return;
        }
        const box = item.getBoundingClientRect();
        const mid = box.top + (box.height / 2);
        if (y < mid) {
            beforeEl = item;
        }
    });
    dragState.dropBefore = beforeEl;
}



function onPointerUpHandle(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
    }
    if (!dragState.lifted) {
        stopDragWatch();
        dragState = null;
        return;
    }
    commitDrag();
}



function onPointerCancelHandle(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
    }
    abortDrag();
}



function onKeyDownToDoDrag(event) {
    if (!dragState || event.key !== "Escape") {
        return;
    }
    event.preventDefault();
    abortDrag();
}



function commitDrag() {
    if (!dragState) {
        return;
    }
    const state = dragState;
    dragState = null;
    stopDragWatch();
    if (state.li.isConnected) {
        if (state.dropBefore && state.dropBefore.parentElement === toDoList) {
            toDoList.insertBefore(state.li, state.dropBefore);
        } else {
            toDoList.appendChild(state.li);
        }
    }
    clearLift(state.li);
    saveToDoOrder();
}



function abortDrag() {
    if (!dragState) {
        return;
    }
    const state = dragState;
    dragState = null;
    stopDragWatch();
    if (state.lifted && state.li.isConnected) {
        if (state.originNext && state.originNext.parentElement === toDoList) {
            toDoList.insertBefore(state.li, state.originNext);
        } else {
            toDoList.appendChild(state.li);
        }
    }
    clearLift(state.li);
}



function stopDragWatch() {
    document.removeEventListener("pointermove", onPointerMoveHandle, true);
    document.removeEventListener("pointerup", onPointerUpHandle, true);
    document.removeEventListener("pointercancel", onPointerCancelHandle, true);
}



function clearLift(li) {
    li.classList.remove("dragging");
    li.style.position = "";
    li.style.left = "";
    li.style.top = "";
    li.style.width = "";
    li.style.zIndex = "";
    li.style.margin = "";
}



function saveToDoOrder() {
    const ids = [];
    toDoList.querySelectorAll("li").forEach(function(li) {
        if (!li.id) {
            return;
        }
        ids.push(Math.floor(li.id));
    });
    toDos.sort(function(a, b) {
        return ids.indexOf(a.id) - ids.indexOf(b.id);
    });
    saveToDos();
}



function saveToDos() {
    localStorage.setItem(KEY_TODOS, JSON.stringify(toDos));
}
