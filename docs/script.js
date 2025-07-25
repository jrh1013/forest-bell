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
    const res = await fetch(`https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${filePath}`);
    return await res.json();
}
async function updateData(data) {
    const token = getToken();
    if (!token) return alert("토큰을 먼저 저장하세요.");
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
    const getRes = await fetch(url, { headers: { Authorization: `token ${token}` } });
    const fileInfo = await getRes.json();
    const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    const response = await fetch(url, {
        method: "PUT",
        headers: { Authorization: `token ${token}` },
        body: JSON.stringify({
            message: "Update reservations.json",
            content: newContent,
            sha: fileInfo.sha,
            branch: branch
        })
    });
    if (!response.ok) {
        console.error("GitHub API Error:", response.status, await response.text());
        alert("업데이트 실패! 콘솔 확인");
    }
}
async function startWorkflow() {
    const token = getToken();
    if (!token) return alert("토큰을 먼저 저장하세요.");
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
        console.error("Workflow Error:", response.status, await response.text());
        alert("워크플로우 실행 실패!");
    }
}
