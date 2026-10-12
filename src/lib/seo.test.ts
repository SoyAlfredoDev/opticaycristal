import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { CONVENIO, convenioFaqs } from "@/lib/convenios";
import { AI_CRAWLERS, llmsText, seoPages } from "@/lib/seo";
import { conveniosJsonLd, siteJsonLd } from "@/lib/structured-data";

describe("seo y respuestas para buscadores", () => {
  it("declara las tres páginas y el 20% del convenio en la compra online", () => {
    expect(seoPages.optica.title).toBe("Vistas de la óptica");
    expect(seoPages.jornadas.title).toBe("Jornadas oftalmológicas");
    expect(seoPages.convenios.title).toBe("Convenio con empresas");
    expect(seoPages.convenios.description).toContain(`${CONVENIO.discountPercent}%`);
    expect(seoPages.convenios.description).toContain("compra online");
    expect(seoPages.optica.description).toContain("compra online");
    expect(seoPages.home.description).toContain("jornadas oftalmológicas");
  });

  it("deja el descuento acotado al convenio en el texto para chats de IA", () => {
    const text = llmsText();
    expect(text).toContain("https://opticaycristal.cl/optica");
    expect(text).toContain("https://opticaycristal.cl/jornadas");
    expect(text).toContain("https://opticaycristal.cl/convenios");
    expect(text).toContain("compra online");
    expect(text).toContain("no es una promoción abierta");
  });

  it("publica sitemap, robots y datos que citan el convenio", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toEqual([
      "https://opticaycristal.cl",
      "https://opticaycristal.cl/optica",
      "https://opticaycristal.cl/jornadas",
      "https://opticaycristal.cl/convenios",
      "https://opticaycristal.cl/privacidad",
    ]);
    expect(sitemap()[0]?.images?.length).toBeGreaterThan(0);

    const rules = robots().rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;
    expect(rule.userAgent).toEqual(expect.arrayContaining(["GPTBot", "Google-Extended", "PerplexityBot", "ClaudeBot"]));
    expect(rule.userAgent).toEqual([...AI_CRAWLERS]);
    expect(robots().sitemap).toBe("https://opticaycristal.cl/sitemap.xml");

    const site = JSON.stringify(siteJsonLd());
    expect(site).toContain("/optica");
    expect(site).toContain("/jornadas");
    expect(site).toContain("/convenios");

    const convenios = JSON.stringify(conveniosJsonLd());
    expect(convenios).toContain(`${CONVENIO.discountPercent}% de descuento en la compra online`);
    expect(convenios).toContain(convenioFaqs[2]?.question);
  });
});
