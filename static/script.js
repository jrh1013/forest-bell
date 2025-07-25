const repoOwner = "jrh1013";
const repoName = "forest-bell";
const branch = "main";
const filePath = "data/reservations.json";

// ✅ 토큰 저장 / 불러오기
function getToken() {
    return localStorage.getItem('gh_token') || "";
}

function saveToken(value) {
    localStorage.setItem('gh_token', value);
}

// ✅ Render DB에서 리스트 불러오기
async function fetchData() {
    const res = await fetch("/api/reservations");
    return await res.json();
}

// ✅ GitHub JSON 업데이트
async function updateGitHub(data) {
    const token = getToken();
    if (!token) {
        console.warn("GitHub 토큰 없음 → JSON 업데이트 스킵");
        return false;
    }
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
    const getRes = await fetch(url, { headers: { Authorization: `token ${token}` } });
    if (!getRes.ok) {
        console.error("파일 정보 가져오기 실패:", await getRes.text());
        return false;
    }
    const fileInfo = await getRes.json();
    const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    const response = await fetch(url, {
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
    return response.ok;
}

// ✅ 예약 리스트 렌더링
async function render() {
    const res = await fetchData();
    const listDiv = document.getElementById('list');
    if (!listDiv) return;
    listDiv.innerHTML = '';
    res.forEach(item => {
        const div = document.createElement('div');
        div.className = "card";
        div.innerHTML = `
            ${item.region} - ${item.date} 
            <span class="delete" onclick="del(${item.id})">삭제</span>
        `;
        listDiv.appendChild(div);
    });
    document.getElementById('count').textContent = res.length;
}

// ✅ 예약 추가 (DB → GitHub)
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
        const dbData = await fetchData();
        await updateGitHub(dbData);
        alert("✅ 예약 추가 완료");
        window.location.href = "/";
    } else {
        alert("❌ 추가 실패");
    }
}

// ✅ 예약 삭제 (DB → GitHub)
async function del(id) {
    const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
    if (res.ok) {
        const dbData = await fetchData();
        await updateGitHub(dbData);
        render();
    } else {
        alert("❌ 삭제 실패");
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
