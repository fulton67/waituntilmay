import React from "react";
import { Img, OffthreadVideo, staticFile } from "remotion";
import { EndCard, SectionCard, WordmarkDepthSandwich } from "./Cards";
import { LabPresenter } from "./Exo6Lab";
import { PhoneMessage } from "./PhoneMessage";
import { CalendarDateCircle, calendarSlotCenter } from "./CalendarDateCircle";
import { IntakeFormFill } from "./IntakeFormFill";
import { QuoteCardCarousel } from "./QuoteCardCarousel";
import { ChecklistLedger } from "./ChecklistLedger";
import { SpatialGlassUI } from "./SpatialGlassUI";
import { ProductPlateReveal } from "./ProductPlateReveal";
import { Arrow } from "../devices/Arrow";
import { FieldThroughSkull } from "./FieldThroughSkull";
import { RewireTrace } from "./RewireTrace";
import { PulseTrainSynapse } from "./PulseTrainSynapse";
import { SessionTimeline } from "./SessionTimeline";
import { RegionLightOnModel } from "./RegionLightOnModel";
import { TopicGlassPanel } from "./TopicGlassPanel";
import { NoiseClears } from "./NoiseClears";
import { PortraitPipCircle } from "./PortraitPipCircle";
import { TimelineMarkers } from "./TimelineMarkers";
import { MovingImg } from "./parts";
import { FlowDiagramBuild } from "./FlowDiagramBuild";
import { CardFullMorph } from "./CardFullMorph";
import { WindowedFootage } from "./WindowedFootage";
import { DonutRingFill } from "./DonutRingFill";
import { TypeNameDecode } from "./TypeNameDecode";
import { SplitLabelled } from "./SplitLabelled";
import { ZoomBoxInset } from "./ZoomBoxInset";
import { C } from "./look";
import { src } from "./parts";
import { IconCalendar, IconChat, IconClipboard, IconGift, IconMail, IconPhone } from "./icons";

// Lab registry: id -> device id, length (f), proof-still frame, render. Frames are LOCAL: beat start_f (beats.json) = 0, so event
// frames below are beats.json event f minus the beat's start_f.
export type LabItem = { device: string; beat?: string; dur: number; still: number; clip?: boolean; bare?: boolean; render: () => React.ReactNode };

const keyed = <OffthreadVideo src={staticFile("exomind-skin/yt/presenter_k.webm")} muted transparent style={{ width: "100%" }} />;
const thumb = (node: React.ReactNode) => <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: C.blue }}>{node}</div>;

