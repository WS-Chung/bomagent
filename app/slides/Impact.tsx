import SlideShell from "@/app/components/SlideShell";
import { StatShift, StatShiftGrid } from "@/app/components/StatShift";
import Callout from "@/app/components/Callout";

export default function Impact() {
  return (
    <SlideShell
      number="05"
      eyebrow="QUANTITATIVE IMPACT"
      title="얼마나, 어떻게 줄어드는가"
      description="'조금 편해지는' 게 아니다. 반복 대사·수동 체크·버전 관리라는 작업 자체가 사라진다."
    >
      <StatShiftGrid cols={3}>
        <StatShift
          label="대사(對査) 미팅"
          from="주간 정례 반복"
          to="상시 1화면"
          note="'최신 맞아요?'를 확인하러 모이는 미팅의 목적 자체가 소멸"
        />
        <StatShift
          label="납기 체크"
          from="부품 96종 수동 확인"
          to="자동 · 실시간"
          note="L/T·재고를 손으로 훑는 반복 작업 → 위험도 자동 산출"
        />
        <StatShift
          label="정보 버전"
          from="부서별 사본 다수"
          to="단일 원천 1"
          note="어느 파일이 진짜인지 다투는 일이 없어짐"
        />
        <StatShift
          label="부족 발견 시점"
          from="터진 뒤 사후 대응"
          to="2~6개월 사전 예측"
          note="위험을 미리 알고 발주를 앞당길 수 있는 시간 확보"
        />
        <StatShift
          label="예측 산출"
          from="엑셀 수 시간"
          to="1초 미만"
          note="같은 입력이면 같은 결과 — 사람마다 다른 계산이 사라짐"
        />
        <StatShift
          label="발주 대상 파악"
          from="수동 취합·정리"
          to="공급사별 자동"
          note="발주 필요 품목을 공급사 단위로 묶어 원클릭 발주서까지"
        />
      </StatShiftGrid>

      <Callout variant="success" title="정량 효과의 본질">
        투입 시간을 몇 % 아끼는 문제가 아니라, <b>반복 확인·수동 대사·버전 관리</b>
        라는 <b>업무 항목이 0으로 수렴</b>한다는 점이 핵심이다.
      </Callout>

      <p className="text-[12px] text-slate-500 leading-relaxed">
        ※ 구체 수치는 조직·품목 규모에 따라 달라질 수 있으나, 위 전환은 방식이
        바뀌면 <b className="text-slate-400">구조적으로 발생하는 감소</b>다.
      </p>
    </SlideShell>
  );
}
