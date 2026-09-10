// 빌드 버전 표시 : 커밋마다 빌드 번호 +1, 날짜(YYMMDD) 갱신 (.cursor/rules/version.mdc 참조)
const versionBox = document.getElementById("version");
const version = "Build 313.260910"; // 자동 갱신 대상

if (versionBox) {
    versionBox.textContent = version;
}
