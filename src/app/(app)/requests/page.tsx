import { RequestBoard } from "@/components/request-board";
import { getRequests } from "@/lib/requests";

export const metadata = {
  title: "Request a Skill — Superside Skills Directory",
};

// Always render fresh so newly-posted requests show up on refresh.
export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const { requests, configured } = await getRequests();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Request a Skill</h1>
        <p className="max-w-[620px] text-sm leading-normal text-muted-foreground">
          Skills the team wishes existed. Upvote the ones you&apos;d use, or add your own — makers
          pick what to build from here.
        </p>
      </header>

      <RequestBoard requests={requests} configured={configured} />
    </div>
  );
}
