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
    const res = await fetch("/api/reservations");
    return await res.json();
}

// ✅ 예약 리스트 렌더링 (index.html)
async function render() {
    const res = await fetchData();
    const listDiv = document.getElementById('list');
    if (!listDiv) return; // index.html에서만 실행
    listDiv.innerHTML = '';
    res.forEach(item => {
        const div = document.createElement('div');
        div.className = "card";
        div.innerHTML = `${item.region} - ${item.date}`;
        listDiv.appendChild(div);
    });
    document.getElementById('count').textContent = res.length;
}

// ✅ 예약 삭제
async function del(id) {
    const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
    if (res.ok) {
        await syncToGitHub(await fetchData()); // GitHub도 최신 반영
        render();
    }
}

// ✅ 예약 추가 (단일 추가 UI에서 호출)
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
        await syncToGitHub(await fetchData());
        alert("✅ 예약 추가 완료");
        window.location.href = "/";
    }
}

// ✅ 임시 리스트 (Edit 화면용)
let tempList = [];

// ✅ 임시 리스트 렌더링
function renderTempList() {
    const container = document.getElementById('tempList');
    if (!container) return;
    container.innerHTML = '';
    tempList.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `${item.region} - ${item.date} <span class="delete" onclick="removeTemp(${index})">X</span>`;
        container.appendChild(div);
    });
}

// ✅ 임시 리스트에 추가
function addTempItem() {
    const region = document.getElementById('region').value;
    const date = document.getElementById('dateInput').value;
    if (!region || !date) return alert("❌ 지역과 날짜를 선택하세요.");
    tempList.push({ region, date });
    renderTempList();
}

// ✅ 임시 리스트에서 제거
function removeTemp(index) {
    tempList.splice(index, 1);
    renderTempList();
}

// ✅ 임시 리스트 저장 (DB + GitHub 동기화)
async function saveAll() {
    if (tempList.length === 0) return alert("❌ 추가할 데이터가 없습니다.");

    try {
        // 1. DB 업데이트
        const res = await fetch("/api/reservations/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(tempList)
        });

        if (!res.ok) {
            alert("❌ DB 저장 실패");
            return;
        }

        // 2. GitHub JSON 동기화
        await syncToGitHub(tempList);

        alert("✅ 예약 리스트 저장 완료");
        window.location.href = "/";
    } catch (err) {
        console.error("saveAll() 오류:", err);
        alert("❌ 저장 중 오류 발생");
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
        console.log("✅ 워크플로우 실행 요청 완료");
    } else {
        console.error("❌ 워크플로우 실행 실패");
    }
}

// ✅ GitHub JSON 동기화
async function syncToGitHub(data) {
    const token = getToken();
    if (!token) {
        console.warn("⚠ GitHub 토큰 없음 → JSON 업데이트 생략");
        return;
    }
    try {
        const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
        
        // 기존 파일 정보 가져오기
        const getRes = await fetch(url, {
            headers: { Authorization: `token ${token}` }
        });
        const fileInfo = await getRes.json();

        // 새 JSON 컨텐츠 생성
        const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

        // GitHub API PUT 요청
        await fetch(url, {
            method: "PUT",
            headers: {
                Authorization: `token ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Update reservations.json",
                content: newContent,
                sha: fileInfo.sha || undefined,
                branch: branch
            })
        });

        console.log("✅ GitHub JSON 동기화 완료");
    } catch (err) {
        console.error("GitHub 업데이트 중 에러:", err);
    }
}

// ✅ 모니터링 자동 반복 기능 추가
let monitoring = false;
let monitorInterval = null;

function toggleMonitoring() {
    const btn = document.querySelector(".btn-monitor");
    if (!monitoring) {
        monitoring = true;
        btn.textContent = "모니터링 종료";
        btn.classList.add("btn-gray");

        startWorkflow(); // 즉시 실행
        monitorInterval = setInterval(() => {
            console.log("⏳ 5분마다 워크플로우 실행");
            startWorkflow();
        }, 5 * 60 * 1000);
    } else {
        monitoring = false;
        btn.textContent = "모니터링 시작";
        btn.classList.remove("btn-gray");
        clearInterval(monitorInterval);
        monitorInterval = null;
        console.log("🛑 모니터링 중지");
    }
}

// ✅ 글로벌 등록
window.saveToken = saveToken;
window.addTempItem = addTempItem;
window.removeTemp = removeTemp;
window.saveAll = saveAll;
window.renderTempList = renderTempList;
window.render = render;
window.toggleMonitoring = toggleMonitoring;
