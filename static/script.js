async function render() {
    const res = await fetch("/api/reservations");
    const data = await res.json();
    const listDiv = document.getElementById('list');
    listDiv.innerHTML = '';
    data.forEach(item => {
        const div = document.createElement('div');
        div.className = "card";
        div.innerHTML = `${item.region} - ${item.date} <span class="delete" onclick="del(${item.id})">삭제</span>`;
        listDiv.appendChild(div);
    });
    document.getElementById('count').textContent = data.length;
}

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

async function del(id) {
    const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
    if (res.ok) {
        render();
    }
}

async function startWorkflow() {
    const token = localStorage.getItem('gh_token');
    if (!token) return alert("❌ 토큰을 먼저 저장하세요.");
    const url = `https://api.github.com/repos/jrh1013/forest-bell/actions/workflows/check.yml/dispatches`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json"
        },
        body: JSON.stringify({ ref: "main" })
    });
    if (response.ok) {
        alert("✅ 워크플로우 실행 요청 완료!");
    } else {
        alert("❌ 워크플로우 실행 실패");
    }
}

