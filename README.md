# 자연휴양림 예약 알림 시스템

## 기능
- GitHub Actions + Puppeteer로 예약 가능 여부 체크
- 3분마다 실행, 예약 가능 시 텔레그램 알림
- 예약 리스트는 `data/reservations.json`에서 관리
- GitHub Pages로 UI 제공 (수정 기능 추후 추가)

## 설치 방법
1. 이 저장소를 GitHub에 생성 후 업로드
2. GitHub Pages 활성화
3. Secrets 설정:
   - TELEGRAM_BOT_TOKEN
   - TELEGRAM_CHAT_ID
4. 예약 리스트는 `data/reservations.json`에 작성
5. Actions → 수동 실행 또는 자동 실행 확인
