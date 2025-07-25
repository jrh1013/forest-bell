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

// ✅ 예약 리스트 불러오기
async function fetchData() {
    const url = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/${filePath}?t=${Date.now()}`;
    console.log(`🔍 fetchData 요청: ${url}`);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
        console.error(`❌ fetchData 실패: HTTP ${res.status}`);
        return [];
    }
    try {
        return await res.json();
    } catch (e) {
        console.error("❌ JSON 파싱 실패", e);
        return [];
    }
}

// ✅ GitHub API로 데이터 업데이트
async function updateData(data) {
    const token = getToken();
    if (!token) {
        alert("❌ 토큰을 먼저 저장하세요.");
        return false;
    }

    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
    console.log(`📤 updateData 호출 → ${apiUrl}`);

    try {
        // 현재 파일 SHA 가져오기
        const getRes = await fetch(apiUrl, {
            headers: { Authorization: `token ${token}` }
        });

        if (!getRes.ok) {
            console.error("❌ 파일 정보 가져오기 실패:", await getRes.text());
            alert("❌ GitHub API에서 파일 정보를 가져오지 못했습니다.");
            return false;
        }

        const fileInfo = await getRes.json();
        const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

        // 파일 업데이트 요청
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

        if (response.status === 200 || response.status === 201) {
            console.log("✅ GitHub 업데이트 성공");
            return true;
        } else {
            console.error("❌ 업데이트 실패:", await response.text());
            alert("❌ 업데이트 실패! 콘솔 확인");
            return false;
        }
    } catch (err) {
        console.error("❌ 업데이트 중 에러:", err);
        alert("❌ 요청 중 오류 발생");
        return false;
    }
}

// ✅ 리스트 렌더링
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

// ✅ 예약 추가
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
        window.location.href = "/";
    }
}

// ✅ 예약 삭제
async function del(i) {
    const data = await fetchData();
    data.splice(i, 1);
    const success = await updateData(data);
    if (success) {
        render();
    }
}

// ✅ GitHub Actions 워크플로우 실행
async function startWorkflow() {
    const token = getToken();
    if (!token) return alert("❌ 토큰을 먼저 저장하세요.");

    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/check.yml/dispatches`;
    console.log(`▶ 워크플로우 실행 요청: ${url}`);

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

// ✅ 전역 등록
window.saveToken = saveToken;
