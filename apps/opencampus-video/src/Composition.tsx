import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import sidepanelShot from "../../../docs/assets/sidepanel-overview.png";
import webWorkbenchShot from "../../../docs/assets/web-workbench-overview.png";

const palette = {
  background: "#EEF4FB",
  ink: "#12355D",
  inkSoft: "#36557B",
  panel: "#FFFFFF",
  panelSoft: "#F7FAFE",
  border: "#D7E3F2",
  accent: "#DDEEFF",
  accentStrong: "#14345B",
  accentSoft: "#53729A",
};

const fullSize: React.CSSProperties = {
  width: "100%",
  height: "100%",
};

const textStyles = {
  eyebrow: {
    color: palette.accentSoft,
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 3,
    textTransform: "uppercase" as const,
  },
  headline: {
    color: palette.ink,
    fontSize: 78,
    lineHeight: 1.04,
    fontWeight: 700,
    letterSpacing: -2.6,
  },
  subline: {
    color: palette.inkSoft,
    fontSize: 28,
    lineHeight: 1.4,
    fontWeight: 500,
  },
  cardTitle: {
    color: palette.ink,
    fontSize: 28,
    lineHeight: 1.2,
    fontWeight: 700,
    letterSpacing: -0.7,
  },
  cardBody: {
    color: palette.inkSoft,
    fontSize: 20,
    lineHeight: 1.45,
    fontWeight: 500,
  },
};

const entrance = (frame: number, delay = 0) => {
  const easedFrame = Math.max(0, frame - delay);
  return {
    opacity: interpolate(easedFrame, [0, 18], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }),
    transform: `translateY(${interpolate(easedFrame, [0, 18], [24, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    })}px)`,
  };
};

const floatTransform = (frame: number, strength = 8) =>
  `translateY(${Math.sin(frame / 24) * strength}px)`;

const sceneShell: React.CSSProperties = {
  ...fullSize,
  backgroundColor: palette.background,
  fontFamily:
    '"Avenir Next", "Söhne", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
};

const panelStyle: React.CSSProperties = {
  background: palette.panel,
  border: `1px solid ${palette.border}`,
  borderRadius: 28,
  boxShadow: "0 22px 48px rgba(18, 53, 93, 0.10)",
};

const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      alignSelf: "flex-start",
      padding: "12px 20px",
      borderRadius: 999,
      background: palette.accent,
      border: `1px solid #C6D9F0`,
      color: palette.accentStrong,
      fontSize: 20,
      fontWeight: 700,
    }}
  >
    {children}
  </div>
);

const FeatureCard: React.FC<{
  label: string;
  title: string;
  body: string;
}> = ({ label, title, body }) => (
  <div
    style={{
      ...panelStyle,
      width: 362,
      padding: "28px 28px 26px",
      background: palette.panelSoft,
    }}
  >
    <div
      style={{
        color: palette.accentSoft,
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: 2.2,
        textTransform: "uppercase",
        marginBottom: 20,
      }}
    >
      {label}
    </div>
    <div style={textStyles.cardTitle}>{title}</div>
    <div style={{ ...textStyles.cardBody, marginTop: 14 }}>{body}</div>
  </div>
);

