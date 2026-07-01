export type NavItem = {
  id: string;
  label: string;
  number?: string;
  group?: string;
  appendix?: boolean;
};

export const navItems: NavItem[] = [
  // INTRO
  { id: "overview", label: "Overview", number: "01", group: "INTRO" },

  // PROBLEM · 현황 진단
  {
    id: "value-chain",
    label: "밸류체인 순환",
    number: "02",
    group: "PROBLEM · 현황 진단",
  },
  {
    id: "design-bom",
    label: "묻히는 BOM",
    number: "03",
    group: "PROBLEM · 현황 진단",
  },
  {
    id: "procurement-gap",
    label: "구매 오퍼레이터화",
    number: "04",
    group: "PROBLEM · 현황 진단",
  },
  {
    id: "mass-production",
    label: "납기 vs 과잉재고",
    number: "05",
    group: "PROBLEM · 현황 진단",
  },
  {
    id: "invisible-issues",
    label: "자산 관리 사각지대",
    number: "06",
    group: "PROBLEM · 현황 진단",
  },
  {
    id: "ssot-absent",
    label: "SSoT 부재",
    number: "07",
    group: "PROBLEM · 현황 진단",
  },
  {
    id: "comm-overhead",
    label: "커뮤니케이션 비용",
    number: "08",
    group: "PROBLEM · 현황 진단",
  },

  // SOLUTION · BOM Agent
  {
    id: "solution-overview",
    label: "솔루션 개요",
    number: "09",
    group: "SOLUTION · BOM Agent",
  },
  {
    id: "architecture",
    label: "시스템 아키텍처",
    number: "10",
    group: "SOLUTION · BOM Agent",
  },
  {
    id: "features",
    label: "핵심 기능",
    number: "11",
    group: "SOLUTION · BOM Agent",
  },
  {
    id: "forecast-engine",
    label: "Forecast Engine",
    number: "12",
    group: "SOLUTION · BOM Agent",
  },

  // IMPACT · 도입 효과
  {
    id: "before-after",
    label: "Before / After",
    number: "13",
    group: "IMPACT · 도입 효과",
  },
  {
    id: "expected-impact",
    label: "기대 효과",
    number: "14",
    group: "IMPACT · 도입 효과",
  },

  // ROADMAP · 확장 방향
  {
    id: "roadmap",
    label: "확장 로드맵",
    number: "15",
    group: "ROADMAP · 확장 방향",
  },
];
