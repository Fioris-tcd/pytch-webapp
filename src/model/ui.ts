import { Action, action, computed, Computed, Thunk, thunk } from "easy-peasy";
import { ProjectId } from "./project-core";
import { failIfNull, getPropertyByPath, propSetterAction } from "../utils";
import {
  ICreateProjectInteraction,
  createProjectInteraction,
} from "./user-interactions/create-project";
import { IProcessFilesInteraction } from "./user-interactions/process-files";
import { addAssetsInteraction } from "./user-interactions/add-assets";
import {
  IAddClipArtItemsInteraction,
  addClipArtItemsInteraction,
} from "./user-interactions/clipart-gallery-select";
import {
  IRenameAssetInteraction,
  renameAssetInteraction,
} from "./user-interactions/rename-asset";
import {
  IRenameProjectInteraction,
  renameProjectInteraction,
} from "./user-interactions/rename-project";
import {
  IDisplayScreenshotInteraction,
  displayScreenshotInteraction,
} from "./user-interactions/display-screenshot";
import {
  IDownloadZipfileInteraction,
  downloadZipfileInteraction,
} from "./user-interactions/download-zipfile";
import {
  ICopyProjectInteraction,
  copyProjectInteraction,
} from "./user-interactions/save-project-as";
import {
  ICodeDiffHelpInteraction,
  codeDiffHelpInteraction,
} from "./user-interactions/code-diff-help";
import {
  ICropScaleImageInteraction,
  cropScaleImageInteraction,
} from "./user-interactions/crop-scale-image";
import {
  IShareTutorialInteraction,
  shareTutorialInteraction,
} from "./user-interactions/share-tutorial";
import { ViewCodeDiff, viewCodeDiff } from "./user-interactions/view-code-diff";

import { uploadZipfilesInteraction } from "./user-interactions/upload-zipfiles";
import { IHelpSidebar, helpSidebar } from "./help-sidebar";

import {
  stageWidth,
  stageHeight,
  stageFullScreenBorderPx,
  stageHalfWidth,
  stageHalfHeight,
} from "../constants";
import { coordsChooser, CoordsChooser } from "./coordinates-chooser";

/** Choices the user has made about how the IDE should be laid out.
 * Currently this is just a choice between two layouts, but in due
 * course it might include a draggable splitter between panes. */

export type IDELayoutKind = "wide-info-pane" | "tall-code-editor";

export interface IStageDisplaySize {
  width: number;
  height: number;
}

export interface IStageVerticalResizeState {
  dragStartY: number;
  dragStartHeight: number;
}

const buttonTourProgressStages = ["green-flag"] as const;
type ButtonTourStage = (typeof buttonTourProgressStages)[number];

type FullScreenStateIsFullScreen = {
  isFullScreen: true;
  stageWidthInIDE: number;
  stageHeightInIDE: number;
};
type FullScreenState = { isFullScreen: false } | FullScreenStateIsFullScreen;

type StagePosition = { stageX: number; stageY: number };
export type PointerStagePosition =
  | { kind: "not-over-stage" }
  | ({ kind: "over-stage" } & StagePosition);

type UpdatePointerOverStageArgs = {
  canvas: HTMLCanvasElement | null;
  displaySize: IStageDisplaySize;
  mousePosition: { clientX: number; clientY: number } | null;
};

export interface IIDELayout {
  kind: IDELayoutKind;
  fullScreenState: FullScreenState;
  pointerStagePosition: PointerStagePosition;
  coordsChooser: CoordsChooser;
  stageDisplaySize: IStageDisplaySize;
  stageVerticalResizeState: IStageVerticalResizeState | null;
  buttonTourProgressIndex: number;
  buttonTourProgressStage: Computed<IIDELayout, ButtonTourStage | null>;
  helpSidebar: IHelpSidebar;
  setKind: Action<IIDELayout, IDELayoutKind>;
  _setIsFullScreen: Action<IIDELayout, boolean>;
  setIsFullScreen: Thunk<IIDELayout, boolean>;
  ensureNotFullScreen: Thunk<IIDELayout>;
  resizeFullScreen: Action<IIDELayout>;
  setPointerNotOverStage: Action<IIDELayout>;
  setPointerOverStage: Action<IIDELayout, StagePosition>;
  updatePointerStagePosition: Thunk<IIDELayout, UpdatePointerOverStageArgs>;
  setStageDisplayWidth: Action<IIDELayout, number>;
  setStageDisplayHeight: Action<IIDELayout, number>;
  initiateVerticalResize: Action<IIDELayout, number>;
  completeVerticalResize: Action<IIDELayout>;
  dismissButtonTour: Action<IIDELayout>;
  initiateButtonTour: Action<IIDELayout>;
  maybeAdvanceTour: Action<IIDELayout, ButtonTourStage>;
}

