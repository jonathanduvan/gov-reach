import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config";
import { useUser } from "../context/UserContext";
import type { ContactGroup } from "../../../shared/types/contactGroup";
import type { Official } from "../../../shared/types/official";
import TemplatePicker from "../components/TemplatePicker";
import { createTemplate, MessageTemplate } from "../services/templates";
import { generateMessageVariations } from "../utils/generateMessageVariations";

const toKey = (id: any) => (typeof id === "string" ? id : id?.toString?.() ?? String(id));

type Props = { id: string };

export default function CampaignComposePage({ id }: Props) {
  const { user, loading, isPartner, isAdmin } = useUser();

  const [campaign, setCampaign] = useState<ContactGroup | null>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);

  // steps: 1 Template, 2 Advanced (optional), 3 Preview
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // template & core fields
  const [tmpl, setTmpl] = useState<MessageTemplate | null>(null);
  const [subjectTemplate, setSubjectTemplate] = useState<string>("");
  const [bodyTemplate, setBodyTemplate] = useState<string>("");

  // campaign details (kept visible)
  const [callToAction, setCTA] = useState("");
  const [deadline, setDeadline] = useState("");
  const [orgName, setOrgName] = useState("");

  // Advanced (collapsed by default)
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [channel, setChannel] = useState<"email" | "call">("email");
  const [tone, setTone] = useState<"respectful" | "direct" | "urgent" | "neutral">("respectful");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [personalImpact, setPersonalImpact] = useState("");

  const [variations, setVariations] = useState<Array<{ subject?: string; body: string }>>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/contact-groups/${id}`, { credentials: "include" });
        const data = await res.json();
        setCampaign(data);

        const map: Record<string, boolean> = {};
        (data.officials || []).forEach((o: Official) => { map[toKey(o._id)] = true; });
        setSelected(map);

        const initial: MessageTemplate = data.messageTemplate
          ? { name: "Imported", body: data.messageTemplate, subject: data.messageSubject, channel: "email" }
          : { name: "Blank", body: "", subject: "" };

        setTmpl(initial);
        setChannel(initial.channel || "email");
        setBodyTemplate(initial.body || "");
        setSubjectTemplate(initial.subject || "");
        setTone(initial.tone || "respectful");
        setLength(initial.length || "medium");
        setCTA(initial.callToAction || data.callToAction || "");
        setDeadline(initial.defaultDeadline || data.deadline || "");
        setOrgName(initial.orgName || data.partner || "");
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCampaign(false);
      }
    })();
  }, [id]);

  const officialsSelected = useMemo(
    () => (campaign?.officials || []).filter(o => selected[toKey(o._id)]),
    [campaign, selected]
  );

  const onPickTemplate = (t: MessageTemplate) => {
    setTmpl(t);
    setChannel(t.channel || "email");
    setSubjectTemplate(t.subject || "");
    setBodyTemplate(t.body || "");
    setTone(t.tone || "respectful");
    setLength(t.length || "medium");
    setCTA(t.callToAction || callToAction);
    setDeadline(t.defaultDeadline || deadline);
    setOrgName(t.orgName || orgName);
  };

  const generatePreview = () => {
    if (!campaign || !user) return;
    const out = generateMessageVariations({
      subjectTemplate: (channel === "email" ? subjectTemplate : undefined) || "Constituent outreach re: {{ISSUE}}",
      template: bodyTemplate,
      user: { name: user.name, email: user.email, city: user.city, zip: user.zip },
      issue: campaign.issues?.[0],
      officials: officialsSelected,
      tone, length, channel,
      callToAction: callToAction || undefined,
      deadline: deadline || undefined,
      personalImpact: personalImpact || undefined,
      orgName: orgName || undefined
    });
    setVariations(out);
    setStep(3);
  };

  const saveAsTemplate = async () => {
    try {
      const payload: MessageTemplate = {
        name: tmpl?.name ? `${tmpl.name} (custom)` : "Custom Template",
        description: `Saved from campaign ${campaign?.title || ""}`,
        category: campaign?.issues?.[0] || "General",
        channel, subject: subjectTemplate, body: bodyTemplate,
        tone, length, callToAction, defaultDeadline: deadline, orgName
      };
      await createTemplate(payload);
      alert("Template saved!");
    } catch (e: any) {
      alert(e?.message || "Failed to save template");
    }
  };

  if (loading || loadingCampaign) return <p className="text-center text-gray-600 py-10">Loading…</p>;
  if (!(isPartner || isAdmin)) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Partner tools</h2>
        <p className="text-gray-600">
          You don’t have access to the composer. Ask an admin to grant partner access, or{" "}
          <a className="underline" href={`?mode=send`}>try the sender view</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">{campaign?.title}</h1>
          {campaign?.description && <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>}
        </div>
        <a className="text-xs px-2 py-1 rounded border hover:bg-gray-50" href={`?mode=send`}>
          View sender page
        </a>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <span className={`px-2 py-1 rounded ${step===1?"bg-brand text-white":"bg-gray-200"}`}>1. Template</span>
        <span>→</span>
        <span className={`px-2 py-1 rounded ${step===2?"bg-brand text-white":"bg-gray-200"}`}>2. Advanced</span>
        <span>→</span>
        <span className={`px-2 py-1 rounded ${step===3?"bg-brand text-white":"bg-gray-200"}`}>3. Preview</span>
      </div>

      {step <= 2 && (
        <div className="grid md:grid-cols-3 gap-4">
          {/* Left: template core */}
          <div className="md:col-span-2 bg-white p-4 rounded border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Template</h2>
              <div className="flex gap-2">
                <button className="px-2 py-1 text-sm border rounded" onClick={() => setPickerOpen(true)}>Choose</button>
                <button className="px-2 py-1 text-sm border rounded" onClick={saveAsTemplate}>Save as template</button>
              </div>
            </div>

            {channel === "email" && (
              <input
                className="w-full border rounded px-3 py-2 mb-2"
                placeholder="Subject (supports {{MERGE_TAGS}})"
                value={subjectTemplate}
                onChange={(e) => setSubjectTemplate(e.target.value)}
              />
            )}

            <textarea
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              rows={12}
              placeholder="Body supports merge tags like {{ISSUE}} {{OFFICIAL_NAME}} {{OFFICIAL_TITLE}} {{OFFICIAL_CITY}} {{STATE}} {{SENDER_NAME}} {{SENDER_CITY}} {{CALL_TO_ACTION}} {{DEADLINE}} {{ORG_NAME}} {{PERSONAL_NOTE}}"
              value={bodyTemplate}
              onChange={(e) => setBodyTemplate(e.target.value)}
            />

            {/* Campaign details (kept visible) */}
            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Call to action</label>
                <input className="w-full border rounded px-2 py-1" placeholder="co-sponsor AB123" value={callToAction} onChange={(e)=>setCTA(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deadline</label>
                <input className="w-full border rounded px-2 py-1" placeholder="by June 12" value={deadline} onChange={(e)=>setDeadline(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Org name</label>
                <input className="w-full border rounded px-2 py-1" placeholder="Neighbors for Housing" value={orgName} onChange={(e)=>setOrgName(e.target.value)} />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button className="px-3 py-1.5 border rounded" onClick={() => setAdvancedOpen(v => !v)}>
                {advancedOpen ? "Hide" : "Show"} advanced
              </button>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 border rounded" onClick={() => setStep(1)}>Template</button>
                <button className="px-3 py-1.5 border rounded" onClick={() => setStep(2)}>Advanced</button>
                <button className="px-3 py-1.5 bg-brand text-white rounded" onClick={generatePreview}>Preview</button>
              </div>
            </div>
          </div>

          {/* Right: Advanced (collapsed) */}
          <aside className="bg-white p-4 rounded border space-y-3">
            <div className="text-sm font-semibold mb-2">Advanced options</div>
            {!advancedOpen && <div className="text-xs text-gray-500">Collapsed. Click “Show advanced”.</div>}
            {advancedOpen && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Channel</label>
                  <select className="w-full border rounded px-2 py-1" value={channel} onChange={(e)=>setChannel(e.target.value as any)}>
                    <option value="email">Email</option>
                    <option value="call">Call script</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tone</label>
                  <select className="w-full border rounded px-2 py-1" value={tone} onChange={(e)=>setTone(e.target.value as any)}>
                    <option>respectful</option><option>direct</option><option>urgent</option><option>neutral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Length</label>
                  <select className="w-full border rounded px-2 py-1" value={length} onChange={(e)=>setLength(e.target.value as any)}>
                    <option>short</option><option>medium</option><option>long</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Personal impact (seed)</label>
                  <textarea className="w-full border rounded px-2 py-1" rows={3} placeholder="1–2 sentences on local impact" value={personalImpact} onChange={(e)=>setPersonalImpact(e.target.value)} />
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {step === 3 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Preview ({variations.length})</h2>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 border rounded" onClick={() => setStep(2)}>Back</button>
              <button className="px-3 py-1.5 border rounded" onClick={saveAsTemplate}>Save as template</button>
            </div>
          </div>
          <div className="space-y-4">
            {variations.map((v, i) => {
              const o = officialsSelected[i];
              return (
                <div key={o?._id || i} className="bg-white border rounded p-4">
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">{o?.fullName}</span> · {o?.role} · {o?.email || "no email"}
                  </div>
                  {channel === "email" && v.subject && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-500 mb-1">Subject</div>
                      <div className="px-2 py-1 border rounded bg-gray-50">{v.subject}</div>
                    </div>
                  )}
                  <pre className="text-sm whitespace-pre-wrap">{v.body}</pre>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <TemplatePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={onPickTemplate}
      />
    </div>
  );
}
