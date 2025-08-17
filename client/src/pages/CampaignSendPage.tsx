import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config";
import { useUser } from "../context/UserContext";
import type { ContactGroup } from "../../../shared/types/contactGroup";
import type { Official } from "../../../shared/types/official";
import { generateMessageVariations } from "../utils/generateMessageVariations";

const toKey = (id: any) => (typeof id === "string" ? id : id?.toString?.() ?? String(id));

function toMailto(subject: string, body: string, emails: string[]) {
  const to = encodeURIComponent(emails.join(","));
  const su = encodeURIComponent(subject);
  const bo = encodeURIComponent(body);
  return `mailto:${to}?subject=${su}&body=${bo}`;
}
function gmailCompose(subject: string, body: string, emails: string[]) {
  const to = encodeURIComponent(emails.join(","));
  const su = encodeURIComponent(subject);
  const bo = encodeURIComponent(body);
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${bo}`;
}

type Props = { id: string; canSwitchToCompose?: boolean };

export default function CampaignSendPage({ id, canSwitchToCompose }: Props) {
  const { user, loading } = useUser();

  const [campaign, setCampaign] = useState<ContactGroup | null>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // selection
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // simple personalization
  const [personalNote, setPersonalNote] = useState("");
  const [orgName, setOrgName] = useState("");

  // generated
  const [generated, setGenerated] = useState<Array<{ subject?: string; body: string }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/contact-groups/${id}`, { credentials: "include" });
        const data = await res.json();
        setCampaign(data);
        // preselect all
        const map: Record<string, boolean> = {};
        (data.officials || []).forEach((o: Official) => { map[toKey(o._id)] = true; });
        setSelected(map);
        setOrgName(data.partner || "");
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
  const selectedCount = officialsSelected.length;

  const subjectTmpl = campaign?.messageSubject || "Constituent outreach re: {{ISSUE}}";
  const bodyTmpl =
    (campaign?.messageTemplate || "").trim() ||
    `I’m a constituent in {{SENDER_CITY}} writing about {{ISSUE}}.

{{PERSONAL_NOTE}}

Thank you for your public service.`;

  const generate = () => {
    if (!campaign || !user || !selectedCount) return;
    const out = generateMessageVariations({
      subjectTemplate: subjectTmpl,
      template: bodyTmpl,
      user: { name: user.name, email: user.email, city: user.city, zip: user.zip },
      issue: campaign.issues?.[0],
      officials: officialsSelected,
      tone: "respectful",
      length: "medium",
      channel: "email",
      callToAction: campaign.callToAction || undefined,
      deadline: campaign.deadline || undefined,
      orgName: orgName || undefined,
      personalImpact: personalNote || undefined
    });
    setGenerated(out);
    setStep(3);
  };

  if (loading || loadingCampaign) return <p className="text-center text-gray-600 py-10">Loading campaign…</p>;
  if (!campaign) return <p className="text-center text-red-500 py-10">Campaign not found.</p>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">{campaign.title}</h1>
          {campaign.description && <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>}
        </div>
        {canSwitchToCompose && (
          <a className="text-xs px-2 py-1 rounded border hover:bg-gray-50" href={`?mode=edit`}>
            Partner tools
          </a>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <span className={`px-2 py-1 rounded ${step===1?"bg-brand text-white":"bg-gray-200"}`}>1. Recipients</span>
        <span>→</span>
        <span className={`px-2 py-1 rounded ${step===2?"bg-brand text-white":"bg-gray-200"}`}>2. Personalize</span>
        <span>→</span>
        <span className={`px-2 py-1 rounded ${step===3?"bg-brand text-white":"bg-gray-200"}`}>3. Preview</span>
      </div>

      {step === 1 && (
        <div className="bg-white border rounded p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Choose recipients</h2>
            <div className="text-sm text-gray-600">{selectedCount} selected</div>
          </div>
          <div className="grid gap-2">
            {(campaign.officials || []).map((o) => {
              const k = toKey(o._id);
              return (
                <label key={k} className="flex items-center gap-3 bg-white p-3 rounded border">
                  <input
                    type="checkbox"
                    checked={!!selected[k]}
                    onChange={() => setSelected(prev => ({ ...prev, [k]: !prev[k] }))}
                  />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{o.fullName}</div>
                    <div className="text-xs text-gray-600 truncate">
                      {o.role} • {o.state.toUpperCase()} {o.jurisdiction?.city ? `• ${o.jurisdiction.city}` : ""}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">{selectedCount} selected</div>
            <button
              className="px-4 py-2 bg-brand text-white rounded disabled:opacity-50"
              disabled={!selectedCount}
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white border rounded p-4 mb-4">
          <h2 className="font-semibold mb-2">Personalize (optional)</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <textarea
              className="w-full border rounded px-3 py-2"
              rows={4}
              placeholder="Add a short personal note (why this matters locally, 1–2 sentences)"
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
            />
            <div>
              <label className="block text-xs text-gray-600 mb-1">Organization (optional)</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Neighbors for Housing"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
              <div className="mt-2 text-xs text-gray-500">
                Your name & city come from your profile. The partner template handles tone/length.
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button className="px-3 py-1.5 border rounded" onClick={() => setStep(1)}>Back</button>
            <button
              className="px-4 py-2 bg-brand text-white rounded disabled:opacity-50"
              disabled={!selectedCount}
              onClick={generate}
            >
              Generate messages
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white border rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Preview & send</h2>
            <button className="px-3 py-1.5 border rounded" onClick={() => setStep(2)}>Back</button>
          </div>

          <div className="space-y-4">
            {generated.map((v, i) => {
              const o = officialsSelected[i]; // one-to-one mapping
              const subject = v.subject || "Constituent outreach";
              const email = o?.email;
              return (
                <div key={o?._id || i} className="bg-white border rounded p-4">
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">{o?.fullName}</span> · {o?.role} · {email || "no email"}
                  </div>
                  <div className="mb-2">
                    <div className="text-xs text-gray-500 mb-1">Subject</div>
                    <div className="px-2 py-1 border rounded bg-gray-50">{subject}</div>
                  </div>
                  <pre className="text-sm whitespace-pre-wrap">{v.body}</pre>
                  <div className="mt-3 flex gap-2">
                    {email ? (
                      <>
                        <a
                          className="px-3 py-1.5 bg-blue-600 text-white rounded"
                          href={gmailCompose(subject, v.body, [email])}
                          target="_blank" rel="noreferrer"
                        >
                          Open in Gmail
                        </a>
                        <a
                          className="px-3 py-1.5 border rounded"
                          href={toMailto(subject, v.body, [email])}
                        >
                          Mail app
                        </a>
                      </>
                    ) : (
                      <span className="text-xs text-red-600">No email on file</span>
                    )}
                    <button
                      className="px-3 py-1.5 border rounded"
                      onClick={() => navigator.clipboard.writeText(`Subject: ${subject}\n\n${v.body}`)}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
