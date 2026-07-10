export type NavItem = {
  id: string;
  label: string;
  number?: string;
  group?: string;
  appendix?: boolean;
};

export const navItems: NavItem[] = [
  { id: "overview", label: "개요", number: "01", group: "진단 · AS-IS" },
  { id: "problem", label: "엑셀 BOM의 현실", number: "02", group: "진단 · AS-IS" },
  { id: "root", label: "왜 반복되나", number: "03", group: "진단 · AS-IS" },

  { id: "tobe", label: "하나의 진실원천", number: "04", group: "전환 · TO-BE" },
  { id: "impact", label: "정량 효과", number: "05", group: "전환 · TO-BE" },
  { id: "compare", label: "AS-IS vs To-Be", number: "06", group: "전환 · TO-BE" },

  { id: "deliverables", label: "무엇을 만들었나", number: "07", group: "산출물 · 화두" },
  { id: "questions", label: "남은 화두", number: "08", group: "산출물 · 화두" },
  { id: "closing", label: "핵심 메시지", number: "09", group: "산출물 · 화두" },
];
