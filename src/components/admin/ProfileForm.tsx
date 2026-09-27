"use client";
/* eslint-disable @next/next/no-img-element -- live preview of uploaded images */

import { useState } from "react";
import { saveProfile } from "@/lib/actions/admin";
import { BRAND_COLORS } from "@/lib/constants";
import { initials } from "@/lib/format";
import { FieldError, FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { College } from "@/lib/types";
import { FileUpload } from "./FileUpload";
import { useFormAction } from "@/lib/use-form-action";

const SOCIAL_LABELS = { facebook: "Facebook", instagram: "Instagram", x: "X (Twitter)", linkedin: "LinkedIn", youtube: "YouTube" } as const;

const SECTION_LABELS: [keyof College["homepage_sections"], string][] = [
  ["urgent", "Urgent announcements"],
  ["important", "Important notices"],
  ["announcements", "Latest announcements"],
  ["events", "Upcoming events"],
  ["departments", "Departments"],
  ["about", "About the college"],
  ["contact", "Contact details"],
];

export function ProfileForm({ slug, college, portalHost }: { slug: string; college: College; portalHost: string }) {
  const [state, formProps, pending] = useFormAction(saveProfile);
  const [preview, setPreview] = useState({
    name: college.name,
    short: college.short_name ?? "",
    heading: college.welcome_heading ?? `Welcome to ${college.name}`,
    text: college.welcome_text ?? "",
    color: college.brand_color,
  });
  const [logo, setLogo] = useState(college.logo_url);
  const [cover, setCover] = useState(college.cover_image_url);
  const set = (k: keyof typeof preview) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setPreview({ ...preview, [k]: e.target.value });

  return (
    <form
      {...formProps}
      className="grid gap-8 xl:grid-cols-[1fr_380px]"
      noValidate
    >
      <input type="hidden" name="college" value={slug} />
      <div className="space-y-6">
        <FormMessage state={state} />
        <Section title="Identity">
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <label className="block">
              <span className="field-label">College name</span>
              <input name="name" className="input" defaultValue={college.name} onChange={set("name")} maxLength={200} />
              <FieldError state={state} name="name" />
            </label>
            <label className="block">
              <span className="field-label">Short name</span>
              <input name="short_name" className="input" defaultValue={college.short_name ?? ""} onChange={set("short")} maxLength={20} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FileUpload collegeId={college.id} kind="logo" name="logo_url" label="Logo" hint="Square PNG or SVG works best." defaultUrl={college.logo_url} onChange={setLogo} />
            <FileUpload collegeId={college.id} kind="cover" name="cover_image_url" label="Cover photo" hint="Landscape, at least 1600 px wide." defaultUrl={college.cover_image_url} onChange={setCover} />
          </div>
          <fieldset>
            <legend className="field-label">Portal colour</legend>
            <div className="flex flex-wrap gap-2">
              {BRAND_COLORS.map((c) => (
                <label key={c.value} className="cursor-pointer">
                  <input type="radio" name="brand_color" value={c.value} defaultChecked={college.brand_color === c.value} onChange={() => setPreview({ ...preview, color: c.value })} className="peer sr-only" />
                  <span className="flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-[0.875rem] font-bold peer-checked:border-ink peer-checked:ring-1 peer-checked:ring-ink peer-focus-visible:outline-2 peer-focus-visible:outline-brand">
                    <span className="size-4 rounded-sm" style={{ background: c.value }} aria-hidden="true" />
                    {c.label}
                  </span>
                </label>
              ))}
            </div>
            <span className="field-hint">All colours keep white text readable.</span>
          </fieldset>
        </Section>

        <Section title="Home page">
          <label className="block">
            <span className="field-label">Welcome heading</span>
            <input name="welcome_heading" className="input" defaultValue={college.welcome_heading ?? ""} onChange={set("heading")} maxLength={120} />
          </label>
          <label className="block">
            <span className="field-label">Welcome text</span>
            <textarea name="welcome_text" className="input min-h-24" defaultValue={college.welcome_text ?? ""} onChange={set("text")} maxLength={600} />
          </label>
          <fieldset>
            <legend className="field-label">Sections shown on the home page</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SECTION_LABELS.map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 text-[0.9375rem]">
                  <input type="checkbox" name={`section_${k}`} defaultChecked={college.homepage_sections?.[k] ?? true} className="accent-brand" />
                  {l}
                </label>
              ))}
            </div>
          </fieldset>
        </Section>

        <Section title="About">
          <label className="block">
            <span className="field-label">Short description</span>
            <textarea name="description" className="input min-h-20" defaultValue={college.description ?? ""} maxLength={600} />
            <span className="field-hint">Used in search results and link previews.</span>
          </label>
          <label className="block">
            <span className="field-label">About the college</span>
            <textarea name="about" className="input min-h-40" defaultValue={college.about ?? ""} maxLength={8000} />
          </label>
        </Section>

        <Section title="Contact and links">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="field-label">Address</span>
              <input name="address" className="input" defaultValue={college.address ?? ""} maxLength={400} />
            </label>
            <label className="block">
              <span className="field-label">Phone</span>
              <input name="phone" className="input" defaultValue={college.phone ?? ""} maxLength={40} />
            </label>
            <label className="block">
              <span className="field-label">Public email</span>
              <input name="contact_email" type="email" className="input" defaultValue={college.contact_email ?? ""} />
              <FieldError state={state} name="contact_email" />
            </label>
            <div className="sm:col-span-2">
              <span className="field-label">Official website</span>
              <p className="rounded-md bg-sunken px-3 py-2 text-ink-2">{college.official_website}</p>
              <span className="field-hint">Set during verification. Contact support to change it.</span>
            </div>
            {(["facebook", "instagram", "x", "linkedin", "youtube"] as const).map((k) => (
              <label key={k} className="block">
                <span className="field-label">{SOCIAL_LABELS[k]}</span>
                <input name={k} type="url" className="input" defaultValue={college.social_links?.[k] ?? ""} placeholder="https://" />
                <FieldError state={state} name={k} />
              </label>
            ))}
          </div>
        </Section>
        <div className="sticky bottom-0 -mx-4 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:rounded-md sm:border sm:px-4">
          <SubmitButton pending={pending} pendingLabel="Saving">Save and publish changes</SubmitButton>
        </div>
      </div>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <p className="field-label">Preview</p>
        <div className="overflow-hidden rounded-lg border border-line-strong bg-surface">
          <p className="truncate border-b border-line bg-sunken px-3 py-1.5 text-[0.75rem] font-bold text-ink-3">{portalHost}</p>
          <div className="flex items-center gap-2.5 px-3 py-2.5 text-white" style={{ background: preview.color }}>
            {logo ? (
              <img src={logo} alt="" className="size-8 rounded-sm bg-white object-contain p-0.5" />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-sm bg-white/15 text-[0.75rem] font-extrabold">{preview.short && preview.short.length <= 4 ? preview.short.toUpperCase() : initials(preview.name).slice(0, 3)}</span>
            )}
            <span className="truncate text-[0.9375rem] font-extrabold">{preview.name}</span>
          </div>
          <div className="space-y-2 p-4">
            {cover ? <img src={cover} alt="" className="aspect-[16/9] w-full rounded-md object-cover" /> : null}
            <p className="text-[1.25rem] leading-tight font-extrabold">{preview.heading || `Welcome to ${preview.name}`}</p>
            {preview.text ? <p className="text-[0.875rem] text-ink-2">{preview.text}</p> : null}
            <span className="inline-flex rounded-md px-3 py-1.5 text-[0.8125rem] font-bold text-white" style={{ background: preview.color }}>Search</span>
          </div>
        </div>
        <p className="field-hint">Changes go live for students when you save.</p>
      </aside>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel space-y-4 p-5 sm:p-6">
      <h2 className="hd-3">{title}</h2>
      {children}
    </section>
  );
}
