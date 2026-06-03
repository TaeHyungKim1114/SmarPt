#!/usr/bin/env bash
# GitHub에 SmarPt 저장소 생성 후 push
set -euo pipefail
cd "$(dirname "$0")/.."

GH="${GH:-$(command -v gh 2>/dev/null || echo "")}"
if [[ -z "$GH" && -x /tmp/gh-cli/gh_2.93.0_macOS_arm64/bin/gh ]]; then
  GH=/tmp/gh-cli/gh_2.93.0_macOS_arm64/bin/gh
fi

if [[ -z "$GH" ]]; then
  echo "GitHub CLI(gh)가 필요합니다: https://cli.github.com"
  exit 1
fi

if ! "$GH" auth status &>/dev/null; then
  echo "GitHub 로그인이 필요합니다. 브라우저 안내를 따라주세요."
  "$GH" auth login -h github.com -p https -w
fi

REPO="TaeHyungKim1114/SmarPt"

if "$GH" repo view "$REPO" &>/dev/null; then
  echo "저장소가 이미 있습니다: https://github.com/$REPO"
else
  "$GH" repo create SmarPt \
    --public \
    --description "PT 트레이너-회원 운동·식단 기록 및 채팅 웹앱 (Next.js + Supabase)" \
    --source=. \
    --remote=origin \
    --push
  echo "완료: https://github.com/$REPO"
  exit 0
fi

git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/$REPO.git"
git push -u origin main
echo "완료: https://github.com/$REPO"
