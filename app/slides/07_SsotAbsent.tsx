import SlideShell from "@/app/components/SlideShell";
import BlockFlow from "@/app/components/BlockFlow";
import { Card, CardGrid } from "@/app/components/Card";
import Callout from "@/app/components/Callout";

export default function SsotAbsent() {
  return (
    <SlideShell
      number="07"
      eyebrow="Problem · SSOT Absent"
      title="Single Source of Truth의 부재"
      description="체계가 잡힌 업체는 모든 부품에 대해 자체 채번(Self Part Number)을 부여해 관리한다. 그러나 엔지니어 개별 라이브러리와 조직 채번 사이의 간극이 자주 벌어진다."
    >
      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          이상적인 SSOT 구조 (To-Be)
        </p>
        <BlockFlow
          items={[
            { num: "01", title: "회사 등록 부품만 사용", sub: "Self PN 채번 완료" },
            { num: "02", title: "모든 엔지니어 동일 라이브러리", sub: "Shared Symbol Library" },
            { num: "03", title: "설계 시점부터 SSOT 정렬", sub: "Master BOM 승격 자동" },
            { num: "04", title: "구매·회계 즉시 반영", sub: "동일 데이터 다른 뷰" },
          ]}
        />
      </div>

      <CardGrid cols={2}>
        <Card title="현장에서 실제 벌어지는 일" accent="rose" badge="Reality">
          <ul className="list-disc pl-4 space-y-1">
            <li>엔지니어가 <b>필요할 때마다 오픈소스 라이브러리를 개별 다운로드</b></li>
            <li>동일 부품이 프로젝트마다 다른 심볼로 등록됨</li>
            <li>회사 정식 채번과 사용 라이브러리가 <b>동기화되지 않음</b></li>
            <li>ERP는 결과 데이터를 담을 뿐, 앞단 정렬을 강제하지 못함</li>
          </ul>
        </Card>
        <Card title="왜 ERP만으로 안 되는가" accent="amber" badge="Root Cause">
          <ul className="list-disc pl-4 space-y-1">
            <li>ERP는 <b>회계·재고 관점</b>의 자산 시스템</li>
            <li>설계 시점의 <b>부품 선정 워크플로우와 결합되지 않음</b></li>
            <li>엔지니어에게 ERP UI는 진입 장벽이 높음</li>
            <li>결과: 프로세스가 명시적으로 존재해도 정착 실패</li>
          </ul>
        </Card>
      </CardGrid>

      <div className="rounded-2xl glass p-4 sm:p-5 space-y-3">
        <p className="text-[12px] uppercase tracking-[0.18em] text-brand-300 font-semibold">
          Self Part Number 체계 예시 (Prefix 기반)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-slate-400 uppercase tracking-wider text-[12px] border-b border-slate-700/60">
                <th className="text-left py-2.5 px-3.5">Prefix</th>
                <th className="text-left py-2.5 px-3.5">Class Bucket</th>
                <th className="text-left py-2.5 px-3.5">Example</th>
                <th className="text-left py-2.5 px-3.5">비고</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              <tr className="border-b border-slate-800/60 hover:bg-brand-500/5">
                <td className="py-2.5 px-3.5 font-mono text-brand-300">EP</td>
                <td className="py-2.5 px-3.5">Capacitor · Resistor · Inductor · Diode · LED · Fuse</td>
                <td className="py-2.5 px-3.5 font-mono">EP000001</td>
                <td className="py-2.5 px-3.5 text-slate-400">수동 소자군</td>
              </tr>
              <tr className="border-b border-slate-800/60 hover:bg-brand-500/5">
                <td className="py-2.5 px-3.5 font-mono text-brand-300">EA</td>
                <td className="py-2.5 px-3.5">IC-MCU · IC-Regulator · MOSFET · Oscillator</td>
                <td className="py-2.5 px-3.5 font-mono">EA000042</td>
                <td className="py-2.5 px-3.5 text-slate-400">능동 소자군</td>
              </tr>
              <tr className="hover:bg-brand-500/5">
                <td className="py-2.5 px-3.5 font-mono text-brand-300">ME</td>
                <td className="py-2.5 px-3.5">Connector · Screw · Mechanical</td>
                <td className="py-2.5 px-3.5 font-mono">ME000007</td>
                <td className="py-2.5 px-3.5 text-slate-400">기구·커넥터</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[12px] text-slate-400">
          Prefix는 <b>Class(분류)와 다대일(N:1) 관계</b>를 가진다. 하나의 Prefix가
          여러 세부 분류를 포괄해도 부품 관리자의 실무 감각과 일치한다.
        </p>
      </div>

      <Callout variant="info" title="설계 원칙">
        시스템은 <b>엔지니어의 자연스러운 워크플로우 안에서</b> Self PN 채번을
        제안해야 한다. 부품 등록·입고 시 Prefix만 고르면 다음 번호를 자동으로
        제안하는 방식이 그 예다. 프로세스가 강제가 아니라 편의가 될 때 정착된다.
      </Callout>
    </SlideShell>
  );
}
