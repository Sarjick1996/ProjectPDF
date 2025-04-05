export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/data") {
      const list = await env.bucket1.list({ prefix: "", delimiter: "/" });

      const categories = list.delimitedPrefixes.map(p => p.replace("/", ""));
      const allFiles = [];

      for (const category of categories) {
        const objects = await env.bucket1.list({ prefix: `${category}/` });
        const files = objects.objects.filter(obj => obj.key.endsWith(".pdf"));

        files.forEach(file => {
          const name = file.key.split("/").pop().replace(".pdf", "");
          const imageExtensions = [".jpg", ".jpeg", ".png"];
          const image = imageExtensions
            .map(ext => `${category}/${name}${ext}`)
            .find(imgPath => objects.objects.some(obj => obj.key === imgPath));

          allFiles.push({
            category,
            pdf: file.key,
            image: image || null
          });
        });
      }

      return new Response(
        JSON.stringify({
          baseUrl: `https://${env.CF_PAGES_URL || "testing.sarjickbhaumik123.workers.dev"}/file/`,
          categories,
          files: allFiles
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    // File download endpoint
    if (url.pathname.startsWith("/file/")) {
      const key = decodeURIComponent(url.pathname.replace("/file/", ""));
      const object = await env.bucket1.get(key);
      if (!object) return new Response("Not found", { status: 404 });

      return new Response(object.body, {
        headers: {
          "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    return new Response("📁 Use /api/data or /file/<path>");
  }
};