import { UploadSkill } from "@/components/upload-skill";

export const metadata = {
  title: "Upload a Skill — Superside Skills Directory",
};

export default function UploadPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Upload a Skill</h1>
        <p className="max-w-[600px] text-sm leading-normal text-muted-foreground">
          Built a skill in Claude? Drop the export here to submit it to the directory. It goes to an
          admin for review — you don&apos;t need to categorize it or touch any code.
        </p>
      </header>
      <UploadSkill />
    </div>
  );
}
