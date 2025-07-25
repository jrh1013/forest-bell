const repoOwner = "jrh1013";
const repoName = "forest-bell";
const filePath = "data/reservations.json";
const branch = "main";

function getToken() {
    return localStorage.getItem('gh_token') || "";
}
function saveToken(value) {
    localStorage.setItem('gh_token', value);
}

async function fetchData() {
    const url = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${filePath}?t=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    return res.json();
}

async function updateData(data) {
    const token = getToken();
    if (!token) {
        alert("❌ 토큰을 먼저 저장하세요.");
        return false;
    }
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
    const getRes = await fetch(apiUrl, {
        headers: { Authorization: `token ${token}` }
    });
    if (!getRes.ok) {
        alert("❌ GitHub API 접근 실패");
        return false;
    }
    const fileInfo = await getRes.json();
    const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    const response = await fetch(apiUrl, {
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
    return response.status === 200 || response.status === 201;
}

async function render() {
    const data = await fetchData();
    const listDiv = document.getElementById('list');
    if (!listDiv) return;
    listDiv.innerHTML = '';
    data.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = "card";
        div.innerHTML = `${item.region} - ${item.date} <span class="delete" onclick="del(${i})">삭제</span>`;
        listDiv.appendChild(div);
    });
    document.getElementById('count').textContent = data.length;
}

async function saveItem() {
    const region = document.getElementById('region').value;
    const date = document.getElementById('dateInput').value;
    if (!region || !date) return alert('❌ 지역과 날짜를 선택하세요.');
    const data = await fetchData();
    if (data.length >= 15) return alert('❌ 최대 15개까지 가능');
    data.push({ region, date });
    const success = await updateData(data);
    if (success) {
        alert("✅ 예약 추가 완료");
        location.href = "/";
    }
}

async function del(i) {
    const data = await fetchData();
    data.splice(i, 1);
    const success = await updateData(data);
    if (success) {
        render();
    }
}

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
    alert(response.ok ? "✅ 워크플로우 실행 요청 완료!" : "❌ 실행 실패");
}

window.saveToken = saveToken;