const fullScreenStageDisplaySize = () => {
  const { clientWidth, clientHeight } = document.documentElement;
  const maxStageWidth = clientWidth - 2 * stageFullScreenBorderPx;
  // TODO: "40" comes from an estimate of StageControls height; turn
  // this into a constant somewhere.
  const maxStageHeight = clientHeight - 40 - 2 * stageFullScreenBorderPx;

  const stretchWidth = maxStageWidth / stageWidth;
  const stretchHeight = maxStageHeight / stageHeight;

  if (stretchWidth > stretchHeight) {
    const clampedStageWidth = Math.round(stageWidth * stretchHeight);
    return {
      width: clampedStageWidth,
      height: maxStageHeight,
    };
  } else {
    const clampedStageHeight = Math.round(stageHeight * stretchWidth);
    return {
      width: maxStageWidth,
      height: clampedStageHeight,
    };
  }
};

export const ideLayout: IIDELayout = {
  kind: "wide-info-pane",
  fullScreenState: { isFullScreen: false },
  pointerStagePosition: { kind: "not-over-stage" },
  coordsChooser,
  setKind: action((state, kind) => {
    if (state.kind === kind) {
      state.stageDisplaySize = { width: stageWidth, height: stageHeight };
    }
    state.kind = kind;
  }),
  _setIsFullScreen: action((state, isFullScreen) => {
    if (isFullScreen === state.fullScreenState.isFullScreen) {
      console.warn(`trying to set isFullScreen ${isFullScreen} but is already`);
      return;
    }

    if (isFullScreen) {
      const stageSizeIDE = state.stageDisplaySize;
      state.stageDisplaySize = fullScreenStageDisplaySize();
      state.fullScreenState = {
        isFullScreen: true,
        stageWidthInIDE: stageSizeIDE.width,
        stageHeightInIDE: stageSizeIDE.height,
      };
    } else {
      // Switching to non-full-screen; must currently be in full-screen;
      // state.fullScreenInfo type must be FullScreenInfoFullScreen:
      const info = state.fullScreenState as FullScreenStateIsFullScreen;

      state.stageDisplaySize = {
        width: info.stageWidthInIDE,
        height: info.stageHeightInIDE,
      };
      state.fullScreenState = { isFullScreen: false };
    }
  }),
  setIsFullScreen: thunk((actions, isFullScreen) => {
    actions._setIsFullScreen(isFullScreen);
    // If we're moving from full-screen to non-full-screen, the
    // coords-chooser should be idle anyway, but no harm to set it in
    // this case.
    actions.coordsChooser.setStateKind("idle");
  }),
  ensureNotFullScreen: thunk((actions, _voidPayload, helpers) => {
    if (helpers.getState().fullScreenState.isFullScreen) {
      actions.setIsFullScreen(false);
      // Currently, the only reason this thunk is called is if an error
      // happens while in full-screen layout.  In that situation, it's
      // more useful to switch the IDE to "wide-info-pane" layout, so
      // the error message pane is visible.
      actions.setKind("wide-info-pane");
    }
  }),
  resizeFullScreen: action((state) => {
    state.stageDisplaySize = fullScreenStageDisplaySize();
  }),

  setPointerNotOverStage: action((state) => {
    state.pointerStagePosition = { kind: "not-over-stage" };
  }),
  setPointerOverStage: action((state, position) => {
    state.pointerStagePosition = { kind: "over-stage", ...position };
  }),
  updatePointerStagePosition: thunk(
    (actions, { canvas, displaySize, mousePosition }) => {
      if (canvas == null) {
        return;
      }
      if (mousePosition == null) {
        actions.setPointerNotOverStage();
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const stageLeft = rect.left + 1; // Allow for border.
      const stageTop = rect.top + 1; // Allow for border.

      const rawStageX =
        (stageWidth * (mousePosition.clientX - stageLeft)) / displaySize.width -
        stageHalfWidth;

      // Negate to convert from browser coord system of "down is
      // positive Y" to Scratch-like mathematical coord system of
      // "up is positive Y":
      const rawStageY =
        stageHalfHeight -
        (stageHeight * (mousePosition.clientY - stageTop)) / displaySize.height;

      // Present integers to the user:
      const stageX = Math.round(rawStageX);
      const stageY = Math.round(rawStageY);

      if (
        stageX < -stageHalfWidth ||
        stageX > stageHalfWidth ||
        stageY < -stageHalfHeight ||
        stageY > stageHalfHeight
      ) {
        actions.setPointerNotOverStage();
      } else {
        actions.setPointerOverStage({ stageX, stageY });
      }
    }
  ),

  stageDisplaySize: { width: stageWidth, height: stageHeight },
  setStageDisplayWidth: action((state, width) => {
    const height = Math.round(stageHeight * (width / stageWidth));
    state.stageDisplaySize = { width, height };
  }),
  setStageDisplayHeight: action((state, height) => {
    const width = Math.round(stageWidth * (height / stageHeight));
    state.stageDisplaySize = { width, height };
  }),

  stageVerticalResizeState: null,
  initiateVerticalResize: action((state, dragStartY) => {
    state.stageVerticalResizeState = {
      dragStartY,
      dragStartHeight: state.stageDisplaySize.height,
    };
  }),
  completeVerticalResize: action((state) => {
    state.stageVerticalResizeState = null;
  }),

  buttonTourProgressIndex: -1,
  buttonTourProgressStage: computed((state) => {
    const index = state.buttonTourProgressIndex;
    return index === -1 ? null : buttonTourProgressStages[index];
  }),
  dismissButtonTour: action((state) => {
    state.buttonTourProgressIndex = -1;
  }),
  initiateButtonTour: action((state) => {
    state.buttonTourProgressIndex = 0;
  }),
  maybeAdvanceTour: action((state, stageCompleted) => {
    if (state.buttonTourProgressStage === stageCompleted) {
      state.buttonTourProgressIndex += 1;
      if (state.buttonTourProgressIndex === buttonTourProgressStages.length) {
        state.buttonTourProgressIndex = -1;
      }
    }
  }),

  helpSidebar,
};

/** General modal dialog support. */

type IsShowingByName = Map<string, boolean>;

export interface IModals {
  isShowing: IsShowingByName;
  show: Action<IModals, string>;
  hide: Action<IModals, string>;
}

/** What stage are we at in performing a "dangerous" action (one
 * requiring confirmation by the user before actually doing it)? */
export enum DangerousActionProgress {
  AwaitingUserChoice,
  AwaitingActionCompletion,
}

/** Description of the "delete project" dangerous action. */
export type DeleteProjectDescriptor = {
  kind: "delete-project";
  projectName: string;
};

export type DeleteManyProjectsDescriptor = {
  kind: "delete-many-projects";
  projectIds: Array<ProjectId>;
};

export type DeleteAssetFromProjectDescriptor = {
  kind: "delete-project-asset";
  assetKindDisplayName: string;
  assetName: string;
};

export type DangerousActionDescriptor =
  | DeleteProjectDescriptor
  | DeleteManyProjectsDescriptor
  | DeleteAssetFromProjectDescriptor;

/** What dangerous action are we asking the user to confirm? */
export interface IDangerousActionConfirmation {
  progress: DangerousActionProgress;
  descriptor: DangerousActionDescriptor;
}

type DangerousActionLaunchArgs = {
  actionDescriptor: DangerousActionDescriptor;
  perform(): Promise<void>;
};

// TODO: Does this need a "failed" state?
type DangerousActionState =
  | { kind: "idle" }
  | ({ kind: "awaiting-user-confirmation" } & DangerousActionLaunchArgs)
  | {
      kind: "performing-action";
      actionDescriptor: DangerousActionDescriptor;
    };

export interface IUserConfirmations {
  dangerousActionConfirmation: IDangerousActionConfirmation | null;
  requestDangerousActionConfirmation: Action<
    IUserConfirmations,
    DangerousActionDescriptor
  >;
  markDangerousActionInProgress: Action<IUserConfirmations>;
  invokeDangerousAction: Thunk<IUserConfirmations>;
  dismissDangerousAction: Action<IUserConfirmations>;

  createProjectInteraction: ICreateProjectInteraction;
  addAssetsInteraction: IProcessFilesInteraction;
  addClipArtItemsInteraction: IAddClipArtItemsInteraction;
  renameAssetInteraction: IRenameAssetInteraction;
  renameProjectInteraction: IRenameProjectInteraction;
  displayScreenshotInteraction: IDisplayScreenshotInteraction;
  downloadZipfileInteraction: IDownloadZipfileInteraction;
  copyProjectInteraction: ICopyProjectInteraction;
  uploadZipfilesInteraction: IProcessFilesInteraction;
  codeDiffHelpInteraction: ICodeDiffHelpInteraction;
  cropScaleImageInteraction: ICropScaleImageInteraction;
  shareTutorialInteraction: IShareTutorialInteraction;

  viewCodeDiff: ViewCodeDiff;
}

// TODO: Better name than 'confirmations'.
//
export const userConfirmations: IUserConfirmations = {
  dangerousActionConfirmation: null,
  requestDangerousActionConfirmation: action((state, descriptor) => {
    state.dangerousActionConfirmation = {
      progress: DangerousActionProgress.AwaitingUserChoice,
      descriptor,
    };
  }),
  markDangerousActionInProgress: action((state) => {
    const dangerousActionConfirmation = failIfNull(
      state.dangerousActionConfirmation,
      "can't mark null dangerous-action-confirmation in progress"
    );
    dangerousActionConfirmation.progress =
      DangerousActionProgress.AwaitingActionCompletion;
  }),
  invokeDangerousAction: thunk(async (actions, payload, helpers) => {
    const state = helpers.getState();
    const dangerousActionConfirmation = failIfNull(
      state.dangerousActionConfirmation,
      "can't invoke null dangerous-action-confirmation"
    );

    actions.markDangerousActionInProgress();

    const actionDescriptor =
      dangerousActionConfirmation.descriptor.actionIfConfirmed;

    const actionFunction = getPropertyByPath(
      helpers.getStoreActions(),
      actionDescriptor.typePath
    );
    const actionResult = await actionFunction(actionDescriptor.payload);
    actions.dismissDangerousAction();
    return actionResult;
  }),
  dismissDangerousAction: action((state) => {
    state.dangerousActionConfirmation = null;
  }),

  createProjectInteraction,
  addAssetsInteraction,
  addClipArtItemsInteraction,
  renameAssetInteraction,
  renameProjectInteraction,
  displayScreenshotInteraction,
  downloadZipfileInteraction,
  copyProjectInteraction,
  uploadZipfilesInteraction,
  codeDiffHelpInteraction,
  cropScaleImageInteraction,
  shareTutorialInteraction,

  viewCodeDiff,
};

export interface IPlainTextPane {
  text: string;
  append: Action<IPlainTextPane, string>;
  appendTimestamped: Action<IPlainTextPane, string>;
  clear: Action<IPlainTextPane>;
}

const makeTextPane = (): IPlainTextPane => ({
  text: "",
  append: action((state, chunk) => {
    state.text += chunk;
  }),
  appendTimestamped: action((state, lineContent) => {
    const now = new Date(Date.now());
    state.text += `${now.toISOString()} : ${lineContent}\n`;
  }),
  clear: action((state) => {
    state.text = "";
  }),
});

export const standardOutputPane = makeTextPane();
export const editorWebSocketLog = makeTextPane();

// TODO: Does this interface belong somewhere else?
export interface IErrorReport {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pytchError: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errorContext: any;
}

export interface IErrorReportList {
  errors: Array<IErrorReport>;
  append: Action<IErrorReportList, IErrorReport>;
  clear: Action<IErrorReportList>;
}

export const errorReportList: IErrorReportList = {
  errors: [],
  append: action((state, errorReport) => {
    console.log("appending error", errorReport);
    state.errors.push(errorReport);
  }),
  clear: action((state) => {
    state.errors.splice(0);
  }),
};

export type InfoPanelTabKey =
  | "tutorial"
  | "assets"
  | "output"
  | "errors"
  | "websocket-log";

export interface IInfoPanel {
  activeTabKey: InfoPanelTabKey;
  setActiveTabKey: Action<IInfoPanel, InfoPanelTabKey>;
}

export const infoPanel: IInfoPanel = {
  activeTabKey: "assets",
  setActiveTabKey: propSetterAction("activeTabKey"),
};
