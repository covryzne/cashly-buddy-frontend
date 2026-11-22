"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QuickAddMethods } from "@/components/finance/quick-add-methods";
import { ScanReceiptFlow } from "@/features/scan/scan-receipt-flow";
import { ChatBatchFlow } from "@/features/expenses/chat-batch-flow";
import { VoiceReceiptFlow } from "@/features/expenses/voice-receipt-flow";
import { useExpenseSession } from "@/features/expenses/expense-session";
import { homeFixture } from "@/mocks/fixtures/home";
import { ProfileOverview } from "./profile-overview";
import { InstallGuide } from "./install-app";

export type AppActionPanel = {
  kind: "add" | "scan" | "chat" | "voice" | "profile" | "install";
};
export function isAppAction(
  panel: { kind: string } | null,
): panel is AppActionPanel {
  return (
    !!panel &&
    ["add", "scan", "chat", "voice", "profile", "install"].includes(panel.kind)
  );
}
/** Composes the existing quick-add/profile flows within the owning page's stack. */
export function AppActionDialogs({
  panel,
  push,
  back,
  close,
  canGoBack,
}: {
  panel: AppActionPanel;
  push: (panel: AppActionPanel) => void;
  back: () => void;
  close: () => void;
  canGoBack: boolean;
}) {
  const session = useExpenseSession();
  if (panel.kind === "scan")
    return (
      <ScanReceiptFlow
        onBack={back}
        onClose={close}
      />
    );
  if (panel.kind === "chat")
    return (
      <ChatBatchFlow
        onBack={back}
        onClose={close}
        initialSession={session.chatSession}
        onSuspend={session.setChatSession}
      />
    );
  if (panel.kind === "voice")
    return (
      <VoiceReceiptFlow
        onBack={back}
        onClose={close}
      />
    );
  return (
    <Dialog
      title={
        panel.kind === "add"
          ? "Catat pengeluaran baru"
          : panel.kind === "profile"
            ? "Profil"
            : "Download Cashly"
      }
      onClose={close}
      onBack={canGoBack ? back : undefined}
      variant={panel.kind === "profile" ? "default" : "sheet"}
      className={
        panel.kind === "add"
          ? "quick-add-dialog"
          : panel.kind === "install"
            ? "install-dialog"
            : undefined
      }
      description={
        panel.kind === "add"
          ? "Pilih cara input yang paling praktis untukmu"
          : undefined
      }
      footer={
        panel.kind === "install" && canGoBack ? (
          <Button onClick={back}>Kembali ke Profil</Button>
        ) : undefined
      }
    >
      {panel.kind === "add" && (
        <QuickAddMethods
          onClose={close}
          onChoose={(label) =>
            push({
              kind:
                label === "Scan struk otomatis"
                  ? "scan"
                  : label === "Voice note kilat"
                    ? "voice"
                    : "chat",
            })
          }
        />
      )}
      {panel.kind === "profile" && (
        <ProfileOverview
          name={homeFixture.name}
          onInstall={() => push({ kind: "install" })}
        />
      )}
      {panel.kind === "install" && <InstallGuide />}
    </Dialog>
  );
}