export const LAB: Record<string, LabItem> = {
  "section-card": { device: "chapter-title-card", dur: 36, still: 9, render: () => (<><LabPresenter /><SectionCard num="01" title="Your questions" start={2} /></>) },
  "title-wordmark": { device: "wordmark-depth-sandwich", beat: "B01", dur: 105, still: 60, render: () => (
    <WordmarkDepthSandwich word="EXOMIND" subline="Total skin health · an evening with Dr. Ariel Ostad" start={3} exitAt={98} end={105} baselineY={600}>
      <LabPresenter />
    </WordmarkDepthSandwich>) },
  "end-card": { device: "end-card", dur: 74, still: 50, render: () => (<><LabPresenter /><EndCard lines={["Book a consultation.", "Dr. Ariel Ostad", "Link in the description."]} start={0} end={74} /></>) },

  // B02 f106-159
  "product-plate": { device: "product-plate-reveal", beat: "B02", dur: 54, still: 46, render: () => (<><LabPresenter />
    <ProductPlateReveal file="exomind-skin/btl/unit_cut.png" box={[1080, 150, 700, 620]} imgStyle={{ transform: "scale(1.5)" }} plateAt={0} imageAt={19} name="Exomind" nameAt={19}
      chip="FDA-cleared: major depressive disorder ⚠" chipAt={44} pointer={{ from: { x: 1180, y: 742 }, to: { x: 1452, y: 566 }, at: 37, end: 53 }} exitAt={60} end={54} /></>) },
  // B05 f414-545
  "spatial-glass": { device: "spatial-glass-ui", beat: "B05", dur: 131, still: 106, render: () => (<><LabPresenter />
    <SpatialGlassUI lightAt={102} exitAt={124} panels={[
      { at: 25, depth: 0.6, x: 1240, y: 130, w: 620, icon: <IconGift size={28} color="#fff" />, title: "Giveaway winners", sub: "Announced after tonight", from: "fade" },
      { at: 46, depth: 1, x: 860, y: 380, w: 700, icon: <IconMail size={28} color="#fff" />, title: "Email · from our team", body: "Congratulations! You're one of tonight's winners." },
      { at: 59, depth: 1, x: 1160, y: 640, w: 600, icon: <IconPhone size={28} color="#fff" />, title: "Incoming call", sub: "Dr. Ostad's office", ring: true },
    ]} /></>) },
  // B06 f546-666
  "phone-message": { device: "phone-message-arrives", beat: "B06", dur: 120, still: 96, render: () => (<><LabPresenter />
    <PhoneMessage start={1} plateAt={36} senderAt={42} lineAt={[47, 52]} sender="Dr. Ostad's office" lines={["Thanks for joining us tonight.", "Reply to schedule a consultation."]}
      mark="schedule a consultation" markAt={91} statusAt={102} endAt={120} /></>) },
  // B07 f667-750: the same phone, split with the calendar, the arc connector from the reply to the slot
  "calendar-circle": { device: "calendar-date-circle", beat: "B07", dur: 84, still: 72, render: () => {
    const cx = 1300, cy = 220, slot = { day: 3, row: 1 };
    const tgt = calendarSlotCenter(cx, cy, slot);
    return (<><LabPresenter />
      <PhoneMessage start={-120} plateAt={-84} senderAt={-80} lineAt={[-76, -72]} sender="Dr. Ostad's office" lines={["Thanks for joining us tonight.", "Reply to schedule a consultation."]}
        x={1180} move={{ at: 0, dx: -340 }} reply={{ text: "Yes, I'd like to book", at: 6, sendAt: 21 }} endAt={84} exitAt={77} />
      <CalendarDateCircle start={29} circleAt={66} slot={slot} x={cx} y={cy} exitAt={77} />
      <Arrow variant="arc-connector" from={{ x: 1180 - 340 + 380, y: 600 }} to={{ x: tgt.x - 40, y: tgt.y + 30 }} start={29} end={84} color={C.blue}
        label={<div style={{ color: C.blue }}><IconChat size={26} color={C.blue} /></div>} />
    </>);
  } },
  // B08 f751-892
  "intake-form": { device: "intake-form-fill", beat: "B08", dur: 141, still: 112, render: () => (<><LabPresenter />
    <IntakeFormFill start={1} end={141} exitAt={134} note="⚠ Certain medical conditions, implanted devices, or other circumstances may make TMS inappropriate." fields={[
      { kind: "write", label: "Your goals", value: "Calmer mind, better sleep, healthier skin", at: 49 },
      { kind: "check", label: "Medical history", markAt: 55, rows: [{ text: "Current medications", at: 78 }, { text: "Implanted devices", at: 82 }, { text: "Medical conditions", at: 86 }] },
      { kind: "answer", label: "Is Exomind appropriate for you?", value: "Decided with Dr. Ostad", litAt: 93, circleAt: 108 },
    ]} /></>) },
  // B09 f893-996
  "qa-carousel": { device: "quote-card-carousel", beat: "B09", dur: 104, still: 90, render: () => (<><LabPresenter />
    <QuoteCardCarousel start={30} exitAt={97} credit="Questions: the Exomind patient brochure FAQ" cards={[
      { q: "Does it hurt?", at: 40, who: "Maya" }, { q: "Will it disrupt my daily life?", at: 61, who: "Jordan" }, { q: "Is Exomind right for me?", at: 82, mark: "right for me", who: "Sam" },
    ]} /></>) },
  // B10 f997-1080
  "ledger": { device: "checklist-ledger", beat: "B10", dur: 84, still: 60, render: () => (<><LabPresenter />
    <ChecklistLedger start={1} end={84} exitAt={76} title="Tonight" open={{ label: "Your question", at: 25, sweepAt: 52 }} rows={[
      { label: "What Exomind is", at: 1, thumb: <Img src={src("exomind-skin/btl/unit_cut.png")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "60% 50%" }} /> },
      { label: "Messages from our team", at: 3, thumb: thumb(<IconChat size={34} color={C.blue} />) },
      { label: "Your consultation", at: 5, thumb: thumb(<IconClipboard size={34} color={C.blue} />) },
      { label: "Booking a visit", at: 7, thumb: thumb(<IconCalendar size={34} color={C.blue} />) },
    ]} /></>) },

  // ---- ExoMind-only animations (clips + stills)
  // B17 f1710-1810 (section card 04 f1710-1739, then the animation from f1740 = local 30)
  "field-through-skull": { device: "field-through-skull (region-light-on-model + arrow-orbit-arc)", beat: "B17", dur: 100, still: 84, clip: true, bare: true, render: () => <FieldThroughSkull /> },
  // B18 f1811-1849
  "rewire-trace": { device: "rewire-trace (mechanism-on-real-image + arrow-route-trace)", beat: "B18", dur: 39, still: 31, clip: true, bare: true, render: () => <RewireTrace /> },
  // B19 f1850-1986
  "pulse-train-synapse": { device: "pulse-train-synapse (topic-glass-panel + noise-clears)", beat: "B19", dur: 137, still: 116, clip: true, render: () => (<><LabPresenter /><PulseTrainSynapse /></>) },
  // B12 f1180-1241
  "session-timeline": { device: "session-timeline (portrait-pip-circle + timeline-markers + arrow-marker-tick)", beat: "B12", dur: 62, still: 44, clip: true, bare: true,
    render: () => <SessionTimeline presenter={keyed} /> },

  // ---- the reusable parts alone
  "region-light": { device: "region-light-on-model", dur: 30, still: 20, bare: true, render: () => (<>
    <MovingImg file="exomind-skin/flora/head_a.png" from={0} to={30} s0={1} s1={1.02} />
    <RegionLightOnModel at={4} x={1248 * 1920 / 1920 + 0} y={318} rx={190} ry={130} rotate={-18} /></>) },
  "topic-panel": { device: "topic-glass-panel", dur: 40, still: 30, render: () => (<><LabPresenter />
    <TopicGlassPanel start={2} chip="Topic" x={1040} y={260} w={720} h={420}>
      <div style={{ position: "absolute", left: 30, top: 40, fontFamily: "cormorant-garamond", fontSize: 54, color: C.ink }}>One mechanism, one panel</div>
    </TopicGlassPanel></>) },
  "noise-clears": { device: "noise-clears", dur: 60, still: 50, render: () => (<><LabPresenter />
    <div style={{ position: "absolute", left: 1000, top: 480 }}><NoiseClears start={0} calmAt={14} w={760} h={120} amp={30} seed="lab" /></div></>) },
  "pip-circle": { device: "portrait-pip-circle", dur: 30, still: 20, bare: true, render: () => (<>
    <MovingImg file="exomind-skin/clinic/IMG_3713.jpg" from={0} to={30} s0={1} s1={1.04} style={{ filter: "blur(30px)" }} />
    <PortraitPipCircle at={2} x={120} y={560} inner={{ left: 26, top: -168, width: 480 }}>{keyed}</PortraitPipCircle></>) },
  "timeline": { device: "timeline-markers + arrow-marker-tick", dur: 60, still: 50, render: () => (<><LabPresenter />
    <TimelineMarkers lineAt={2} x0={900} x1={1780} y={560} onDark={false} end={70} markers={[{ at: 2, u: 0.04, label: "Arrive" }, { at: 11, u: 0.5, label: "Session" }, { at: 18, u: 0.96, label: "Walk out" }]}
      segment={{ at: 11, u0: 0.04, u1: 0.96, label: "about 20–30 min ⚠" }} /></>) },

  // ---- explainer devices (local frames = beat f - beat start)
  "flow-diagram": { device: "flow-diagram-build + arrow-curved-callout", beat: "B03", dur: 103, still: 84, render: () => (<><LabPresenter /><FlowDiagramBuild /></>) },
  "card-morph": { device: "card-full-morph", beat: "B04", dur: 151, still: 40, render: () => <CardFullMorph surround={<LabPresenter />} /> },
  "card-morph-full": { device: "card-full-morph (full frame)", beat: "B04", dur: 151, still: 90, render: () => <CardFullMorph surround={<LabPresenter />} /> },
  "windowed-footage": { device: "windowed-footage", beat: "B11", dur: 99, still: 84, render: () => (<><LabPresenter /><WindowedFootage /></>) },
  "donut-ring": { device: "donut-ring-fill + type-orbit-labels", beat: "B13", dur: 137, still: 112, render: () => (<><LabPresenter /><DonutRingFill /></>) },
  "name-decode": { device: "type-name-decode", beat: "B14", dur: 70, still: 30, render: () => <TypeNameDecode /> },
  "split": { device: "split-labelled", beat: "B15", dur: 151, still: 100, bare: true, render: () => <SplitLabelled /> },
  "zoom-inset": { device: "zoom-box-inset + arrow-dashed-flow", beat: "B20", dur: 105, still: 86, render: () => (<><LabPresenter /><ZoomBoxInset /></>) },
};
