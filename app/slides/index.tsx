import type { ComponentType } from "react";
import Overview from "./01_Overview";
import ValueChain from "./02_ValueChain";
import DesignBom from "./03_DesignBom";
import ProcurementGap from "./04_ProcurementGap";
import MassProduction from "./05_MassProduction";
import InvisibleIssues from "./06_InvisibleIssues";
import SsotAbsent from "./07_SsotAbsent";
import CommOverhead from "./08_CommOverhead";
import SolutionOverview from "./09_SolutionOverview";
import Architecture from "./10_Architecture";
import Features from "./11_Features";
import ForecastEngine from "./12_ForecastEngine";
import BeforeAfter from "./13_BeforeAfter";
import ExpectedImpact from "./14_ExpectedImpact";
import Roadmap from "./15_Roadmap";

export const slides: Record<string, ComponentType> = {
  overview: Overview,
  "value-chain": ValueChain,
  "design-bom": DesignBom,
  "procurement-gap": ProcurementGap,
  "mass-production": MassProduction,
  "invisible-issues": InvisibleIssues,
  "ssot-absent": SsotAbsent,
  "comm-overhead": CommOverhead,
  "solution-overview": SolutionOverview,
  architecture: Architecture,
  features: Features,
  "forecast-engine": ForecastEngine,
  "before-after": BeforeAfter,
  "expected-impact": ExpectedImpact,
  roadmap: Roadmap,
};

export const slideIds = Object.keys(slides);
export const defaultSlideId = "overview";
