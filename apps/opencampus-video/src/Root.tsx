import "./index.css";
import { Composition } from "remotion";
import { CampusCopilotWalkthrough } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CampusCopilotWalkthrough"
        component={CampusCopilotWalkthrough}
        durationInFrames={720}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
