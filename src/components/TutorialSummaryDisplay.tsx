import React, { useEffect, createRef } from "react";
import { useStoreActions, useStoreState } from "../store";
import {
  ITutorialSummary,
  SingleTutorialDisplayKind,
} from "../model/tutorials";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import LoadingOverlay from "./LoadingOverlay";

interface TutorialSummaryDisplayProps {
  tutorial: ITutorialSummary;
  kind?: SingleTutorialDisplayKind;
}

export const TutorialSummaryDisplay: React.FC<TutorialSummaryDisplayProps> = ({
  tutorial,
  kind,
}) => {
  const createProjectFromTutorial = useStoreActions(
    (actions) => actions.tutorialCollection.createProjectFromTutorial
  );
  const createDemoFromTutorial = useStoreActions(
    (actions) => actions.tutorialCollection.createDemoFromTutorial
  );
  const createShareFromTutorial = useStoreActions(
    (actions) => actions.userConfirmations.shareTutorialInteraction.launch
  );

  const alertRef: React.RefObject<HTMLDivElement> = createRef();
  const buttonsRef: React.RefObject<HTMLDivElement> = createRef();

  const maybeSlugCreating = useStoreState(
    (state) => state.tutorialCollection.maybeSlugCreating
  );

  const loadingSomeTutorial = maybeSlugCreating != null;
  const loadingThisTutorial = maybeSlugCreating === tutorial.slug;

  useEffect(() => {
    tutorial.contentNodes.forEach((ch) => {
      alertRef.current!.insertBefore(ch, buttonsRef.current!);
    });
  });

  const launchTutorial = () => {
    createProjectFromTutorial(tutorial.slug);
  };

  const launchDemo = (evt: any) => {
    createDemoFromTutorial(tutorial.slug);
  };

  const h1s = tutorial.contentNodes.filter((n) => n.nodeName === "H1");
  const maybeDisplayName = h1s.length === 0 ? null : h1s[0].textContent;
  const displayName = maybeDisplayName ?? "Unknown project";

  const launchShare = () => {
    const shareInfo = { slug: tutorial.slug, displayName };
    createShareFromTutorial(shareInfo);
  };

  const showDemoButton = kind === "tutorial-and-demo" || kind == null;
  const showShareButton = kind == null;

  return (
    <li>
      <LoadingOverlay show={loadingThisTutorial}>
        <p>Creating project for tutorial...</p>
      </LoadingOverlay>
      <Alert className="TutorialCard" variant="success" ref={alertRef}>
        {tutorial.metadata.difficulty && (
          <div className="tag-difficulty">{tutorial.metadata.difficulty}</div>
        )}
        <div className="button-bar" ref={buttonsRef}>
          {showDemoButton && (
            <Button
              title="Try this project"
              disabled={loadingSomeTutorial}
              variant="outline-primary"
              onClick={launchDemo}
            >
              Demo
            </Button>
          )}
          <Button
            title="Learn how to make this project"
            disabled={loadingSomeTutorial}
            variant="outline-primary"
            onClick={launchTutorial}
          >
            Tutorial
          </Button>
          {showShareButton && (
            <Button
              title="Share this project"
              disabled={loadingSomeTutorial}
              variant="outline-primary"
              onClick={launchShare}
            >
              Share
            </Button>
          )}
        </div>
      </Alert>
    </li>
  );
};
