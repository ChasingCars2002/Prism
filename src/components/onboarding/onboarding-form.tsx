"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrganizationAction, type OnboardingResult } from "@/lib/actions/orgs";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating workspace…" : "Create workspace"}
    </Button>
  );
}

export function OnboardingForm() {
  const [state, formAction] = useFormState<OnboardingResult, FormData>(
    createOrganizationAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="org_name">Workspace name</Label>
        <Input
          id="org_name"
          name="org_name"
          required
          autoFocus
          placeholder="Acme Inc."
        />
        <p className="text-xs text-muted-foreground">
          Usually your company or organization name.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="department_name">First department</Label>
        <Input
          id="department_name"
          name="department_name"
          defaultValue="Engineering"
          placeholder="Engineering"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="team_name">First team</Label>
        <Input
          id="team_name"
          name="team_name"
          defaultValue="Core"
          placeholder="Core"
        />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Submit />
    </form>
  );
}
