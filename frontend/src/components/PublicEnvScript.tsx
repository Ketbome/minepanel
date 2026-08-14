export function PublicEnvScript() {
  // eslint-disable-next-line @next/next/no-sync-scripts
  return <script src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/public-env`} />;
}
