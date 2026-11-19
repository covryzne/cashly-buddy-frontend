import { InstallAppEntry } from "./install-app";

export function ProfileOverview({
  name,
  onInstall,
}: {
  name: string;
  onInstall: () => void;
}) {
  return (
    <>
      <div className="install-profile-summary">
        <span className="avatar" aria-hidden="true">
          {name.slice(0, 1)}
        </span>
        <div>
          <h3>{name}</h3>
          <p>Langkah kecilmu bersama Cashly.</p>
        </div>
      </div>
      <InstallAppEntry showStatus onOpen={onInstall} />
    </>
  );
}
