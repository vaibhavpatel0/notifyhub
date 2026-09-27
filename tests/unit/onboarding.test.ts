import { describe, expect, it } from "vitest";
import { emailMatchesDomain, normaliseWebsiteUrl, rankOfficialEmails, registrableDomain } from "@/lib/onboarding/domain";
import { acronym, slugCandidates, slugify } from "@/lib/onboarding/slug";
import { isPathAllowed } from "@/lib/onboarding/robots";
import { extractFromHtml, pickFollowUpPages } from "@/lib/onboarding/extract";
import { FetchBlockedError, isPrivateAddress, safeFetch } from "@/lib/onboarding/safe-fetch";

describe("domains and emails", () => {
  it("normalises website input", () => {
    expect(normaliseWebsiteUrl("examplecollege.ac.in")?.toString()).toBe("https://examplecollege.ac.in/");
    expect(normaliseWebsiteUrl("javascript:alert(1)")).toBeNull();
    expect(normaliseWebsiteUrl("http://10.0.0.1")).toBeNull();
    expect(normaliseWebsiteUrl("https://user:pw@site.ac.in")).toBeNull();
    expect(normaliseWebsiteUrl("localhost")).toBeNull();
    expect(normaliseWebsiteUrl("https://vpcollege.vercel.app/about.html")?.toString()).toBe("https://vpcollege.vercel.app/");
    expect(normaliseWebsiteUrl("https://site.ac.in/college/index.php?x=1")?.toString()).toBe("https://site.ac.in/college/");
  });

  it("finds the registrable domain, including Indian academic suffixes", () => {
    expect(registrableDomain("www.examplecollege.ac.in")).toBe("examplecollege.ac.in");
    expect(registrableDomain("cse.examplecollege.edu.in")).toBe("examplecollege.edu.in");
    expect(registrableDomain("https://www.college.edu/about")).toBe("college.edu");
  });

  it("accepts only addresses on the college domain", () => {
    expect(emailMatchesDomain("principal@examplecollege.ac.in", "examplecollege.ac.in")).toBe(true);
    expect(emailMatchesDomain("hod@cse.examplecollege.ac.in", "examplecollege.ac.in")).toBe(true);
    expect(emailMatchesDomain("me@gmail.com", "examplecollege.ac.in")).toBe(false);
    expect(emailMatchesDomain("x@notexamplecollege.ac.in", "examplecollege.ac.in")).toBe(false);
    expect(emailMatchesDomain("x@examplecollege.ac.in.evil.com", "examplecollege.ac.in")).toBe(false);
  });

  it("ranks the likely official mailbox first", () => {
    expect(
      rankOfficialEmails(["student@examplecollege.ac.in", "info@examplecollege.ac.in", "principal@examplecollege.ac.in", "x@gmail.com"], "examplecollege.ac.in"),
    ).toEqual(["principal@examplecollege.ac.in", "info@examplecollege.ac.in", "student@examplecollege.ac.in"]);
  });
});

describe("slugs", () => {
  it("builds acronyms without filler words", () => {
    expect(acronym("Vignan Institute of Technology and Science")).toBe("vits");
    expect(acronym("Chaitanya Bharathi Institute of Technology")).toBe("cbit");
  });

  it("suggests readable, valid, unreserved subdomains", () => {
    const s = slugCandidates("Vignan Institute of Technology and Science", { websiteUrl: "https://www.vignanits.ac.in" });
    expect(s[0]).toBe("vits");
    expect(s).toContain("vignanits");
    expect(s).toContain("vits-college");
    expect(s).toContain("vignan-tech");
    expect(s.every((x) => /^[a-z0-9-]+$/.test(x))).toBe(true);
  });

  it("never suggests reserved names", () => {
    expect(slugCandidates("Admin", {})).not.toContain("admin");
  });

  it("slugifies arbitrary text", () => {
    expect(slugify("  St. Mary's College & Hospital ")).toBe("st-mary-s-college-and-hospital");
    expect(slugify("Écoles Normales")).toBe("ecoles-normales");
  });
});

describe("robots.txt", () => {
  const robots = `
User-agent: *
Disallow: /admin
Disallow: /private/
Allow: /private/public

User-agent: BadBot
Disallow: /
`;
  it("honours rules for all agents", () => {
    expect(isPathAllowed(robots, "/")).toBe(true);
    expect(isPathAllowed(robots, "/admin/login")).toBe(false);
    expect(isPathAllowed(robots, "/private/x")).toBe(false);
    expect(isPathAllowed(robots, "/private/public")).toBe(true);
  });
  it("uses a group that names us specifically", () => {
    expect(isPathAllowed("User-agent: NotifyHubBot\nDisallow: /\n\nUser-agent: *\nDisallow:", "/")).toBe(false);
  });
});

