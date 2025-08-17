// Wrapper that routes to Send (public) or Compose (partners/admins)
// URL options:
//  - /campaigns/:id           -> public sees Send, partners see Compose
//  - /campaigns/:id?mode=send -> force Send
//  - /campaigns/:id?mode=edit -> force Compose

import { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useUser } from "../context/UserContext";
import CampaignSendPage from "./CampaignSendPage";
import CampaignComposePage from "./CampaignComposePage";

export default function ContactCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { isPartner, isAdmin } = useUser();
  const { search } = useLocation();

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const mode = params.get("mode"); // 'send' | 'edit' | null

  const canCompose = isPartner || isAdmin;
  const showCompose = mode === "edit" ? true : mode === "send" ? false : canCompose;

  if (!id) return <div className="p-8 text-center text-red-500">Missing campaign id</div>;

  return showCompose
    ? <CampaignComposePage id={id} />
    : <CampaignSendPage id={id} canSwitchToCompose={canCompose} />;
}
