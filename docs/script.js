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
    const res = await fetch(`https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${filePath}?t=${Date.now()}`, {
        cache: 'no-store'
    });
    return await res.json();
}

async function updateData(newData) {
    const token = getToken();
    if (!token) {
        alert("❌ 토큰을 먼저 저장하세요.");
        return false;
    }

    try {
        const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

        const getRes = await fetch(url, {
            headers: { Authorization: `token ${token}` }
        });
        if (!getRes.ok) {
            console.error("파일 정보 가져오기 실패:", await getRes.text());
            alert("❌ GitHub API에서 파일 정보를 가져오지 못했습니다.");
            return false;
        }

        const fileInfo = await getRes.json();
        const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(newData, null, 2))));

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

        if (response.status === 200 || response.status === 201) {
            return true;
        } else {
            console.error("❌ 업데이트 실패:", await response.text());
            return false;
        }
    } catch (err) {
        console.error("업데이트 중 에러:", err);
        return false;
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
    if (response.ok) {
        alert("✅ 워크플로우 실행 요청 완료!");
    } else {
        console.error("워크플로우 실행 오류:", await response.text());
        alert("❌ 워크플로우 실행 실패!");
    }
}
