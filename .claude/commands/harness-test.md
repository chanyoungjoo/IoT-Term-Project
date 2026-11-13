---
description: 프로젝트 하네스(검사 hook)가 제대로 작동하는지 자가 점검하고 원상복구
allowed-tools: Bash(git status:*), Bash(cp:*), Bash(sed:*), Bash(node .claude/hooks/check.mjs:*), Bash(echo:*), Bash(diff:*)
---

프로젝트 하네스의 검사 hook(`.claude/hooks/check.mjs`)이 작동하는지 아래 순서대로 점검해 줘.
파일은 실제로 수정하지 말고, 반드시 백업 후 테스트하고 마지막에 원래대로 복구해.

1. `git status --short shared/rules.js`를 실행한다. 이 파일에 커밋되지 않은 변경이 있으면 **테스트를 멈추고** 알려 준다.
2. 정상 상태 점검: `echo '{"tool_input":{"file_path":"shared/rules.js"}}' | node .claude/hooks/check.mjs; echo "exit=$?"` → exit=0 이어야 한다.
3. 대상 아님 점검: 같은 방식으로 `CLAUDE.md` 경로를 넣어 실행 → exit=0 이어야 한다.
4. 실패 감지 점검:
   - `cp shared/rules.js /tmp/airclass-rules.bak`으로 백업한다.
   - `sed -i '' 's/indoorPm25Bad: 35/indoorPm25Bad: 50/' shared/rules.js`로 기준값을 일부러 바꾼다. (macOS sed)
   - 2번과 같은 명령을 실행 → exit=2 와 "하네스 검사 실패" 메시지가 나와야 한다.
   - `cp /tmp/airclass-rules.bak shared/rules.js`로 **반드시 복구**하고, `git status --short shared/rules.js`로 변경이 없는지 확인한다.
5. 결과를 아래 표로 정리한다.

| 점검 | 기대 | 실제 | 판정 |
|---|---|---|---|

하나라도 기대와 다르면 원인을 추측해서 설명하고, 고치는 건 내가 요청할 때만 한다.
