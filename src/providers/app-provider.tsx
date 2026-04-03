import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { sampleItems } from "../constants/sampleData";
import { QUADRANT_META } from "../constants/quadrants";
import { requestClarityV1 } from "../features/clarity-v1/service";
import {
  analyzeClarityInput,
  analyzeStructuredClarityInput,
  answerClarityQuestion as answerClarityQuestionInAnalysis,
  focusClarityDecisionGroup as focusClarityDecisionGroupInAnalysis,
} from "../logic/clarity";
import { evaluateTriage, getQuadrantGuidance } from "../logic/triage";
import { DEFAULT_TRIAGE_ANSWERS } from "../logic/triageConfig";
import { storage } from "../storage/storage";
import { triggerSuccessHaptic } from "../utils/haptics";
import { createId } from "../utils/id";
import type {
  ClarityAnalysis,
  ClarityCandidate,
  DecisionItem,
  DraftDecision,
  Quadrant,
  TriageResult,
} from "../types/decision";

interface AppContextValue {
  items: DecisionItem[];
  hydrated: boolean;
  draft: DraftDecision | null;
  claritySession: ClarityAnalysis | null;
  introSeen: boolean;
  startDraft: (draft?: Partial<DraftDecision>) => void;
  startRetriage: (itemId: string) => void;
  updateDraft: (patch: Partial<DraftDecision>) => void;
  clearDraft: () => void;
  runClarity: (rawInput: string) => Promise<ClarityAnalysis>;
  focusClarityDecisionGroup: (decisionGroupId: string) => void;
  answerClarityQuestion: (candidateId: string) => void;
  clearClarity: () => void;
  saveClarityCandidate: (candidate: ClarityCandidate, rawInput?: string) => string;
  saveClarityCandidates: (candidates: ClarityCandidate[], rawInput?: string) => string[];
  saveDraftResult: (result: TriageResult) => string | null;
  updateItemBasics: (id: string, patch: Pick<DecisionItem, "title" | "notes" | "category">) => void;
  toggleComplete: (id: string) => void;
  deleteItem: (id: string) => void;
  moveQuadrant: (id: string, quadrant: Quadrant) => void;
  dismissIntro: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const normalizeDraft = (draft?: Partial<DraftDecision>): DraftDecision => ({
  editingId: draft?.editingId,
  title: draft?.title ?? "",
  notes: draft?.notes ?? "",
  category: draft?.category ?? "",
  triageAnswers: {
    ...DEFAULT_TRIAGE_ANSWERS,
    ...draft?.triageAnswers,
    impactAreas: draft?.triageAnswers?.impactAreas ?? [],
  },
});

export const AppProvider = ({ children }: PropsWithChildren) => {
  const [items, setItems] = useState<DecisionItem[]>([]);
  const [draft, setDraft] = useState<DraftDecision | null>(null);
  const [claritySession, setClaritySession] = useState<ClarityAnalysis | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [introSeen, setIntroSeen] = useState(false);
  const itemsRef = useRef<DecisionItem[]>([]);
  const commitItems = (updater: (currentItems: DecisionItem[]) => DecisionItem[]) => {
    setItems((currentItems) => {
      const nextItems = updater(currentItems);
      itemsRef.current = nextItems;
      return nextItems;
    });
  };

  useEffect(() => {
    const boot = async () => {
      const [storedItems, storedIntroSeen] = await Promise.all([
        storage.loadItems(),
        storage.loadIntroSeen(),
      ]);

      if (storedItems.length) {
        itemsRef.current = storedItems;
        setItems(storedItems);
      } else {
        itemsRef.current = sampleItems;
        setItems(sampleItems);
        storage.saveItems(sampleItems).catch(() => undefined);
      }

      setIntroSeen(storedIntroSeen);
      setHydrated(true);
    };

    boot().catch(() => {
      itemsRef.current = sampleItems;
      setItems(sampleItems);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    storage.saveItems(items).catch(() => undefined);
  }, [hydrated, items]);

  const startDraft = (nextDraft?: Partial<DraftDecision>) => {
    setClaritySession(null);
    setDraft(normalizeDraft(nextDraft));
  };

  const startRetriage = (itemId: string) => {
    const existing = items.find((item) => item.id === itemId);
    if (!existing) {
      return;
    }

    setDraft(
      normalizeDraft({
        editingId: existing.id,
        title: existing.title,
        notes: existing.notes,
        category: existing.category,
        triageAnswers: existing.triageAnswers,
      })
    );
  };

  const updateDraft = (patch: Partial<DraftDecision>) => {
    setDraft((currentDraft) => {
      const baseDraft = currentDraft ?? normalizeDraft();

      return normalizeDraft({
        ...baseDraft,
        ...patch,
        triageAnswers: patch.triageAnswers
          ? { ...baseDraft.triageAnswers, ...patch.triageAnswers }
          : baseDraft.triageAnswers,
      });
    });
  };

  const clearDraft = () => setDraft(null);
  const clearClarity = () => setClaritySession(null);

  const persistItems = (
    nextItemsToCreate: Array<
      Pick<
        DecisionItem,
        | "title"
        | "notes"
        | "category"
        | "urgencyScore"
        | "importanceScore"
        | "quadrant"
        | "triageAnswers"
        | "recommendation"
        | "nextStep"
        | "explanation"
      >
    >
  ) => {
    const now = new Date().toISOString();
    const createdItems: DecisionItem[] = nextItemsToCreate.map((nextItem) => ({
      id: createId(),
      createdAt: now,
      updatedAt: now,
      completed: false,
      ...nextItem,
    }));

    const nextItems = [...createdItems, ...itemsRef.current];
    itemsRef.current = nextItems;
    setItems(nextItems);
    triggerSuccessHaptic();
    return createdItems.map((item) => item.id);
  };

  const persistItem = (
    nextItem: Pick<
      DecisionItem,
      | "title"
      | "notes"
      | "category"
      | "urgencyScore"
      | "importanceScore"
      | "quadrant"
      | "triageAnswers"
      | "recommendation"
      | "nextStep"
      | "explanation"
    >
  ) => persistItems([nextItem])[0];

  const runClarity = async (rawInput: string) => {
    setDraft(null);
    const normalizedInput = rawInput.trim();
    const aiResult = await requestClarityV1(normalizedInput);
    const structuredSession = aiResult
      ? analyzeStructuredClarityInput(normalizedInput, aiResult)
      : null;
    const nextSession =
      structuredSession && structuredSession.status === "ready"
        ? structuredSession
        : analyzeClarityInput(normalizedInput);
    setClaritySession(nextSession);
    return nextSession;
  };

  const answerClarityQuestion = (candidateId: string) => {
    setClaritySession((currentSession) => {
      if (!currentSession) {
        return currentSession;
      }

      return answerClarityQuestionInAnalysis(currentSession, candidateId);
    });
  };

  const focusClarityDecisionGroup = (decisionGroupId: string) => {
    setClaritySession((currentSession) => {
      if (!currentSession) {
        return currentSession;
      }

      return focusClarityDecisionGroupInAnalysis(currentSession, decisionGroupId);
    });
  };

  const saveClarityCandidate = (candidate: ClarityCandidate, rawInput?: string) => {
    return persistItem({
      title: candidate.title,
      notes:
        rawInput && rawInput.trim().toLowerCase() !== candidate.title.trim().toLowerCase()
          ? rawInput.trim()
          : "",
      category: candidate.category,
      urgencyScore: candidate.triageResult.urgencyScore,
      importanceScore: candidate.triageResult.importanceScore,
      quadrant: candidate.triageResult.quadrant,
      triageAnswers: candidate.triageAnswers,
      recommendation: candidate.triageResult.recommendation,
      nextStep: candidate.triageResult.nextStep,
      explanation: candidate.triageResult.explanation,
    });
  };

  const saveClarityCandidates = (candidates: ClarityCandidate[], rawInput?: string) => {
    if (!candidates.length) {
      return [];
    }

    return persistItems(
      candidates.map((candidate) => ({
        title: candidate.title,
        notes:
          rawInput && rawInput.trim().toLowerCase() !== candidate.title.trim().toLowerCase()
            ? rawInput.trim()
            : "",
        category: candidate.category,
        urgencyScore: candidate.triageResult.urgencyScore,
        importanceScore: candidate.triageResult.importanceScore,
        quadrant: candidate.triageResult.quadrant,
        triageAnswers: candidate.triageAnswers,
        recommendation: candidate.triageResult.recommendation,
        nextStep: candidate.triageResult.nextStep,
        explanation: candidate.triageResult.explanation,
      }))
    );
  };

  const saveDraftResult = (result: TriageResult) => {
    if (!draft) {
      return null;
    }

    const now = new Date().toISOString();
    const currentItems = itemsRef.current;

    if (draft.editingId) {
      const nextItems = currentItems.map((item) =>
        item.id === draft.editingId
          ? {
              ...item,
              title: draft.title.trim(),
              notes: draft.notes.trim(),
              category: draft.category.trim(),
              updatedAt: now,
              urgencyScore: result.urgencyScore,
              importanceScore: result.importanceScore,
              quadrant: result.quadrant,
              triageAnswers: draft.triageAnswers,
              recommendation: result.recommendation,
              nextStep: result.nextStep,
              explanation: result.explanation,
            }
          : item
      );

      itemsRef.current = nextItems;
      setItems(nextItems);
      triggerSuccessHaptic();
      clearDraft();
      return draft.editingId;
    }

    const newItemId = persistItem({
      title: draft.title.trim(),
      notes: draft.notes.trim(),
      category: draft.category.trim(),
      urgencyScore: result.urgencyScore,
      importanceScore: result.importanceScore,
      quadrant: result.quadrant,
      triageAnswers: draft.triageAnswers,
      recommendation: result.recommendation,
      nextStep: result.nextStep,
      explanation: result.explanation,
    });
    clearDraft();
    return newItemId;
  };

  const updateItemBasics = (id: string, patch: Pick<DecisionItem, "title" | "notes" | "category">) => {
    commitItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );
  };

  const toggleComplete = (id: string) => {
    commitItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              completed: !item.completed,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );
  };

  const deleteItem = (id: string) => {
    commitItems((currentItems) => currentItems.filter((item) => item.id !== id));
  };

  const moveQuadrant = (id: string, quadrant: Quadrant) => {
    commitItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const guidance = getQuadrantGuidance(quadrant, item.triageAnswers);
        return {
          ...item,
          quadrant,
          recommendation: guidance.recommendation,
          nextStep: guidance.nextStep,
          explanation: `Moved manually to ${QUADRANT_META[quadrant].label}. ${QUADRANT_META[quadrant].description}`,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const dismissIntro = () => {
    setIntroSeen(true);
    storage.saveIntroSeen(true).catch(() => undefined);
  };

  return (
    <AppContext.Provider
      value={{
        items,
        hydrated,
        draft,
        claritySession,
        introSeen,
        startDraft,
        startRetriage,
        updateDraft,
        clearDraft,
        runClarity,
        focusClarityDecisionGroup,
        answerClarityQuestion,
        clearClarity,
        saveClarityCandidate,
        saveClarityCandidates,
        saveDraftResult,
        updateItemBasics,
        toggleComplete,
        deleteItem,
        moveQuadrant,
        dismissIntro,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppData must be used within AppProvider");
  }

  return context;
};