describe("HTML extraction", () => {
  const html = `<!doctype html><html><head>
    <title>Home | Example Institute of Technology | Hyderabad</title>
    <meta name="description" content="An autonomous engineering college.">
    <link rel="icon" href="/favicon.ico">
  </head><body>
    <header><img src="/assets/img/college-logo.png" alt="Example Institute logo"></header>
    <nav>
      <a href="/about-us">About Us</a>
      <a href="/academics/departments">Departments</a>
      <a href="/contact">Contact</a>
      <a href="https://www.facebook.com/examplecollege">Facebook</a>
      <a href="https://other-site.com/about">About partner</a>
    </nav>
    <ul><li>Computer Science and Engineering</li><li>Electronics & Communication Engineering</li><li>Civil Engineering</li><li>MBA</li></ul>
    <footer>
      <address>Plot 12, Example Road, Hyderabad, Telangana 500001</address>
      Email: <a href="mailto:principal@example.ac.in">principal@example.ac.in</a> or info@example.ac.in
      Phone: <a href="tel:+914012345678">040 1234 5678</a> Mobile 9876543210
      <img src="/x@2x.png">
    </footer>
  </body></html>`;

  const info = extractFromHtml(html, "https://www.example.ac.in/");

  it("finds identity details", () => {
    expect(info.name).toBe("Example Institute of Technology");
    expect(info.description).toBe("An autonomous engineering college.");
    expect(info.logo).toBe("https://www.example.ac.in/assets/img/college-logo.png");
    expect(info.address).toContain("Hyderabad");
  });

  it("finds contacts and social links", () => {
    expect(info.emails).toEqual(expect.arrayContaining(["principal@example.ac.in", "info@example.ac.in"]));
    expect(info.emails.some((e) => e.endsWith(".png"))).toBe(false);
    expect(info.phones).toContain("+914012345678");
    expect(info.social.facebook).toBe("https://www.facebook.com/examplecollege");
  });

  it("finds departments listed in tables", () => {
    const i = extractFromHtml(`<body><table><tr><td>CSE</td><td>Computer Science and Engineering</td></tr><tr><td>IT</td><td>Information Technology</td></tr></table></body>`, "https://c.ac.in/");
    expect(i.departments.map((d) => d.code).sort()).toEqual(["CSE", "IT"]);
  });

  it("does not glue text across line breaks", () => {
    const i = extractFromHtml(`<body><p>Email: <a href="#">x@college.ac.in</a><br>Phone: 9876543210</p><p>info@college.ac.in<br>Principal</p></body>`, "https://college.ac.in/");
    expect(i.emails.sort()).toEqual(["info@college.ac.in", "x@college.ac.in"]);
  });

  it("recognises departments", () => {
    expect(info.departments.map((d) => d.code).sort()).toEqual(["CIVIL", "CSE", "ECE", "MBA"]);
  });

  it("follows only same-site pages worth reading", () => {
    const pages = pickFollowUpPages(info.links, "https://www.example.ac.in/");
    expect(pages).toEqual([
      "https://www.example.ac.in/about-us",
      "https://www.example.ac.in/contact",
      "https://www.example.ac.in/academics/departments",
    ]);
  });
});

describe("SSRF protection", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"])(
    "treats %s as private",
    (ip) => expect(isPrivateAddress(ip)).toBe(true),
  );
  it.each(["8.8.8.8", "142.250.72.14", "2606:4700::1111"])("treats %s as public", (ip) => expect(isPrivateAddress(ip)).toBe(false));

  it("refuses to fetch local and metadata addresses", async () => {
    await expect(safeFetch("http://127.0.0.1/")).rejects.toBeInstanceOf(FetchBlockedError);
    await expect(safeFetch("http://169.254.169.254/latest/meta-data/")).rejects.toBeInstanceOf(FetchBlockedError);
    await expect(safeFetch("http://localhost:3000/")).rejects.toBeInstanceOf(FetchBlockedError);
    await expect(safeFetch("https://example.com:8443/")).rejects.toBeInstanceOf(FetchBlockedError);
    await expect(safeFetch("file:///etc/passwd")).rejects.toBeInstanceOf(FetchBlockedError);
  });
});
