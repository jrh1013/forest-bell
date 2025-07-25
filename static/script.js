// ✅ GitHub 관련 설정
const repoOwner = "jrh1013";
const repoName = "forest-bell";
const filePath = "data/reservations.json";
const branch = "main";

// ✅ 토큰 저장 / 불러오기
function getToken() {
    return localStorage.getItem('gh_token') || "";
}

function saveToken(value) {
    localStorage.setItem('gh_token', value);
}

// ✅ 예약 리스트 불러오기 (Render DB)
async function fetchData() {
    const res = await fetch("/api/reservations", { cache: "no-store" });
    return await res.json();
}

// ✅ 예약 리스트 렌더링
async function render() {
    const res = await fetchData();
    const listDiv = document.getElementById('list');
    if (!listDiv) return; // index.html에서만 실행
    listDiv.innerHTML = '';
    res.forEach(item => {
        const div = document.createElement('div');
        div.className = "card";
        div.innerHTML = `${item.region} - ${item.date} <span class="delete" onclick="del(${item.id})">삭제</span>`;
        listDiv.appendChild(div);
    });
    document.getElementById('count').textContent = res.length;
}

// ✅ Render DB 업데이트 후 GitHub 업데이트
async function updateGitHub(data) {
    const token = getToken();
    if (!token) {
        console.warn("⚠ GitHub 토큰 없음 → JSON 업데이트 스킵");
        return;
    }
    try {
        const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
        const getRes = await fetch(url, {
            headers: { Authorization: `token ${token}` }
        });
        if (!getRes.ok) {
            console.error("❌ GitHub 파일 정보 가져오기 실패:", await getRes.text());
            return;
        }
        const fileInfo = await getRes.json();
        const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
        await fetch(url, {
            method: "PUT",
            headers: {
                Authorization: `token ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Update reservations.json",
                content: newContent,
                sha: fileInfo.sha,
                branch: branch
            })
        });
        console.log("✅ GitHub JSON 업데이트 완료");
    } catch (err) {
        console.error("GitHub 업데이트 중 오류:", err);
    }
}

// ✅ 예약 추가 (Render DB → GitHub JSON)
async function saveItem() {
    const region = document.getElementById('region').value;
    const date = document.getElementById('dateInput').value;
    if (!region || !date) return alert('❌ 지역과 날짜를 선택하세요.');

    // 1️⃣ Render DB에 저장
    const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region, date })
    });

    if (res.ok) {
        console.log("✅ Render DB 업데이트 완료");
        // 2️⃣ GitHub JSON 업데이트
        const data = await fetchData();
        updateGitHub(data);
        // 3️⃣ UI 갱신
        alert("✅ 예약 추가 완료");
        window.location.href = "/";
    }
}

// ✅ 예약 삭제 (Render DB → GitHub JSON)
async function del(id) {
    const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
    if (res.ok) {
        console.log("✅ Render DB 삭제 완료");
        // 2️⃣ GitHub JSON 업데이트
        const data = await fetchData();
        updateGitHub(data);
        // 3️⃣ UI 갱신
        render();
    }
}

// ✅ GitHub Actions Workflow 실행
async function startWorkflow() {
    const token = getToken();
    if (!token) return alert("❌ 토큰을 먼저 저장하세요.");
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/check.yml/dispatches`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json"
        },
        body: JSON.stringify({ ref: branch })
    });
    if (response.ok) {
        alert("✅ 워크플로우 실행 요청 완료!");
    } else {
        alert("❌ 워크플로우 실행 실패");
    }
}

// ✅ DOM 로드 후 렌더링 실행
document.addEventListener("DOMContentLoaded", render);

// ✅ 글로벌 등록 (token.html에서 접근 가능)
window.saveToken = saveToken;
