// 문의 보내기 서버가 쓰는 순수 함수들(네트워크 없음).

const LIMITS = { name: 50, phone: 30, email: 100, message: 5000, type: 50 };
const NAMES = { name: "성함", phone: "연락처", email: "이메일", message: "문의 내용" };

// 문제가 있으면 사람이 읽을 수 있는 문장 목록을 돌려준다
export function validateContact(d) {
  if (!d || typeof d !== "object") return ["형식이 올바르지 않습니다."];
  const errors = [];
  for (const k of ["name", "phone", "email", "message"]) {
    const v = typeof d[k] === "string" ? d[k].trim() : "";
    if (!v) errors.push(`${NAMES[k]} 칸을 입력해주세요.`);
    else if (v.length > LIMITS[k]) errors.push(`${NAMES[k]}이(가) 너무 깁니다.`);
  }
  if (typeof d.email === "string" && d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) errors.push("이메일 형식이 올바르지 않습니다.");
  if (typeof d.type !== "string" || !d.type.trim() || d.type.length > LIMITS.type) errors.push("문의 항목을 골라주세요.");
  if (d.agree !== "Y") errors.push("개인정보 수집 및 이용에 동의해주세요.");
  return errors;
}

const LANG_NAMES = { ko: "한국어", en: "영어(EN)", ja: "일본어(JP)" };

// 받는 사람에게 갈 메일 제목과 본문
export function contactMail(d) {
  const one = (s) => String(s).replace(/[\r\n]+/g, " ").trim();
  return {
    subject: `[홈페이지 문의${{ en: " EN", ja: " JP" }[d.lang] || ""}] ${one(d.type)} - ${one(d.name)}`,
    text: [`문의 항목: ${one(d.type)}`, `성함: ${one(d.name)}`, `연락처: ${one(d.phone)}`, `이메일: ${one(d.email)}`, `페이지 언어: ${LANG_NAMES[d.lang] || LANG_NAMES.ko}`, "", String(d.message).trim(), "", "— pondmakers.com 문의 양식에서 보냄"].join("\n")
  };
}