const ScreenshotPanel: React.FC<{
  shot: string;
  label: string;
  title: string;
  body: string;
}> = ({ shot, label, title, body }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = interpolate(
    spring({
      frame,
      fps,
      config: {
        damping: 18,
        mass: 0.8,
        stiffness: 120,
      },
    }),
    [0, 1],
    [0.97, 1],
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 0.9fr",
        gap: 28,
        alignItems: "stretch",
        width: "100%",
      }}
    >
      <div
        style={{
          ...panelStyle,
          overflow: "hidden",
          padding: 18,
          background: "#F4F8FD",
          transform: `scale(${scale})`,
        }}
      >
        <Img
          src={shot}
          alt={title}
          style={{
            width: "100%",
            height: 430,
            borderRadius: 22,
            objectFit: "contain",
            objectPosition: "center top",
            backgroundColor: "#FFFFFF",
            display: "block",
          }}
        />
      </div>
      <div
        style={{
          ...panelStyle,
          padding: "34px 32px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: palette.panel,
        }}
      >
        <div>
          <div
            style={{
              color: palette.accentSoft,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 2.2,
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            {label}
          </div>
          <div style={{ ...textStyles.headline, fontSize: 48, letterSpacing: -1.5 }}>
            {title}
          </div>
          <div style={{ ...textStyles.cardBody, marginTop: 18 }}>{body}</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginTop: 24,
          }}
        >
          <Badge>Read-only workflow</Badge>
          <Badge>Extension and web stay aligned</Badge>
        </div>
      </div>
    </div>
  );
};

