/**
 * CMP-005: Stepper Component
 *
 * Vertical step indicator for lifecycle progress.
 * Used in Studio left panel to show lifecycle position:
 * Brief → Design → Compare → Evaluate → Approve → Deploy
 */

interface Step {
  id: string;
  label: string;
  description?: string;
  status: "completed" | "active" | "upcoming";
}

interface StepperProps {
  steps: Step[];
  onStepClick?: (stepId: string) => void;
}

export default function Stepper({ steps, onStepClick }: StepperProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <div
            key={step.id}
            style={{ display: "flex", gap: "var(--space-3)", cursor: onStepClick ? "pointer" : "default" }}
            onClick={() => onStepClick?.(step.id)}
          >
            {/* Step indicator line */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 24,
                flexShrink: 0,
              }}
            >
              {/* Circle */}
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  flexShrink: 0,
                  background:
                    step.status === "completed"
                      ? "var(--state-success)"
                      : step.status === "active"
                      ? "var(--brand-primary)"
                      : "var(--bg-subtle)",
                  color:
                    step.status === "upcoming"
                      ? "var(--text-muted)"
                      : "white",
                  border:
                    step.status === "upcoming"
                      ? "2px solid var(--border-default)"
                      : "none",
                }}
              >
                {step.status === "completed" ? "✓" : index + 1}
              </div>
              {/* Connecting line */}
              {!isLast && (
                <div
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 24,
                    background:
                      step.status === "completed"
                        ? "var(--state-success)"
                        : "var(--border-default)",
                  }}
                />
              )}
            </div>

            {/* Step text */}
            <div style={{ paddingBottom: isLast ? 0 : "var(--space-4)" }}>
              <div
                style={{
                  fontWeight: step.status === "active" ? 600 : 400,
                  fontSize: 14,
                  color:
                    step.status === "upcoming"
                      ? "var(--text-muted)"
                      : "var(--text-primary)",
                  lineHeight: "24px",
                }}
              >
                {step.label}
              </div>
              {step.description && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginTop: 2,
                  }}
                >
                  {step.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
