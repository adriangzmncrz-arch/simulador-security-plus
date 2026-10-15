import { describe, expect, it } from "vitest";
import { esc, rich } from "../../src/ui/rich";

describe("rich", () => {
  it("escapa HTML en texto, código en línea y bloques", () => {
    expect(esc(`<img src=x onerror="a">&'`)).toBe("&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;");
    expect(rich("<b>hola</b>")).toBe("<p>&lt;b&gt;hola&lt;/b&gt;</p>");
    expect(rich("usa `<script>`")).toBe("<p>usa <code>&lt;script&gt;</code></p>");
    expect(rich("log:\n```\n<tag> & ok\n```\nfin")).toBe("<p>log:<br></p><pre><code>&lt;tag&gt; &amp; ok</code></pre><p><br>fin</p>");
  });
  it("párrafos por línea en blanco y <br> por salto simple", () => {
    expect(rich("a\nb\n\nc")).toBe("<p>a<br>b</p><p>c</p>");
  });
  it("quita la etiqueta de lenguaje del bloque", () => {
    expect(rich("```bash\nls -la\n```")).toBe("<pre><code>ls -la</code></pre>");
  });
});