const OpeningScene: React.FC = () => {
  const frame = useCurrentFrame();
  const sitePills = [
    "Canvas",
    "Gradescope",
    "EdStem",
    "MyUW",
  ];

  return (
    <AbsoluteFill style={sceneShell}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at top left, rgba(203,226,255,0.9), transparent 42%), radial-gradient(circle at bottom right, rgba(221,238,255,0.8), transparent 36%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 44,
          borderRadius: 28,
          background: "rgba(255,255,255,0.84)",
          border: `1px solid ${palette.border}`,
          boxShadow: "0 20px 48px rgba(18, 53, 93, 0.08)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "86px 88px 82px",
          display: "grid",
          gridTemplateColumns: "1.15fr 0.85fr",
          gap: 28,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ ...textStyles.eyebrow, ...entrance(frame, 0) }}>
            OPENCAMPUS
          </div>
          <div style={{ ...entrance(frame, 4) }}>
            <Badge>Campus Copilot is shipping today</Badge>
          </div>
          <div style={{ ...textStyles.headline, ...entrance(frame, 8) }}>
            One local desk
            <br />
            for campus work.
          </div>
          <div style={{ ...textStyles.subline, maxWidth: 720, ...entrance(frame, 12) }}>
            Keep the same student workspace across four campus sites, then
            decide, export, and ask with citations instead of rebuilding your
            mental map every time.
          </div>
        </div>

        <div
          style={{
            ...panelStyle,
            padding: 28,
            background: "rgba(248,251,254,0.96)",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            transform: `${floatTransform(frame, 7)} ${entrance(frame, 14).transform}`,
            opacity: entrance(frame, 14).opacity,
          }}
        >
          <div style={{ ...textStyles.eyebrow, fontSize: 16 }}>AVAILABLE NOW</div>
          <Badge>Campus Copilot for UW</Badge>
          <div style={{ display: "grid", gap: 14 }}>
            {sitePills.map((pill, index) => (
              <div
                key={pill}
                style={{
                  ...panelStyle,
                  background: "#FFFFFF",
                  padding: "16px 18px",
                  transform: entrance(frame, 18 + index * 4).transform,
                  opacity: entrance(frame, 18 + index * 4).opacity,
                }}
              >
                <div style={{ ...textStyles.cardTitle, fontSize: 26 }}>{pill}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SidepanelScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={sceneShell}>
      <div
        style={{
          position: "absolute",
          inset: 56,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div style={{ ...textStyles.eyebrow, ...entrance(frame, 0) }}>
          EXTENSION SURFACE
        </div>
        <div style={{ ...entrance(frame, 6) }}>
          <ScreenshotPanel
            shot={sidepanelShot}
            label="Campus Copilot for UW"
            title="The student workspace stays visible."
            body="The extension is the fastest way into the product today. It keeps the student workspace visible, puts Export and Trust Center in plain sight, and avoids turning the first fold into a builder dashboard."
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const WebWorkbenchScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={sceneShell}>
      <div
        style={{
          position: "absolute",
          inset: 56,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div style={{ ...textStyles.eyebrow, ...entrance(frame, 0) }}>
          WEB WORKBENCH
        </div>
        <div style={{ ...entrance(frame, 6) }}>
          <ScreenshotPanel
            shot={webWorkbenchShot}
            label="OpenCampus workbench"
            title="The same workspace, with more room."
            body="The local web workbench keeps the same product contract while making the broader decision workspace easier to scan. It is still read-only, still local-first, and still built around what changed and what comes first."
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={sceneShell}>
      <div
        style={{
          position: "absolute",
          inset: 64,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ ...textStyles.eyebrow, ...entrance(frame, 0) }}>
            WHAT THE PRODUCT HELPS WITH
          </div>
          <div style={{ ...textStyles.headline, fontSize: 64, marginTop: 18, ...entrance(frame, 4) }}>
            Decide first.
            <br />
            Export second.
            <br />
            Ask last.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 18,
            alignItems: "stretch",
            marginTop: 32,
          }}
        >
          <div style={{ ...entrance(frame, 8) }}>
            <FeatureCard
              label="DECIDE"
              title="What changed and what matters first"
              body="Focus Queue, Weekly Load, and Change Journal keep the first question practical."
            />
          </div>
          <div style={{ ...entrance(frame, 12) }}>
            <FeatureCard
              label="EXPORT"
              title="Structured receipts stay intact"
              body="Markdown, CSV, JSON, and ICS flows follow the same normalized workspace state."
            />
          </div>
          <div style={{ ...entrance(frame, 16) }}>
            <FeatureCard
              label="ASK"
              title="AI explains the same evidence"
              body="Cited AI comes after structure, instead of becoming a second source of truth."
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={sceneShell}>
      <div
        style={{
          position: "absolute",
          inset: 70,
          ...panelStyle,
          background:
            "linear-gradient(135deg, rgba(20,52,91,1) 0%, rgba(20,52,91,0.92) 48%, rgba(54,85,123,1) 100%)",
          color: "#F5FAFF",
          padding: "54px 60px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -90,
            top: -90,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "rgba(221,238,255,0.12)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -40,
            bottom: -130,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: "rgba(221,238,255,0.10)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ ...textStyles.eyebrow, color: "#CFE2FB", ...entrance(frame, 0) }}>
            OPENCAMPUS
          </div>
          <div
            style={{
              fontSize: 72,
              lineHeight: 1.03,
              fontWeight: 700,
              letterSpacing: -2.4,
              marginTop: 18,
              ...entrance(frame, 6),
            }}
          >
            OpenCampus is the
            <br />
            public story.
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.4,
              color: "#DDEBFC",
              fontWeight: 500,
              maxWidth: 860,
              marginTop: 22,
              ...entrance(frame, 12),
            }}
          >
            Campus Copilot is the first workspace people can try today:
            local-first, read-only, and grounded in one student decision desk.
          </div>
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ ...entrance(frame, 18) }}>
            <Badge>Browser extension</Badge>
          </div>
          <div style={{ ...entrance(frame, 22) }}>
            <Badge>Local web workbench</Badge>
          </div>
          <div style={{ ...entrance(frame, 26) }}>
            <Badge>Structured export</Badge>
          </div>
          <div style={{ ...entrance(frame, 30) }}>
            <Badge>Cited AI after structure</Badge>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const OpenCampusWalkthrough: React.FC = () => {
  return (
    <AbsoluteFill style={sceneShell}>
      <Sequence durationInFrames={150}>
        <OpeningScene />
      </Sequence>
      <Sequence from={150} durationInFrames={170}>
        <SidepanelScene />
      </Sequence>
      <Sequence from={320} durationInFrames={170}>
        <WebWorkbenchScene />
      </Sequence>
      <Sequence from={490} durationInFrames={130}>
        <ProofScene />
      </Sequence>
      <Sequence from={620} durationInFrames={100}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
