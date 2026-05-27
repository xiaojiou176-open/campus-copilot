import "./index.css";
import { Composition } from "remotion";
import { OpenCampusWalkthrough } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="OpenCampusWalkthrough"
        component={OpenCampusWalkthrough}
        durationInFrames={720}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
