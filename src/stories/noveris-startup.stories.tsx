import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import {
  AccountRoute,
  LoginRoute,
  NoverisLoadingScreen,
  SaveConflictRoute,
  WelcomeRoute
} from "@/routes/auth/noveris-auth-routes";
import { NoverisAuthProvider } from "@/lib/supabase";

const meta = {
  title: "Noveris/Startup",
  parameters: {
    layout: "fullscreen"
  }
} satisfies Meta;

export default meta;

type Story = StoryObj;

function withAuthRoute(children: ReactNode, route = "/welcome") {
  return (
    <NoverisAuthProvider>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </NoverisAuthProvider>
  );
}

export const Booting: Story = {
  render: () => <NoverisLoadingScreen startup={{ phase: "booting", progress: 8, message: "Initializing" }} />
};

export const LoadingRuntime: Story = {
  render: () => <NoverisLoadingScreen startup={{ phase: "loading_canonical_runtime", progress: 26, message: "Loading civilization data" }} />
};

export const RestoringSession: Story = {
  render: () => <NoverisLoadingScreen startup={{ phase: "restoring_auth_session", progress: 42, message: "Restoring session" }} />
};

export const LoadingLocal: Story = {
  render: () => <NoverisLoadingScreen startup={{ phase: "loading_local_save", progress: 58, message: "Checking local progress" }} />
};

export const LoadingCloud: Story = {
  render: () => <NoverisLoadingScreen startup={{ phase: "loading_cloud_save", progress: 72, message: "Synchronizing cloud save" }} />
};

export const OfflineReady: Story = {
  render: () => <NoverisLoadingScreen startup={{ phase: "offline_ready", progress: 92, message: "Preparing civilization", recoverableError: "Cloud unavailable" }} />
};

export const RecoverableError: Story = {
  render: () => <NoverisLoadingScreen startup={{ phase: "recoverable_error", progress: 48, message: "Account services are unavailable", recoverableError: "Cloud unavailable" }} />
};

export const Welcome: Story = {
  render: () => withAuthRoute(<WelcomeRoute />)
};

export const SignIn: Story = {
  render: () => withAuthRoute(<LoginRoute />, "/login")
};

export const ConflictDivergent: Story = {
  render: () => withAuthRoute(<SaveConflictRoute />, "/save-conflict")
};

export const AccountGuest: Story = {
  render: () => withAuthRoute(<AccountRoute />, "/account")
};
