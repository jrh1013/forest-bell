const repoOwner = "jrh1013";
const repoName = "forest-bell";
const branch = "main";

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

// ✅ 예약 리스트 렌더링 (index.html)
async function render() {
    const data = await fetchData();
    const listDiv = document.getElementById('list');
    if (!listDiv) return;
    listDiv.innerHTML = '';
    data.forEach(item => {
        const div = document.createElement('div');
        div.className = "card";
        div.innerHTML = `${item.region} - ${item.date}`;
        listDiv.appendChild(div);
    });
    document.getElementById('count').textContent = data.length;
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
    alert(response.ok ? "✅ 워크플로우 실행 요청 완료!" : "❌ 워크플로우 실행 실패");
}

// ✅ 편집 화면 로직
let tempList = [];

// ✅ 편집 초기화
async function editRender() {
    tempList = await fetchData();
    drawTempList();
}

// ✅ 임시 리스트 렌더링
function drawTempList() {
    const tempDiv = document.getElementById('tempList');
    tempDiv.innerHTML = '';
    tempList.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = "card";
        div.innerHTML = `${item.region} - ${item.date} <span class="delete" onclick="deleteTempItem(${idx})">X</span>`;
        tempDiv.appendChild(div);
    });
}

// ✅ 추가 폼 열기
function openAddForm() {
    document.getElementById('addForm').style.display = 'block';
}
function closeAddForm() {
    document.getElementById('addForm').style.display = 'none';
}

// ✅ 임시 리스트에 추가
function addTempItem() {
    const region = document.getElementById('region').value;
    const date = document.getElementById('dateInput').value;
    if (!region || !date) return alert("❌ 지역과 날짜 선택 필수");
    tempList.push({ region, date });
    drawTempList();
    closeAddForm();
}

// ✅ 임시 리스트에서 삭제
function deleteTempItem(idx) {
    tempList.splice(idx, 1);
    drawTempList();
}

// ✅ 저장 (DB + GitHub JSON 동기화)
async function saveAll() {
    if (tempList.length === 0) return alert("❌ 추가된 항목이 없습니다.");
    // 1) DB 업데이트
    const dbRes = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tempList)
    });
    if (!dbRes.ok) {
        alert("❌ DB 업데이트 실패");
        return;
    }
    // 2) GitHub 업데이트
    const token = getToken();
    if (!token) {
        alert("❌ 토큰을 먼저 저장하세요.");
        return;
    }
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/data/reservations.json`;
    const getRes = await fetch(url, { headers: { Authorization: `token ${token}` } });
    const fileInfo = await getRes.json();
    const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(tempList, null, 2))));
    const response = await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "Bulk update reservations",
            content: newContent,
            sha: fileInfo.sha,
            branch
        })
    });
    alert(response.ok ? "✅ 저장 완료" : "❌ GitHub 업데이트 실패");
    window.location.href = "/";
}

// ✅ token.html에서 쓸 수 있도록 export
window.saveToken = saveToken;
