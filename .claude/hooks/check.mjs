#!/usr/bin/env node
// AirClass 프로젝트 하네스 — 파일 수정 직후 자동 검사 (PostToolUse hook)
// - Claude가 Edit/Write로 .js/.jsx 파일을 고치면 실행된다.
// - web/, app/src/, shared/ 파일 → oxlint로 린트 (웹의 oxlint와 설정을 같이 씀)
// - shared/ 또는 web/src/api* 파일 → 자동 제어 규칙 테스트(npm test)까지 실행
// - 실패하면 exit 2 + stderr로 결과를 보내서, Claude가 보고 스스로 고치게 한다.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// 1) hook 입력(JSON)에서 수정된 파일 경로 꺼내기
let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0); // 입력을 못 읽으면 작업을 막지 않고 통과
}
const filePath = input.tool_input?.file_path;
if (!filePath) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const rel = path.relative(root, path.resolve(root, filePath)).split(path.sep).join('/');

// 2) 검사 대상이 아니면 바로 통과 (프로젝트 밖, node_modules, js/jsx 아닌 파일)
if (rel.startsWith('..') || rel.includes('node_modules/') || !/\.(js|jsx|mjs)$/.test(rel)) {
  process.exit(0);
}
const inScope = rel.startsWith('web/') || rel.startsWith('app/src/') || rel.startsWith('shared/');
if (!inScope) process.exit(0);

const webDir = path.join(root, 'web');
const failures = [];

// 3) 린트: web에 설치된 oxlint를 웹·앱·shared 공통으로 사용
const oxlint = path.join(webDir, 'node_modules', '.bin', 'oxlint');
if (existsSync(oxlint)) {
  const r = spawnSync(oxlint, ['-c', path.join(webDir, '.oxlintrc.json'), path.join(root, rel)], {
    cwd: webDir,
    encoding: 'utf8',
  });
  // oxlint는 error가 있을 때만 0이 아닌 코드로 끝난다 (warning은 통과)
  if (r.status !== 0) {
    failures.push(`[oxlint] ${rel}\n${(r.stdout || '') + (r.stderr || '')}`.trim());
  }
} else {
  process.stderr.write('[하네스] web/node_modules에 oxlint가 없어 린트를 건너뜀 (cd web && npm install)\n');
}

// 4) 규칙 테스트: 판정·제어 로직(shared/) 또는 데이터 접근(web/src/api*)을 건드렸을 때만
if (rel.startsWith('shared/') || rel.startsWith('web/src/api')) {
  const r = spawnSync('npm', ['test', '--silent'], { cwd: webDir, encoding: 'utf8' });
  if (r.status !== 0) {
    failures.push(`[npm test] 자동 제어 규칙 테스트 실패\n${(r.stdout || '') + (r.stderr || '')}`.trim());
  }
}

// 5) 결과 전달: 실패 시 exit 2 → stderr 내용이 Claude에게 전달됨
if (failures.length) {
  process.stderr.write(
    `하네스 검사 실패. 아래 문제를 고친 뒤 다시 확인하세요.\n\n${failures.join('\n\n')}\n`
  );
  process.exit(2);
}
process.exit(0);
