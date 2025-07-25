// ✅ GitHub 관련 설정
const repoOwner = "jrh1013";
const repoName = "forest-bell";
const branch = "main";

// ✅ 토큰 로컬 저장 / 불러오기
function getToken() {
    return localStorage.getItem('gh_token') || "";
}

function saveToken(value) {
    localStorage.setItem('gh_token', value);
}

// ✅ 예약 리스트 불러오기
async function fetchData() {
    const res = await fetch("/api/reservations");
    return await res.json();
}

// ✅ 예약 리스트 업데이트 (Render API)
async function updateData(data) {
    const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return res.ok;
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

// ✅ 예약 삭제
async function del(id) {
    const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
    if (res.ok) {
        render();
    }
}

// ✅ 예약 추가
async function saveItem() {
    const region = document.getElementById('region').value;
    const date = document.getElementById('dateInput').value;
    if (!region || !date) return alert('❌ 지역과 날짜를 선택하세요.');

    const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region, date })
    });

    if (res.ok) {
        alert("✅ 예약 추가 완료");
        window.location.href = "/";
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

// ✅ 글로벌 등록
window.saveToken = saveToken;
