import { formatAlertTime, officeName, type NwsAlert } from "@/lib/nws";

/** "Winter Storm Warning until Thu 7pm." Plain text, no box. `where` names the mountains it covers. */
export default function AlertLine({ alert, office, where }: { alert: NwsAlert; office?: string; where?: string }) {
  return (
    <>
      <span className="font-semibold">{alert.event}</span>
      {where && ` for ${where}`}
      {alert.until && ` until ${formatAlertTime(alert.until)}`}.
      {office && <span className="text-ink-muted"> NWS {officeName(office)}.</span>}
    </>
  );
}
