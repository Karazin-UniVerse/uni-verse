import type { GripPinKind } from '@universe/core/constants/grip-hosted';
import type {
  GripBoardEdge,
  GripBoardNode,
  GripGradeFeedback,
} from '@universe/core/types/grip-hosted';

export interface GripPrivatePin {
  on: string;
  kind: GripPinKind;
  question: string;
  rubric: string[];
}

export interface GripPrivateBoard {
  summary: string;
  nodes: GripBoardNode[];
  edges: GripBoardEdge[];
  pins: GripPrivatePin[];
}

export type GripBoardValidation =
  { board: GripPrivateBoard; errors: [] } | { errors: string[]; board?: never };

export interface GripValidatedGrade {
  score: number;
  passed: boolean;
  feedback: GripGradeFeedback[];
}
