// 화면 켜짐 유지 : 창이 활성화된 동안 화면이 꺼지지 않게 합니다.
// 미지원 브라우저(Firefox, 구형 iOS Safari)와 비활성 탭에서의 오류를 방어합니다.

function requestWakeLock() {
    if (!("wakeLock" in navigator)) {
        return;
    }

    navigator.wakeLock.request("screen").catch(function(error) {
        // 문서가 비활성 상태이면 reject 되므로 조용히 무시합니다.
        console.log("Wake Lock request failed:", error.name, error.message);
    });
}

requestWakeLock();

document.addEventListener("visibilitychange", function() {
    if (document.visibilityState == "visible") {
        requestWakeLock();
    }
});
