export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.substring(1);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (!path) {
      // List all files
      const list = await env.bucket1.list();
      const pdfs = list.objects.filter(obj => obj.key.endsWith(".pdf"));
      const images = list.objects.filter(obj =>
        [".jpg", ".jpeg", ".png", ".webp", ".gif"].some(ext => obj.key.endsWith(ext))
      );

      const responseList = pdfs.map(pdf => {
        const baseName = pdf.key.replace(/\.pdf$/i, "");
        const match = images.find(img => img.key.startsWith(baseName));
        return {
          pdf: pdf.key,
          image: match ? match.key : null
        };
      });

      return new Response(JSON.stringify(responseList), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300", // cache for 5 minutes
          ...corsHeaders
        }
      });
    }

    const file = await env.bucket1.get(path);
    if (!file) {
      if (/\.(jpg|jpeg|png|webp|gif)$/i.test(path)) {
        return fetch("https://via.placeholder.com/100");
      }
      return new Response("File not found", { status: 404, headers: corsHeaders });
    }

    let contentType = "application/octet-stream";
    if (path.endsWith(".pdf")) contentType = "application/pdf";
    else if (path.endsWith(".jpg") || path.endsWith(".jpeg")) contentType = "image/jpeg";
    else if (path.endsWith(".png")) contentType = "image/png";
    else if (path.endsWith(".webp")) contentType = "image/webp";
    else if (path.endsWith(".gif")) contentType = "image/gif";

    return new Response(file.body, {
      headers: {
        "Content-Type": contentType,
        ...corsHeaders
      }
    });
  }
};