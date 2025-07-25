// ✅ GitHub 정보
const repoOwner = "jrh1013";
const repoName = "forest-bell";
const branch = "main";

// ✅ 토큰 관리
function getToken() {
    return localStorage.getItem('gh_token') || "";
}
function saveToken(value) {
    localStorage.setItem('gh_token', value);
}

// ✅ 예약 리스트 가져오기
async function fetchData() {
    const res = await fetch("/api/reservations");
    return await res.json();
}

// ✅ index.html 렌더
async function render() {
    const res = await fetchData();
    const listDiv = document.getElementById('list');
    if (!listDiv) return;
    listDiv.innerHTML = '';
    res.forEach(item => {
        const div = document.createElement('div');
        div.className = "card";
        div.innerHTML = `${item.region} - ${item.date}`;
        listDiv.appendChild(div);
    });
    document.getElementById('count').textContent = res.length;
}

// ✅ 임시 리스트 (edit.html)
let tempList = [];

// ✅ 편집 페이지 로드
async function loadEditPage() {
    const res = await fetchData();
    tempList = [...res];
    renderEditList();
}

// ✅ 편집 리스트 렌더
function renderEditList() {
    const listDiv = document.getElementById('editList');
    listDiv.innerHTML = '';
    tempList.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = "card";
        div.innerHTML = `${item.region} - ${item.date} <span class="delete" onclick="removeTemp(${i})">X</span>`;
        listDiv.appendChild(div);
    });
}

// ✅ 추가 폼
function showAddForm() {
    document.getElementById('addForm').style.display = 'block';
}
function hideAddForm() {
    document.getElementById('addForm').style.display = 'none';
}

// ✅ 임시 리스트에 추가
function addTemp() {
    const region = document.getElementById('region').value;
    const date = document.getElementById('dateInput').value;
    if (!region || !date) return alert("❌ 지역과 날짜를 선택하세요.");
    tempList.push({ region, date });
    renderEditList();
    hideAddForm();
}

// ✅ 임시 리스트에서 삭제
function removeTemp(index) {
    tempList.splice(index, 1);
    renderEditList();
}

// ✅ 저장 (DB + GitHub JSON)
async function saveAll() {
    if (tempList.length === 0) {
        alert("❌ 예약 리스트가 비어있습니다.");
        return;
    }
    // 1) DB 저장
    const res = await fetch("/api/reservations/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tempList)
    });
    if (!res.ok) {
        alert("❌ 서버 저장 실패");
        return;
    }
    // 2) GitHub JSON 업데이트
    await updateGitHub(tempList);
    alert("✅ 저장 완료!");
    window.location.href = "/";
}

// ✅ GitHub JSON 업데이트
async function updateGitHub(data) {
    const token = getToken();
    if (!token) {
        alert("❌ 토큰을 설정하세요.");
        return;
    }
    const filePath = "data/reservations.json";
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
    const getRes = await fetch(url, {
        headers: { Authorization: `token ${token}` }
    });
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
}

// ✅ 워크플로우 실행
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

// ✅ 글로벌
window.saveToken = saveToken;
