const repoOwner = "jrh1013";
const repoName = "forest-bell";
const filePath = "data/reservations.json";
const branch = "main";

/** ✅ 토큰 가져오기 / 저장 */
function getToken() {
    return localStorage.getItem('gh_token') || "";
}
function saveToken(value) {
    localStorage.setItem('gh_token', value);
}

/** ✅ 최신 데이터 가져오기 (GitHub API 이용, 캐시 문제 해결) */
async function fetchData() {
    const token = getToken();
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
    const headers = token ? { Authorization: `token ${token}` } : {};

    const res = await fetch(url, { headers });
    if (!res.ok) {
        console.error("❌ 데이터 불러오기 실패:", await res.text());
        return [];
    }
    const json = await res.json();
    if (json.content) {
        return JSON.parse(decodeURIComponent(escape(atob(json.content))));
    }
    return [];
}

/** ✅ 데이터 업데이트 (SHA 최신화) */
async function updateData(newData) {
    const token = getToken();
    if (!token) {
        alert("❌ 토큰을 먼저 저장하세요.");
        return false;
    }

    try {
        const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

        // 최신 SHA 가져오기
        const getRes = await fetch(url, {
            headers: { Authorization: `token ${token}` }
        });
        if (!getRes.ok) {
            console.error("파일 정보 가져오기 실패:", await getRes.text());
            return false;
        }

        const fileInfo = await getRes.json();
        const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(newData, null, 2))));

        // PUT 요청
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

        if (response.ok) {
            return true;
        } else {
            console.error("❌ 업데이트 실패:", await response.text());
            return false;
        }
    } catch (err) {
        console.error("업데이트 중 오류:", err);
        return false;
    }
}

/** ✅ 워크플로우 실행 */
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
        console.error("워크플로우 실행 실패:", await response.text());
        alert("❌ 워크플로우 실행 실패");
    }
}
