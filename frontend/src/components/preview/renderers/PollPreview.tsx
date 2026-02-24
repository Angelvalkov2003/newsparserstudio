import type { PollComponent } from "../../../types";

interface PollPreviewProps {
  component: PollComponent;
}

export function PollPreview({ component }: PollPreviewProps) {
  const question = component.question ?? "";
  const choices = component.choices ?? [];
  const name = component.poll_name ?? "Poll";
  return (
    <div className="preview-poll-block">
      <p className="preview-poll-name">{name}</p>
      <p className="preview-poll-question">{question}</p>
      <ul className="preview-poll-choices">
        {choices.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
    </div>
  );
}
