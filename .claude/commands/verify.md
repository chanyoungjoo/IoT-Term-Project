---
description: 웹 린트·규칙 테스트·빌드를 한 번에 실행하고 결과 요약
allowed-tools: Bash(npm run lint:*), Bash(npm test:*), Bash(npm run build:*), Bash(cd:*)
---

작업이 끝났는지 전체 검증해 줘. `web/` 폴더에서 아래를 순서대로 실행한다.

1. `npm run lint` — 린트 (oxlint)
2. `npm test` — 자동 제어 규칙 테스트
3. `npm run build` — 프로덕션 빌드

앞 단계가 실패해도 나머지 단계는 계속 실행해서 전체 상황을 보여 준다.
결과는 단계별 ✅/❌ 표로 정리하고, 실패한 항목은 원인과 수정 방법을 설명한다.
코드 수정은 내가 요청할 때만 한다. $ARGUMENTS
