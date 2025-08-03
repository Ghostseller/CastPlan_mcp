# 🔒 CastPlan MCP 보안 정책

## 🚨 중요: API 키 보안

### ❌ 절대 금지사항
- **API 키를 코드에 하드코딩하지 마세요**
- **API 키를 Git에 커밋하지 마세요**
- **API 키를 로그에 출력하지 마세요**
- **API 키를 문서에 포함하지 마세요**

### ✅ 안전한 API 키 관리

#### 환경변수 사용
```bash
# 환경변수로 설정
export PERPLEXITY_API_KEY="your-api-key-here"
export OPENAI_API_KEY="your-api-key-here"
export ANTHROPIC_API_KEY="your-api-key-here"
```

#### .env 파일 사용 (Git에 커밋하지 않음)
```env
# .env (Git ignored)
PERPLEXITY_API_KEY=your-api-key-here
OPENAI_API_KEY=your-api-key-here
ANTHROPIC_API_KEY=your-api-key-here
```

#### 설정 파일에서 환경변수 참조
```json
{
  "env": {
    "CASTPLAN_AI_API_KEY": "${PERPLEXITY_API_KEY}",
    "OPENAI_API_KEY": "${OPENAI_API_KEY}",
    "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}"
  }
}
```

## 🛡️ 보안 검토 체크리스트

### 커밋 전 체크리스트
- [ ] API 키가 코드에 포함되지 않았는가?
- [ ] 비밀번호나 토큰이 하드코딩되지 않았는가?
- [ ] .env 파일이 .gitignore에 포함되어 있는가?
- [ ] 테스트 파일에 실제 API 키가 사용되지 않았는가?
- [ ] 로그 출력에 민감한 정보가 포함되지 않았는가?

### API 키 노출 시 대응절차
1. **즉시 API 키 무효화**
2. **Git 히스토리에서 완전 제거**
3. **새로운 API 키 발급**
4. **보안 정책 재검토**

## 🔍 자동 보안 검사

### pre-commit Hook
```bash
#!/bin/sh
# API 키 패턴 검사
if git diff --cached --name-only | xargs grep -l "pplx-\|sk-\|key-" 2>/dev/null; then
  echo "🚨 Error: API key detected in staged files!"
  echo "Please remove API keys before committing."
  exit 1
fi
```

### GitHub Actions 보안 스캔
```yaml
name: Security Scan
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Scan for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
```

## 📋 지원되는 환경변수

### AI 서비스 API 키
- `PERPLEXITY_API_KEY`: Perplexity AI API 키
- `OPENAI_API_KEY`: OpenAI API 키  
- `ANTHROPIC_API_KEY`: Anthropic API 키
- `GOOGLE_AI_API_KEY`: Google AI API 키

### CastPlan 설정
- `CASTPLAN_MODE`: 실행 모드 (development/staging/production)
- `CASTPLAN_LOG_LEVEL`: 로그 레벨 (debug/info/warn/error)
- `CASTPLAN_PROJECT_ROOT`: 프로젝트 루트 경로

## 🚨 보안 사고 보고

보안 취약점을 발견하면 즉시 다음으로 연락하세요:
- **이메일**: banessayuu@gmail.com
- **GitHub Issues**: 공개적으로 보안 문제를 보고하지 마세요
- **보안 권고**: GitHub Security Advisory 사용

## 📚 보안 관련 문서

- [API 키 설정 가이드](API-KEY-SETUP.md)
- [환경 설정 가이드](ENVIRONMENT-SETUP.md)
- [개발자 가이드](DEVELOPER-GUIDE.md)

---

**⚠️ 중요: 이 보안 정책을 준수하지 않으면 시스템 보안이 위험해질 수 있습니다.**