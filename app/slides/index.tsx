import type { ComponentType } from "react";
import Overview from "./Overview";
import Problem from "./Problem";
import Root from "./Root";
import ToBe from "./ToBe";
import Impact from "./Impact";
import Compare from "./Compare";
import Deliverables from "./Deliverables";
import Questions from "./Questions";
import Closing from "./Closing";

export const slides: Record<string, ComponentType> = {
  overview: Overview,
  problem: Problem,
  root: Root,
  tobe: ToBe,
  impact: Impact,
  compare: Compare,
  deliverables: Deliverables,
  questions: Questions,
  closing: Closing,
};

export const slideIds = Object.keys(slides);
export const defaultSlideId = "overview";
