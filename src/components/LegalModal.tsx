"use client";

import Modal from "@/components/Modal";
import type { LegalSection } from "@/lib/legalContent";

interface LegalModalProps {
  open: boolean;
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
  onClose: () => void;
}

export default function LegalModal({
  open,
  title,
  lastUpdated,
  intro,
  sections,
  onClose,
}: LegalModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={`Last updated: ${lastUpdated}`}
      size="lg"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-[#2A6558] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#215249]"
        >
          Close
        </button>
      }
    >
      <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
        <p className="text-sm leading-relaxed text-[#7C7671]">{intro}</p>

        {sections.map((section) => (
          <section key={section.heading}>
            <h3 className="mb-2 text-sm font-semibold text-[#1A1817]">{section.heading}</h3>
            <div className="space-y-2">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-[#7C7671]">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}
