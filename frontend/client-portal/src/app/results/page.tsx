import { UnavailableCareSection } from "@/components/UnavailableCareSection";

export default function ResultsPage() {
  return (
    <UnavailableCareSection
      eyebrow="Records and results"
      title="Test results"
      description="A safe place to understand result availability and choose your next step."
      unavailableTitle="Results are not connected yet"
      unavailableBody="The current patient API does not provide laboratory, imaging, pathology, or clinician-reviewed results. We do not display placeholders because they could be mistaken for complete medical information."
      checklist={[
        "Write down the test name, collection or imaging date, and ordering clinician.",
        "Ask whether the result needs clinician review before it is released to you.",
        "Prepare one clear question you want answered when the result is available.",
      ]}
      steps={[
        {
          title: "Check the verified source",
          icon: "check",
          body: "Use the laboratory, imaging center, or care-team channel you were given. Result timing varies, and some findings need clinician review before release.",
        },
        {
          title: "Prepare your question",
          icon: "message",
          body: "Note the test name, date, ordering clinician, and what you want explained. Do not make medication or treatment changes from an unverified result.",
        },
      ]}
      related={[
        { href: "/records", label: "Records overview" },
        { href: "/documents", label: "Documents" },
        { href: "/chat", label: "Care messages" },
      ]}
    />
  );
}
